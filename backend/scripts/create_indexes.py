import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Carrega variáveis de ambiente
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

POSTGRES_URL = os.getenv("DATABASE_URL")

def create_indexes():
    print("Iniciando criação de índices otimizados no PostgreSQL...")

    if not POSTGRES_URL or "sqlite" in POSTGRES_URL:
        print("Erro: DATABASE_URL não configurada para PostgreSQL.")
        return

    engine = create_engine(POSTGRES_URL)

    indices_sql = [
        # Ativa extensão pg_trgm para índices de similaridade de texto
        "CREATE EXTENSION IF NOT EXISTS pg_trgm;",
        
        # Índice para busca em Documento.numero_doc
        """
        CREATE INDEX IF NOT EXISTS idx_documentos_numero_doc_trgm 
        ON documentos 
        USING GIN (numero_doc gin_trgm_ops);
        """,
        
        # Índice para busca em Documento.nome_doc
        """
        CREATE INDEX IF NOT EXISTS idx_documentos_nome_doc_trgm 
        ON documentos 
        USING GIN (nome_doc gin_trgm_ops);
        """,
        
        # Índice para busca em Arquivo.nome_arquivo
        """
        CREATE INDEX IF NOT EXISTS idx_arquivos_nome_arquivo_trgm 
        ON arquivos 
        USING GIN (nome_arquivo gin_trgm_ops);
        """,
        
        # Índice para busca em Arquivo.nome_original
        """
        CREATE INDEX IF NOT EXISTS idx_arquivos_nome_original_trgm 
        ON arquivos 
        USING GIN (nome_original gin_trgm_ops);
        """
    ]

    try:
        with engine.connect() as conn:
            for sql in indices_sql:
                print(f"Executando: {sql.strip().splitlines()[0]}...")
                conn.execute(text(sql))
                conn.commit()
            
        print("Índices criados com sucesso!")

    except Exception as e:
        print(f"Erro ao criar índices: {str(e)}")

if __name__ == "__main__":
    create_indexes()
