import pandas as pd
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from .utils import (
    hex_to_padded,
    parse_data_windchill,
    construir_caminho_vault,
    extrair_nome_hex_de_caminho,
    limpar_string
)


def transformar_dados(df: pd.DataFrame, tipo: str) -> pd.DataFrame:
    """
    Aplica transformações nos dados conforme o tipo.

    Args:
        df: DataFrame com dados brutos
        tipo: 'documentos' ou 'arquivos'

    Returns:
        DataFrame transformado
    """
    df = df.copy()

    if tipo == "documentos":
        df = _transformar_documentos(df)
    elif tipo == "arquivos":
        df = _transformar_arquivos(df)

    return df


def _transformar_documentos(df: pd.DataFrame) -> pd.DataFrame:
    """Transforma dados de documentos."""

    # Mapeamento de colunas
    mapeamento = {
        "NUMERO_DOC": "numero_doc",
        "NOME_DOC": "nome_doc",
        "VERSAO": "versao",
        "ITERACAO": "iteracao",
        "ESTADO_LIFECYCLE": "estado",
        "CRIADO_POR": "criado_por",
        "DATA_CRIACAO": "data_criacao",
        "DATA_MODIFICACAO": "data_modificacao",
        "NOME_ARQUIVO": "nome_arquivo",
        "TAMANHO_MB": "tamanho_mb",
        "TIPO_CONTEUDO": "tipo_conteudo",
        "CAMINHO_COMPLETO_ESTIMADO": "caminho_completo_estimado",
    }

    # Renomeia colunas existentes
    colunas_para_renomear = {k: v for k, v in mapeamento.items() if k in df.columns}
    df = df.rename(columns=colunas_para_renomear)

    # Converte datas
    for col in ["data_criacao", "data_modificacao"]:
        if col in df.columns:
            df[col] = df[col].apply(lambda x: parse_data_windchill(str(x)) if pd.notna(x) else None)

    # Extrai nome_hex do caminho se disponível
    if "caminho_completo_estimado" in df.columns:
        df["nome_hex"] = df["caminho_completo_estimado"].apply(extrair_nome_hex_de_caminho)

    # Converte iteracao para int
    if "iteracao" in df.columns:
        df["iteracao"] = pd.to_numeric(df["iteracao"], errors="coerce").fillna(0).astype(int)

    # Converte tamanho para float
    if "tamanho_mb" in df.columns:
        df["tamanho_mb"] = pd.to_numeric(df["tamanho_mb"], errors="coerce")

    return df


def _transformar_arquivos(df: pd.DataFrame) -> pd.DataFrame:
    """Transforma dados de arquivos CAD."""

    # Mapeamento de colunas
    mapeamento = {
        "NOME_ORIGINAL": "nome_original",
        "TIPO_DOC": "tipo_doc",
        "VERSAO": "versao",
        "ITERACAO": "iteracao",
        "NOME_INTERNO_APP": "nome_interno_app",
        "SEQ_DECIMAL": "seq_decimal",
        "NOME_ARQUIVO_HEX": "nome_hex",
        "CAMINHO_RAIZ_VAULT": "caminho_raiz_vault",
        "CAMINHO_COMPLETO_ESTIMADO": "caminho_completo_estimado",
    }

    # Renomeia colunas existentes
    colunas_para_renomear = {k: v for k, v in mapeamento.items() if k in df.columns}
    df = df.rename(columns=colunas_para_renomear)

    # nome_arquivo = nome_original se não existir
    if "nome_arquivo" not in df.columns and "nome_original" in df.columns:
        df["nome_arquivo"] = df["nome_original"]

    # Converte iteracao para int
    if "iteracao" in df.columns:
        df["iteracao"] = pd.to_numeric(df["iteracao"], errors="coerce").fillna(0).astype(int)

    # Converte seq_decimal para int
    if "seq_decimal" in df.columns:
        df["seq_decimal"] = pd.to_numeric(df["seq_decimal"], errors="coerce").fillna(0).astype(int)

    # Limpa nome_hex
    if "nome_hex" in df.columns:
        df["nome_hex"] = df["nome_hex"].apply(lambda x: limpar_string(str(x)).upper() if pd.notna(x) else None)

    # Reconstrói caminho se necessário
    if "caminho_completo_estimado" not in df.columns or df["caminho_completo_estimado"].isna().all():
        if "caminho_raiz_vault" in df.columns and "nome_hex" in df.columns:
            df["caminho_completo_estimado"] = df.apply(
                lambda row: reconstruir_caminho_vault(
                    row.get("caminho_raiz_vault", ""),
                    row.get("nome_hex", "")
                ) if pd.notna(row.get("nome_hex")) else None,
                axis=1
            )

    return df


def reconstruir_caminho_vault(
    caminho_raiz: str,
    nome_hex: str,
    usar_padding: bool = True,
    adicionar_extensao: bool = False
) -> Optional[str]:
    """
    Reconstrói o caminho completo do arquivo no vault Windchill.

    Args:
        caminho_raiz: Diretório base do vault
        nome_hex: Código hexadecimal do arquivo
        usar_padding: Se True, aplica zero-padding de 14 dígitos
        adicionar_extensao: Se True, adiciona .fv ao final

    Returns:
        Caminho completo ou None se dados inválidos
    """
    if not caminho_raiz or not nome_hex:
        return None

    extensao = ".fv" if adicionar_extensao else ""
    padding = 14 if usar_padding else len(nome_hex)

    return construir_caminho_vault(caminho_raiz, nome_hex, extensao, padding)


def preparar_para_insercao_documentos(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Prepara dados de documentos para inserção no banco."""
    registros = []

    for _, row in df.iterrows():
        doc = {
            "numero_doc": row.get("numero_doc"),
            "nome_doc": row.get("nome_doc"),
            "versao": row.get("versao"),
            "iteracao": row.get("iteracao"),
            "estado": row.get("estado"),
            "criado_por": row.get("criado_por"),
            "data_criacao": row.get("data_criacao"),
            "data_modificacao": row.get("data_modificacao"),
        }

        arquivo = {
            "nome_arquivo": row.get("nome_arquivo"),
            "tamanho_mb": row.get("tamanho_mb"),
            "tipo_conteudo": row.get("tipo_conteudo"),
            "nome_hex": row.get("nome_hex"),
            "caminho_completo_estimado": row.get("caminho_completo_estimado"),
        }

        registros.append({"documento": doc, "arquivo": arquivo})

    return registros


def preparar_para_insercao_arquivos(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Prepara dados de arquivos para inserção no banco."""
    registros = []

    for _, row in df.iterrows():
        arquivo = {
            "nome_arquivo": row.get("nome_arquivo", row.get("nome_original")),
            "nome_original": row.get("nome_original"),
            "tipo_doc": row.get("tipo_doc"),
            "nome_interno_app": row.get("nome_interno_app"),
            "seq_decimal": row.get("seq_decimal"),
            "nome_hex": row.get("nome_hex"),
            "caminho_raiz_vault": row.get("caminho_raiz_vault"),
            "caminho_completo_estimado": row.get("caminho_completo_estimado"),
        }

        registros.append(arquivo)

    return registros
