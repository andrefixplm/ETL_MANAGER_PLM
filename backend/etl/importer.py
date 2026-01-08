import pandas as pd
import json
from pathlib import Path
from typing import Tuple, List, Dict, Any


def detectar_formato(file_path: str) -> str:
    """
    Detecta o formato do arquivo baseado na extensão.

    Returns:
        'csv', 'json', 'md' ou 'unknown'
    """
    path = Path(file_path)
    ext = path.suffix.lower()

    if ext == ".csv":
        return "csv"
    elif ext == ".json":
        return "json"
    elif ext == ".md":
        return "md"
    else:
        return "unknown"


def importar_arquivo(file_path: str) -> Tuple[pd.DataFrame, str]:
    """
    Importa arquivo CSV, JSON ou MD para DataFrame.

    Args:
        file_path: Caminho do arquivo

    Returns:
        Tuple de (DataFrame, tipo_formato)

    Raises:
        ValueError: Se formato não suportado
    """
    formato = detectar_formato(file_path)

    if formato == "csv":
        df = _importar_csv(file_path)
    elif formato == "json":
        df = _importar_json(file_path)
    elif formato == "md":
        df = _importar_markdown(file_path)
    else:
        raise ValueError(f"Formato não suportado: {formato}")

    # Normaliza nomes das colunas
    df.columns = [col.strip().upper() for col in df.columns]

    # Remove duplicatas
    df = df.drop_duplicates()

    return df, formato


def _importar_csv(file_path: str) -> pd.DataFrame:
    """Importa arquivo CSV."""
    # Tenta diferentes encodings comuns
    encodings = ["utf-8", "latin-1", "cp1252"]

    for encoding in encodings:
        try:
            return pd.read_csv(file_path, encoding=encoding)
        except UnicodeDecodeError:
            continue

    raise ValueError(f"Não foi possível ler o arquivo CSV com encodings: {encodings}")


def _importar_json(file_path: str) -> pd.DataFrame:
    """
    Importa arquivo JSON.

    Suporta estruturas:
    - Lista de objetos: [{"campo": "valor"}, ...]
    - Objeto com query como chave (formato Windchill export)
    """
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Se é um dict com uma única chave (query SQL), pega o valor
    if isinstance(data, dict) and len(data) == 1:
        key = list(data.keys())[0]
        data = data[key]

    # Normaliza para lista se necessário
    if isinstance(data, dict):
        data = [data]

    return pd.json_normalize(data)


def _importar_markdown(file_path: str) -> pd.DataFrame:
    """
    Importa tabela Markdown.

    Formato esperado:
    |COLUNA1|COLUNA2|
    |-------|-------|
    |valor1 |valor2 |
    """
    linhas: List[List[str]] = []
    cabecalho: List[str] = []

    with open(file_path, "r", encoding="utf-8") as f:
        for i, linha in enumerate(f):
            linha = linha.strip()

            # Ignora linhas vazias
            if not linha:
                continue

            # Ignora linha separadora (---|---)
            if linha.replace("|", "").replace("-", "").strip() == "":
                continue

            # Processa células
            celulas = [c.strip() for c in linha.split("|")]
            # Remove células vazias das bordas
            celulas = [c for c in celulas if c or celulas.index(c) not in [0, len(celulas)-1]]
            celulas = celulas[1:-1] if linha.startswith("|") and linha.endswith("|") else celulas

            # Reprocessa para garantir
            celulas = [c.strip() for c in linha.strip("|").split("|")]

            if not cabecalho:
                cabecalho = celulas
            else:
                linhas.append(celulas)

    if not cabecalho:
        raise ValueError("Não foi possível encontrar cabeçalho na tabela Markdown")

    return pd.DataFrame(linhas, columns=cabecalho)


def identificar_tipo_dados(df: pd.DataFrame) -> str:
    """
    Identifica se os dados são de Documentos ou Arquivos CAD.

    Returns:
        'documentos' ou 'arquivos'
    """
    colunas = set(df.columns)

    # Colunas típicas de documentos
    colunas_doc = {"NUMERO_DOC", "NOME_DOC", "ESTADO_LIFECYCLE"}

    # Colunas típicas de arquivos CAD
    colunas_cad = {"NOME_ORIGINAL", "SEQ_DECIMAL", "NOME_ARQUIVO_HEX"}

    if colunas_doc & colunas:
        return "documentos"
    elif colunas_cad & colunas:
        return "arquivos"
    else:
        return "desconhecido"
