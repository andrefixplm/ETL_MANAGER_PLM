from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import tempfile
from database import get_db
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

router = APIRouter(
    tags=["etl"]
)

# === ENDPOINTS DE IMPORTAÇÃO ===

@router.post("/import", response_model=ImportResponse)
async def importar_dados(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Importa arquivo CSV, JSON ou MD para o banco de dados.

    O sistema detecta automaticamente se são dados de documentos ou arquivos CAD.
    """
    # Salva arquivo temporário
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Importa e transforma
        df, formato = importar_arquivo(tmp_path)
        tipo = identificar_tipo_dados(df)
        df_transformado = transformar_dados(df, tipo)

        registros_inseridos = 0

        if tipo == "documentos":
            dados = preparar_para_insercao_documentos(df_transformado)
            for item in dados:
                # Verifica se documento já existe
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

                    registros_inseridos += 1

        elif tipo == "arquivos":
            dados = preparar_para_insercao_arquivos(df_transformado)
            for item in dados:
                # Verifica duplicata
                arq_existente = db.query(Arquivo).filter(
                    Arquivo.nome_hex == item.get("nome_hex"),
                    Arquivo.nome_original == item.get("nome_original"),
                ).first()

                if not arq_existente:
                    arq = Arquivo(**item)
                    db.add(arq)
                    registros_inseridos += 1

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
