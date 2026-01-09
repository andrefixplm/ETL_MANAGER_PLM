from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, asc, desc
from typing import List, Optional
import math
from database import get_db
from models import Documento
from schemas import Documento as DocumentoSchema, DocumentosPaginados

router = APIRouter(
    prefix="/documentos",
    tags=["documentos"]
)

# Colunas válidas para ordenação
SORTABLE_COLUMNS = {
    'id': Documento.id,
    'numero_doc': Documento.numero_doc,
    'nome_doc': Documento.nome_doc,
    'versao': Documento.versao,
    'estado': Documento.estado,
    'criado_por': Documento.criado_por,
    'data_criacao': Documento.data_criacao,
    'data_modificacao': Documento.data_modificacao,
}

@router.get("", response_model=DocumentosPaginados)
def listar_documentos(
    numero_doc: Optional[str] = None,
    nome_doc: Optional[str] = None,
    estado: Optional[str] = None,
    versao: Optional[str] = None,
    criado_por: Optional[str] = None,
    busca: Optional[str] = None,
    order_by: Optional[str] = Query(None, description="Coluna para ordenação"),
    order_dir: Optional[str] = Query("asc", description="Direção: asc ou desc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """Lista documentos com filtros, ordenação e paginação."""
    query = db.query(Documento)

    # Busca geral (pesquisa em múltiplos campos)
    if busca:
        query = query.filter(
            or_(
                Documento.numero_doc.ilike(f"%{busca}%"),
                Documento.nome_doc.ilike(f"%{busca}%")
            )
        )

    # Filtros específicos
    if numero_doc:
        query = query.filter(Documento.numero_doc.ilike(f"%{numero_doc}%"))
    if nome_doc:
        query = query.filter(Documento.nome_doc.ilike(f"%{nome_doc}%"))
    if estado:
        query = query.filter(Documento.estado == estado)
    if versao:
        query = query.filter(Documento.versao == versao)
    if criado_por:
        query = query.filter(Documento.criado_por.ilike(f"%{criado_por}%"))

    # Contagem total (antes de aplicar ordenação e paginação)
    total = query.count()

    # Aplicar ordenação
    if order_by and order_by in SORTABLE_COLUMNS:
        column = SORTABLE_COLUMNS[order_by]
        if order_dir == "desc":
            query = query.order_by(desc(column))
        else:
            query = query.order_by(asc(column))
    else:
        # Ordenação padrão por ID
        query = query.order_by(Documento.id)

    # Aplicar paginação
    items = query.offset(skip).limit(limit).all()

    # Calcular página atual e total de páginas
    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = math.ceil(total / limit) if limit > 0 else 1

    return DocumentosPaginados(
        items=items,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages
    )


@router.get("/{doc_id}", response_model=DocumentoSchema)
def obter_documento(doc_id: int, db: Session = Depends(get_db)):
    """Obtém um documento específico pelo ID."""
    doc = db.query(Documento).filter(Documento.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    return doc
