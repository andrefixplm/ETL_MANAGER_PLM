from sqlalchemy.orm import Session
from typing import Optional
from models import Configuracao

CONFIGURACOES_PADRAO = {
    "vault_raiz": {
        "valor": "E:\\PTC\\Windchill\\vaults\\defaultcachevault",
        "descricao": "Caminho raiz da pasta de vaults do Windchill"
    },
    "destino_padrao": {
        "valor": "C:\\Export\\SmartPLM\\Restored",
        "descricao": "Pasta de destino padrão para restauração de arquivos"
    },
    "usar_padding_hex": {
        "valor": "true",
        "descricao": "Usar zero-padding de 14 dígitos no nome hex"
    },
    "adicionar_extensao_fv": {
        "valor": "false",
        "descricao": "Adicionar extensão .fv ao buscar arquivos no vault"
    },
}


def inicializar_configuracoes(db: Session):
    """Inicializa configurações padrão se não existirem."""
    for chave, config in CONFIGURACOES_PADRAO.items():
        existente = db.query(Configuracao).filter(Configuracao.chave == chave).first()
        if not existente:
            nova = Configuracao(
                chave=chave,
                valor=config["valor"],
                descricao=config["descricao"]
            )
            db.add(nova)
    db.commit()


def obter_valor_configuracao(db: Session, chave: str) -> Optional[str]:
    """Obtém o valor de uma configuração."""
    config = db.query(Configuracao).filter(Configuracao.chave == chave).first()
    if config:
        return config.valor
    return CONFIGURACOES_PADRAO.get(chave, {}).get("valor")
