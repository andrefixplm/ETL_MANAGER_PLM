from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import documentos, arquivos, etl, config

# Cria as tabelas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ETL Manager PLM",
    description="API para migração de dados Windchill → Teamcenter",
    version="1.0.0",
)

# CORS para frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclui routers
app.include_router(documentos.router)
app.include_router(arquivos.router)
app.include_router(etl.router)
app.include_router(config.router)

@app.get("/")
def root():
    """Health check e informações da API."""
    return {
        "app": "ETL Manager PLM",
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
