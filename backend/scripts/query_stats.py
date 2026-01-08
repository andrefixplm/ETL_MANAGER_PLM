import sys
import os
from sqlalchemy import create_engine, text

# Adiciona o diretório pai ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, SessionLocal
from models import Documento, Arquivo

def query_stats():
    db = SessionLocal()
    try:
        doc_count = db.query(Documento).count()
        file_count = db.query(Arquivo).count()
        print(f"--- STATUS DO BANCO DE DADOS ---")
        print(f"Documentos: {doc_count}")
        print(f"Arquivos:   {file_count}")
        print(f"--------------------------------")
    finally:
        db.close()

if __name__ == "__main__":
    query_stats()
