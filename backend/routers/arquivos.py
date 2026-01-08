from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Arquivo
from schemas import Arquivo as ArquivoSchema

router = APIRouter(
    prefix="/arquivos",
    tags=["arquivos"]
)

@router.get("", response_model=List[ArquivoSchema])
def listar_arquivos(
    nome: Optional[str] = None,
    tipo_doc: Optional[str] = None,
    nome_interno: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """Lista arquivos com filtros opcionais."""
    query = db.query(Arquivo)

    if nome:
        query = query.filter(
            (Arquivo.nome_arquivo.contains(nome)) |
            (Arquivo.nome_original.contains(nome))
        )
    if tipo_doc:
        query = query.filter(Arquivo.tipo_doc == tipo_doc)
    if nome_interno:
        query = query.filter(Arquivo.nome_interno_app.contains(nome_interno))

    return query.offset(skip).limit(limit).all()


@router.get("/{arq_id}", response_model=ArquivoSchema)
def obter_arquivo(arq_id: int, db: Session = Depends(get_db)):
    """Obtém um arquivo específico pelo ID."""
    arq = db.query(Arquivo).filter(Arquivo.id == arq_id).first()
    if not arq:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    return arq
