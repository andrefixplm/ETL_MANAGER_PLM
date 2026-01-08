import sqlite3
import psycopg2
import os
from dotenv import load_dotenv
import pandas as pd
from sqlalchemy import create_engine

# Carrega variáveis de ambiente
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SQLITE_DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db.sqlite3')
POSTGRES_URL = os.getenv("DATABASE_URL")

def migrate():
    print("Iniciando migração de SQLite para PostgreSQL...")
    
    if not os.path.exists(SQLITE_DB_PATH):
        print(f"Erro: Banco SQLite não encontrado em {SQLITE_DB_PATH}")
        return

    if not POSTGRES_URL:
        print("Erro: DATABASE_URL não definida no .env")
        return

    # Conexão SQLite
    sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
    
    # Engine Postgres (SQLAlchemy)
    pg_engine = create_engine(POSTGRES_URL)

    tabelas = ["documentos", "arquivos", "metadados", "etl_logs", "configuracoes"]

    try:
        for tabela in tabelas:
            print(f"Lendo tabela '{tabela}' do SQLite...")
            try:
                df = pd.read_sql_query(f"SELECT * FROM {tabela}", sqlite_conn)
                
                if df.empty:
                    print(f"Tabela '{tabela}' vazia. Pulando.")
                    continue

                print(f"Migrando {len(df)} registros para PostgreSQL...")
                
                # if_exists='append' assume que as tabelas já foram criadas pelo app (init_db)
                # chunksize ajuda a não estourar memória
                df.to_sql(tabela, pg_engine, if_exists='append', index=False, chunksize=1000)
                
                print(f"Tabela '{tabela}' migrada com sucesso!")
                
            except Exception as e:
                print(f"Erro ao migrar tabela '{tabela}': {str(e)}")

    except Exception as e:
        print(f"Erro geral na migração: {str(e)}")
    
    finally:
        sqlite_conn.close()
        print("Migração finalizada.")

if __name__ == "__main__":
    migrate()
