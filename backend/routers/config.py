from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Configuracao
from schemas import (
    Configuracao as ConfiguracaoSchema,
    ConfiguracaoCreate,
    ConfiguracaoUpdate,
    ConfiguracoesResponse
)
from core.config_manager import (
    inicializar_configuracoes,
    obter_valor_configuracao,
    CONFIGURACOES_PADRAO
)

router = APIRouter(
    prefix="/configuracoes",
    tags=["configuracoes"]
)

@router.get("", response_model=ConfiguracoesResponse)
def obter_configuracoes(db: Session = Depends(get_db)):
    """Obtém todas as configurações da aplicação."""
    inicializar_configuracoes(db)

    return ConfiguracoesResponse(
        vault_raiz=obter_valor_configuracao(db, "vault_raiz"),
        destino_padrao=obter_valor_configuracao(db, "destino_padrao"),
        usar_padding_hex=obter_valor_configuracao(db, "usar_padding_hex") == "true",
        adicionar_extensao_fv=obter_valor_configuracao(db, "adicionar_extensao_fv") == "true",
    )


@router.get("/todas", response_model=List[ConfiguracaoSchema])
def listar_todas_configuracoes(db: Session = Depends(get_db)):
    """Lista todas as configurações detalhadas."""
    inicializar_configuracoes(db)
    return db.query(Configuracao).all()


@router.put("/{chave}", response_model=ConfiguracaoSchema)
def atualizar_configuracao(
    chave: str,
    update: ConfiguracaoUpdate,
    db: Session = Depends(get_db),
):
    """Atualiza o valor de uma configuração."""
    config = db.query(Configuracao).filter(Configuracao.chave == chave).first()

    if not config:
        # Cria se não existir
        descricao = CONFIGURACOES_PADRAO.get(chave, {}).get("descricao", "")
        config = Configuracao(chave=chave, valor=update.valor, descricao=descricao)
        db.add(config)
    else:
        config.valor = update.valor

    db.commit()
    db.refresh(config)
    return config


@router.post("", response_model=ConfiguracaoSchema)
def criar_configuracao(
    config: ConfiguracaoCreate,
    db: Session = Depends(get_db),
):
    """Cria uma nova configuração."""
    existente = db.query(Configuracao).filter(Configuracao.chave == config.chave).first()
    if existente:
        raise HTTPException(status_code=400, detail="Configuração já existe")

    nova = Configuracao(**config.model_dump())
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return nova
