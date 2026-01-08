from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Documento
from schemas import Documento as DocumentoSchema

router = APIRouter(
    prefix="/documentos",
    tags=["documentos"]
)

@router.get("", response_model=List[DocumentoSchema])
def listar_documentos(
    numero_doc: Optional[str] = None,
    nome_doc: Optional[str] = None,
    estado: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """Lista documentos com filtros opcionais."""
    query = db.query(Documento)

    if numero_doc:
        query = query.filter(Documento.numero_doc.contains(numero_doc))
    if nome_doc:
        query = query.filter(Documento.nome_doc.contains(nome_doc))
    if estado:
        query = query.filter(Documento.estado == estado)

    return query.offset(skip).limit(limit).all()


@router.get("/{doc_id}", response_model=DocumentoSchema)
def obter_documento(doc_id: int, db: Session = Depends(get_db)):
    """Obtém um documento específico pelo ID."""
    doc = db.query(Documento).filter(Documento.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    return doc
