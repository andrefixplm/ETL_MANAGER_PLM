from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import os
import tempfile
import uuid
from datetime import datetime
from database import get_db, SessionLocal
from models import Documento, Arquivo, ETLLog
from schemas import (
    ImportResponse,
    RestoreRequest,
    RestoreResponse,
    RestoreResponse,
    ETLLog as ETLLogSchema,
    VerifyRequest,
    VerifyResponse,
)
from models import Documento, Arquivo, ETLLog, MissingItem
from etl.importer import importar_arquivo, identificar_tipo_dados
from etl.transformer import (
    transformar_dados,
    preparar_para_insercao_documentos,
    preparar_para_insercao_arquivos,
)
from etl.exporter import restaurar_arquivos, construir_caminho_real_vault
from core.config_manager import obter_valor_configuracao

# Armazenamento em memória do progresso das importações
import_jobs: Dict[str, Dict[str, Any]] = {}

# Constante para tamanho do lote
BATCH_SIZE = 500

router = APIRouter(
    tags=["etl"]
)

# === FUNÇÕES AUXILIARES DE PROCESSAMENTO EM LOTES ===

def processar_lote_documentos(dados_lote: List[Dict], db: Session) -> int:
    """Processa um lote de documentos e retorna quantidade inserida."""
    inseridos = 0
    for item in dados_lote:
        doc_existente = db.query(Documento).filter(
            Documento.numero_doc == item["documento"]["numero_doc"],
            Documento.versao == item["documento"]["versao"],
            Documento.iteracao == item["documento"]["iteracao"],
        ).first()

        if not doc_existente:
            doc = Documento(**item["documento"])
            db.add(doc)
            db.flush()

            if item["arquivo"]["nome_arquivo"]:
                arq = Arquivo(documento_id=doc.id, **item["arquivo"])
                db.add(arq)

            inseridos += 1
    return inseridos


def processar_lote_arquivos(dados_lote: List[Dict], db: Session) -> int:
    """Processa um lote de arquivos e retorna quantidade inserida."""
    inseridos = 0
    for item in dados_lote:
        arq_existente = db.query(Arquivo).filter(
            Arquivo.nome_hex == item.get("nome_hex"),
            Arquivo.nome_original == item.get("nome_original"),
        ).first()

        if not arq_existente:
            arq = Arquivo(**item)
            db.add(arq)
            inseridos += 1
    return inseridos


def executar_importacao_background(job_id: str, tmp_path: str, filename: str):
    """Executa a importação em background com processamento em lotes."""
    db = SessionLocal()

    try:
        import_jobs[job_id]["status"] = "processing"
        import_jobs[job_id]["started_at"] = datetime.now().isoformat()

        # Importa e transforma
        df, formato = importar_arquivo(tmp_path)
        tipo = identificar_tipo_dados(df)
        df_transformado = transformar_dados(df, tipo)

        import_jobs[job_id]["tipo"] = tipo
        import_jobs[job_id]["formato"] = formato

        registros_inseridos = 0

        if tipo == "documentos":
            dados = preparar_para_insercao_documentos(df_transformado)
        elif tipo == "arquivos":
            dados = preparar_para_insercao_arquivos(df_transformado)
        else:
            dados = []

        total_registros = len(dados)
        import_jobs[job_id]["total"] = total_registros

        # Processa em lotes
        for i in range(0, total_registros, BATCH_SIZE):
            lote = dados[i:i + BATCH_SIZE]

            if tipo == "documentos":
                inseridos = processar_lote_documentos(lote, db)
            else:
                inseridos = processar_lote_arquivos(lote, db)

            registros_inseridos += inseridos

            # Commit do lote
            db.commit()

            # Atualiza progresso
            import_jobs[job_id]["processed"] = min(i + BATCH_SIZE, total_registros)
            import_jobs[job_id]["inserted"] = registros_inseridos
            import_jobs[job_id]["progress"] = round((i + BATCH_SIZE) / total_registros * 100, 1)

        # Log da operação
        log = ETLLog(
            tipo="import",
            detalhes=f"Arquivo: {filename}, Formato: {formato}, Tipo: {tipo}",
            registros_afetados=registros_inseridos,
        )
        db.add(log)
        db.commit()

        import_jobs[job_id]["status"] = "completed"
        import_jobs[job_id]["inserted"] = registros_inseridos
        import_jobs[job_id]["progress"] = 100
        import_jobs[job_id]["log_id"] = log.id
        import_jobs[job_id]["completed_at"] = datetime.now().isoformat()

    except Exception as e:
        db.rollback()
        import_jobs[job_id]["status"] = "error"
        import_jobs[job_id]["error"] = str(e)

    finally:
        db.close()
        # Remove arquivo temporário
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


