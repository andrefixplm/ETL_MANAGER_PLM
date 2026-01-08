import sys
import os
import logging

# Adiciona o diretório pai ao path para importar modulos do backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, Base, SessionLocal
from models import Documento, Arquivo, ETLLog
from etl.importer import importar_arquivo, identificar_tipo_dados
from etl.transformer import (
    transformar_dados,
    preparar_para_insercao_documentos,
    preparar_para_insercao_arquivos,
)

# Configuração de Log
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def reset_database():
    logger.info("Reseting database...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    logger.info("Database reset successfully.")

def process_import(file_path: str, db):
    logger.info(f"Processing file: {file_path}")
    
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return

    try:
        # Import and Detect
        df, formato = importar_arquivo(file_path)
        tipo = identificar_tipo_dados(df)
        logger.info(f"Detected format: {formato}, Type: {tipo}")

        # Transform
        df_transformado = transformar_dados(df, tipo)
        
        registros_inseridos = 0

        if tipo == "documentos":
            dados = preparar_para_insercao_documentos(df_transformado)
            for item in dados:
                doc = Documento(**item["documento"])
                db.add(doc)
                db.flush() # Para pegar o ID

                if item["arquivo"]["nome_arquivo"]:
                    arq = Arquivo(documento_id=doc.id, **item["arquivo"])
                    db.add(arq)
                
                registros_inseridos += 1
                
        elif tipo == "arquivos":
            dados = preparar_para_insercao_arquivos(df_transformado)
            for item in dados:
                arq = Arquivo(**item)
                db.add(arq)
                registros_inseridos += 1

        db.commit()
        logger.info(f"Successfully inserted {registros_inseridos} records from {os.path.basename(file_path)}")

    except Exception as e:
        logger.error(f"Error processing {file_path}: {e}")
        db.rollback()

def main():
    reset_database()
    
    db = SessionLocal()
    
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    exemplos_dir = os.path.join(base_dir, "Exemplos")
    
    files_to_import = [
        os.path.join(exemplos_dir, "_SELECT_master_CADNAME_AS_NOME_ORIGINAL_master_DOCTYPE_AS_TIPO_D_exemplo3.json"),
        os.path.join(exemplos_dir, "_SELECT_master_WTDOCUMENTNUMBER_AS_NUMERO_DOC_master_NAME_AS_NOM_202601071100.csv")
    ]

    for file_path in files_to_import:
        process_import(file_path, db)

    db.close()
    logger.info("Verification process finished.")

if __name__ == "__main__":
    main()
