import pandas as pd
import shutil
from pathlib import Path
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
import os


def exportar_para_csv(dados: List[Dict[str, Any]], caminho_saida: str) -> str:
    """
    Exporta dados para arquivo CSV.

    Args:
        dados: Lista de dicionários com os dados
        caminho_saida: Caminho do arquivo de saída

    Returns:
        Caminho do arquivo criado
    """
    df = pd.DataFrame(dados)
    df.to_csv(caminho_saida, index=False, encoding="utf-8-sig")
    return caminho_saida


def exportar_para_json(dados: List[Dict[str, Any]], caminho_saida: str) -> str:
    """
    Exporta dados para arquivo JSON.

    Args:
        dados: Lista de dicionários com os dados
        caminho_saida: Caminho do arquivo de saída

    Returns:
        Caminho do arquivo criado
    """
    df = pd.DataFrame(dados)
    df.to_json(caminho_saida, orient="records", indent=2, force_ascii=False)
    return caminho_saida


def extrair_nome_hex(caminho_ou_hex: str) -> str:
    """
    Extrai o nome hex de um caminho ou valor hex.

    Remove extensão .fv e extrai apenas o código hexadecimal.

    Exemplos:
        'E:\\...\\C97E80.fv' -> 'C97E80'
        'C97E80.fv' -> 'C97E80'
        'C97E80' -> 'C97E80'
        '00000000C97E80' -> 'C97E80'
    """
    if not caminho_ou_hex:
        return ""

    # Pega apenas o nome do arquivo se for um caminho
    nome = os.path.basename(caminho_ou_hex)

    # Remove extensão .fv se existir
    if nome.lower().endswith('.fv'):
        nome = nome[:-3]

    # Remove zeros à esquerda para obter o hex puro
    nome = nome.lstrip('0') or '0'

    return nome.upper()


def construir_caminho_real_vault(caminho_raiz: str, nome_hex: str) -> str:
    """
    Constrói o caminho REAL do arquivo no vault do Windchill.

    O arquivo real no sistema operacional:
    - Tem 14 caracteres (zero-padding à esquerda)
    - NÃO tem extensão (nem .fv nem nenhuma outra)

    Exemplo:
        caminho_raiz: 'E:\\PTC\\Windchill\\vaults\\defaultcachevault'
        nome_hex: 'C97E80'
        resultado: 'E:\\PTC\\Windchill\\vaults\\defaultcachevault\\00000000C97E80'
    """
    if not caminho_raiz or not nome_hex:
        return ""

    # Extrai o hex puro (sem extensão, sem zeros à esquerda)
    hex_puro = extrair_nome_hex(nome_hex)

    # Aplica zero-padding para 14 caracteres
    hex_padded = hex_puro.upper().zfill(14)

    # Monta o caminho (SEM extensão)
    caminho_raiz = caminho_raiz.rstrip('\\').rstrip('/')
    return os.path.join(caminho_raiz, hex_padded)


def restaurar_arquivos(
    arquivos: List[Dict[str, Any]],
    destino: str,
    usar_padding: bool = True
) -> Tuple[int, List[str]]:
    """
    Copia arquivos do vault Windchill para pasta destino com nomes originais.

    O arquivo no vault Windchill:
    - Tem nome com 14 caracteres hexadecimais (zero-padding à esquerda)
    - NÃO tem extensão

    Exemplo:
        Origem: E:\\PTC\\Windchill\\vaults\\defaultcachevault\\00000000C97E80
        Destino: C:\\Export\\005-21-0005-1-1.prt

    Args:
        arquivos: Lista de dicts com campos:
            - nome_hex: código hexadecimal do arquivo
            - caminho_raiz_vault: pasta raiz do vault
            - nome_arquivo ou nome_original: nome de destino
        destino: Pasta de destino
        usar_padding: Se True, aplica zero-padding de 14 dígitos (padrão: True)

    Returns:
        Tuple de (quantidade_copiados, lista_erros)
    """
    destino_path = Path(destino)
    destino_path.mkdir(parents=True, exist_ok=True)

    copiados = 0
    erros: List[str] = []

    for arq in arquivos:
        try:
            # Obtém dados do arquivo
            nome_hex = arq.get("nome_hex", "")
            caminho_raiz = arq.get("caminho_raiz_vault", "")
            caminho_estimado = arq.get("caminho_completo_estimado", "")

            # Se não tem nome_hex mas tem caminho_estimado, extrai o hex do caminho
            if not nome_hex and caminho_estimado:
                nome_hex = extrair_nome_hex(caminho_estimado)

            # Se não tem caminho_raiz mas tem caminho_estimado, extrai a raiz
            if not caminho_raiz and caminho_estimado:
                caminho_raiz = os.path.dirname(caminho_estimado)

            # Valida dados necessários
            if not nome_hex:
                erros.append(f"Nome hex não definido para arquivo ID {arq.get('id', '?')}")
                continue

            if not caminho_raiz:
                erros.append(f"Caminho raiz do vault não definido para arquivo ID {arq.get('id', '?')}")
                continue

            # Constrói o caminho REAL do arquivo no vault (14 chars, sem extensão)
            caminho_origem = construir_caminho_real_vault(caminho_raiz, nome_hex)

            # Determina nome de destino
            # Lógica: Se nome_interno_app existe e é diferente de {$CAD_NAME}, usa ele.
            # Caso contrário, usa nome_original.
            nome_interno = arq.get("nome_interno_app")
            nome_original = arq.get("nome_original") or arq.get("nome_arquivo")

            if nome_interno and nome_interno != "{$CAD_NAME}":
                nome_destino = nome_interno
            else:
                nome_destino = nome_original

            if not nome_destino:
                erros.append(f"Nome de destino não definido para {caminho_origem}")
                continue

            # Caminho completo de destino
            caminho_destino = destino_path / nome_destino

            # Verifica se origem existe
            origem_path = Path(caminho_origem)

            if not origem_path.exists():
                erros.append(
                    f"Arquivo não encontrado no vault: {caminho_origem} "
                    f"(hex original: {nome_hex})"
                )
                continue

            # Copia o arquivo
            shutil.copy2(str(origem_path), str(caminho_destino))
            copiados += 1

        except Exception as e:
            erros.append(f"Erro ao copiar {arq.get('nome_arquivo', '?')}: {str(e)}")

    return copiados, erros


def gerar_relatorio_restauracao(
    copiados: int,
    erros: List[str],
    destino: str
) -> Dict[str, Any]:
    """Gera relatório da operação de restauração."""
    return {
        "destino": destino,
        "arquivos_copiados": copiados,
        "erros_encontrados": len(erros),
        "erros": erros,
        "sucesso": len(erros) == 0,
    }