# === ENDPOINTS DE IMPORTAÇÃO ===

@router.post("/import", response_model=ImportResponse)
async def importar_dados(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    async_mode: bool = Query(False, description="Executar em background para arquivos grandes"),
    db: Session = Depends(get_db)
):
    """
    Importa arquivo CSV, JSON ou MD para o banco de dados.

    O sistema detecta automaticamente se são dados de documentos ou arquivos CAD.

    Parâmetros:
    - async_mode: Se True, executa em background e retorna job_id para consulta de progresso
    """
    # Salva arquivo temporário
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    # Modo assíncrono para arquivos grandes
    if async_mode and background_tasks:
        job_id = str(uuid.uuid4())
        import_jobs[job_id] = {
            "status": "queued",
            "filename": file.filename,
            "progress": 0,
            "total": 0,
            "processed": 0,
            "inserted": 0,
            "created_at": datetime.now().isoformat(),
        }

        background_tasks.add_task(
            executar_importacao_background,
            job_id,
            tmp_path,
            file.filename
        )

        return ImportResponse(
            success=True,
            message=f"Importação iniciada em background. Use GET /import/status/{job_id} para acompanhar.",
            registros_importados=0,
            log_id=None,
            job_id=job_id,
        )

    # Modo síncrono com processamento em lotes
    try:
        df, formato = importar_arquivo(tmp_path)
        tipo = identificar_tipo_dados(df)
        df_transformado = transformar_dados(df, tipo)

        registros_inseridos = 0

        if tipo == "documentos":
            dados = preparar_para_insercao_documentos(df_transformado)
            total = len(dados)

            for i in range(0, total, BATCH_SIZE):
                lote = dados[i:i + BATCH_SIZE]
                inseridos = processar_lote_documentos(lote, db)
                registros_inseridos += inseridos
                db.commit()

        elif tipo == "arquivos":
            dados = preparar_para_insercao_arquivos(df_transformado)
            total = len(dados)

            for i in range(0, total, BATCH_SIZE):
                lote = dados[i:i + BATCH_SIZE]
                inseridos = processar_lote_arquivos(lote, db)
                registros_inseridos += inseridos
                db.commit()

        # Log da operação
        log = ETLLog(
            tipo="import",
            detalhes=f"Arquivo: {file.filename}, Formato: {formato}, Tipo: {tipo}",
            registros_afetados=registros_inseridos,
        )
        db.add(log)
        db.commit()

        return ImportResponse(
            success=True,
            message=f"Importação concluída. Tipo detectado: {tipo}",
            registros_importados=registros_inseridos,
            log_id=log.id,
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

    finally:
        os.unlink(tmp_path)


@router.get("/import/status/{job_id}")
def status_importacao(job_id: str):
    """
    Retorna o status de uma importação em background.
    """
    if job_id not in import_jobs:
        raise HTTPException(status_code=404, detail="Job não encontrado")

    return import_jobs[job_id]


@router.get("/import/jobs")
def listar_jobs():
    """
    Lista todos os jobs de importação recentes.
    """
    return {
        "jobs": [
            {"job_id": k, **v}
            for k, v in import_jobs.items()
        ]
    }


# === ENDPOINTS DE RESTAURAÇÃO ===

@router.post("/restore", response_model=RestoreResponse)
def restaurar(
    request: RestoreRequest,
    db: Session = Depends(get_db),
):
    """
    Copia arquivos do vault Windchill para pasta destino com nomes originais.
    """
    # Obtém configurações
    vault_raiz_config = obter_valor_configuracao(db, "vault_raiz")
    usar_padding = obter_valor_configuracao(db, "usar_padding_hex") == "true"
    adicionar_fv = obter_valor_configuracao(db, "adicionar_extensao_fv") == "true"

    # Busca arquivos selecionados
    arquivos = db.query(Arquivo).filter(Arquivo.id.in_(request.arquivo_ids)).all()

    if not arquivos:
        raise HTTPException(status_code=404, detail="Nenhum arquivo encontrado")

    # Prepara dados para restauração, aplicando configuração de vault_raiz
    dados_arquivos = []
    for arq in arquivos:
        # PRIORIDADE: Usa configuração global se existir, senão usa do arquivo
        caminho_raiz = vault_raiz_config if vault_raiz_config else arq.caminho_raiz_vault

        dados_arquivos.append({
            "id": arq.id,
            "nome_arquivo": arq.nome_arquivo,
            "nome_original": arq.nome_original,
            "nome_hex": arq.nome_hex,
            "nome_interno_app": arq.nome_interno_app,
            "caminho_raiz_vault": caminho_raiz,
            "caminho_completo_estimado": arq.caminho_completo_estimado,
        })

    # Executa restauração com configurações
    copiados, erros = restaurar_arquivos(
        dados_arquivos,
        request.destino,
        usar_padding=usar_padding
    )

    # Log da operação
    log = ETLLog(
        tipo="restore",
        detalhes=f"Destino: {request.destino}, Solicitados: {len(request.arquivo_ids)}",
        registros_afetados=copiados,
    )
    db.add(log)
    db.commit()

    return RestoreResponse(
        success=len(erros) == 0,
        message=f"Restauração concluída: {copiados} arquivos copiados",
        arquivos_copiados=copiados,
        erros=erros,
    )



# === ENDPOINTS DE VERIFICAÇÃO ===

@router.post("/verify", response_model=VerifyResponse)
def verificar_integridade(
    request: VerifyRequest,
    db: Session = Depends(get_db),
):
    """
    Verifica se os arquivos físicos existem no vault.
    """
    vault_raiz_config = obter_valor_configuracao(db, "vault_raiz")
    
    arquivos = db.query(Arquivo).filter(Arquivo.id.in_(request.arquivo_ids)).all()
    
    if not arquivos:
        raise HTTPException(status_code=404, detail="Nenhum arquivo encontrado para verificação")

    verificados = 0
    falhas = 0
    itens_ausentes_response = []

    for arq in arquivos:
        # Pega caminho raiz correto
        caminho_raiz = vault_raiz_config if vault_raiz_config else arq.caminho_raiz_vault
        
        # Constrói caminho real esperado
        caminho_real = construir_caminho_real_vault(caminho_raiz, arq.nome_hex)
        
        verificados += 1
        
        if not caminho_real or not os.path.exists(caminho_real):
            falhas += 1
            
            # Registra item ausente no banco
            missing = MissingItem(
                arquivo_id=arq.id,
                caminho_estimado=caminho_real,
                nome_hex=arq.nome_hex,
                status_resolucao="PENDING"
            )
            db.add(missing)
            db.flush() # Para atualizar o ID se necessário (embora usemos o obj no response)
            
            # Adiciona ao response
            itens_ausentes_response.append(missing)

    # Log da operação
    severity = "ERROR" if falhas > 0 else "INFO"
    log = ETLLog(
        tipo="verify",
        detalhes=f"Verificados: {verificados}, Falhas: {falhas}",
        registros_afetados=falhas,
        severity=severity
    )
    db.add(log)
    db.commit()

    return VerifyResponse(
        total_verificados=verificados,
        total_falhas=falhas,
        itens_ausentes=itens_ausentes_response,
        message=f"Verificação concluída. {falhas} arquivos ausentes."
    )


# === ENDPOINTS DE EXPORTAÇÃO ===

@router.get("/export")
def exportar(
    formato: str = Query("csv", regex="^(csv|json)$"),
    db: Session = Depends(get_db),
):
    """
    Exporta todos os arquivos para CSV ou JSON.
    """
    arquivos = db.query(Arquivo).all()

    dados = [
        {
            "nome_original": arq.nome_original or arq.nome_arquivo,
            "tipo_doc": arq.tipo_doc,
            "nome_hex": arq.nome_hex,
            "caminho_vault": arq.caminho_completo_estimado,
            "versao": None,  # Adicionar se disponível via documento
        }
        for arq in arquivos
    ]

    # Log da operação
    log = ETLLog(
        tipo="export",
        detalhes=f"Formato: {formato}",
        registros_afetados=len(dados),
    )
    db.add(log)
    db.commit()

    return {
        "formato": formato,
        "total_registros": len(dados),
        "dados": dados,
    }


# === ENDPOINTS DE LOGS ===

@router.get("/logs", response_model=List[ETLLogSchema])
def listar_logs(
    tipo: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Lista logs de operações ETL."""
    query = db.query(ETLLog).order_by(ETLLog.timestamp.desc())

    if tipo:
        query = query.filter(ETLLog.tipo == tipo)

    return query.offset(skip).limit(limit).all()


# === ENDPOINTS UTILITÁRIOS ===

@router.get("/stats")
def estatisticas(db: Session = Depends(get_db)):
    """Retorna estatísticas gerais do sistema."""
    return {
        "total_documentos": db.query(Documento).count(),
        "total_arquivos": db.query(Arquivo).count(),
        "total_operacoes": db.query(ETLLog).count(),
    }
