from datetime import datetime
from typing import Optional
import re


def hex_to_padded(hex_value: str, total_digits: int = 14) -> str:
    """
    Converte valor hex para formato do vault com zero-padding.

    Exemplo: 'B0BB4C' -> '00000000B0BB4C'
    """
    if not hex_value:
        return ""

    # Remove espaços e converte para uppercase
    hex_clean = hex_value.strip().upper()

    # Padding com zeros à esquerda
    return hex_clean.zfill(total_digits)


def parse_data_windchill(data_str: str) -> Optional[datetime]:
    """
    Parseia datas no formato Windchill.

    Formatos suportados:
    - '20/12/2021 00:00:00'
    - '2021-12-20T00:00:00'
    - '2021-12-20'
    """
    if not data_str or data_str.strip() == "":
        return None

    formatos = [
        "%d/%m/%Y %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d",
        "%d/%m/%Y",
    ]

    for fmt in formatos:
        try:
            return datetime.strptime(data_str.strip(), fmt)
        except ValueError:
            continue

    return None


def construir_caminho_vault(
    caminho_raiz: str,
    nome_hex: str,
    extensao: str = "",
    padding: int = 14
) -> str:
    """
    Constrói o caminho completo do arquivo no vault.

    Args:
        caminho_raiz: Diretório base do vault (ex: E:\\PTC\\Windchill\\vaults\\defaultcachevault)
        nome_hex: Código hexadecimal do arquivo (ex: B0BB4C)
        extensao: Extensão opcional (ex: .fv)
        padding: Quantidade de dígitos para zero-padding (default: 14)

    Returns:
        Caminho completo (ex: E:\\PTC\\Windchill\\vaults\\defaultcachevault\\00000000B0BB4C)
    """
    nome_padded = hex_to_padded(nome_hex, padding)

    # Normaliza separadores de caminho
    caminho_raiz = caminho_raiz.rstrip("\\").rstrip("/")

    caminho = f"{caminho_raiz}\\{nome_padded}"

    if extensao:
        if not extensao.startswith("."):
            extensao = f".{extensao}"
        caminho += extensao

    return caminho


def extrair_nome_hex_de_caminho(caminho: str) -> Optional[str]:
    """
    Extrai o nome hex de um caminho completo do vault.

    Remove a extensão .fv e zeros à esquerda para obter o hex puro.

    Exemplos:
        'E:\\...\\E45838.fv' -> 'E45838'
        'E:\\...\\00000000C97E80' -> 'C97E80'
        'C97E80.fv' -> 'C97E80'
    """
    if not caminho:
        return None

    # Pega o nome do arquivo
    import os
    nome = os.path.basename(caminho)

    # Remove extensão .fv se existir
    if nome.lower().endswith('.fv'):
        nome = nome[:-3]

    # Remove zeros à esquerda para obter o hex puro
    nome = nome.lstrip('0') or '0'

    # Valida se é hexadecimal
    if re.match(r'^[A-Fa-f0-9]+$', nome):
        return nome.upper()

    return None


def construir_caminho_real_vault(caminho_raiz: str, nome_hex: str) -> str:
    """
    Constrói o caminho REAL do arquivo no vault do Windchill.

    O arquivo real no sistema operacional:
    - Tem 14 caracteres (zero-padding à esquerda)
    - NÃO tem extensão (nem .fv nem nenhuma outra)

    Exemplo:
        caminho_raiz: 'E:\\PTC\\Windchill\\vaults\\defaultcachevault'
        nome_hex: 'C97E80' ou 'C97E80.fv' ou '00000000C97E80'
        resultado: 'E:\\PTC\\Windchill\\vaults\\defaultcachevault\\00000000C97E80'
    """
    if not caminho_raiz or not nome_hex:
        return ""

    # Extrai o hex puro (sem extensão, sem zeros à esquerda)
    hex_puro = extrair_nome_hex_de_caminho(nome_hex) or nome_hex.strip().upper()

    # Remove extensão .fv se existir
    if hex_puro.lower().endswith('.fv'):
        hex_puro = hex_puro[:-3]

    # Remove zeros à esquerda
    hex_puro = hex_puro.lstrip('0') or '0'

    # Aplica zero-padding para 14 caracteres
    hex_padded = hex_puro.upper().zfill(14)

    # Monta o caminho (SEM extensão)
    caminho_raiz = caminho_raiz.rstrip('\\').rstrip('/')
    return f"{caminho_raiz}\\{hex_padded}"


def limpar_string(valor: str) -> str:
    """Remove espaços extras e caracteres de controle."""
    if not valor:
        return ""
    return " ".join(valor.split()).strip()
