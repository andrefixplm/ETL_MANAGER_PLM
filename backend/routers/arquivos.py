from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, asc, desc
from typing import List, Optional, Literal
import math
from database import get_db
from models import Arquivo
from schemas import Arquivo as ArquivoSchema, ArquivosPaginados

router = APIRouter(
    prefix="/arquivos",
    tags=["arquivos"]
)

# Colunas válidas para ordenação
SORTABLE_COLUMNS = {
    'id': Arquivo.id,
    'nome_arquivo': Arquivo.nome_arquivo,
    'nome_original': Arquivo.nome_original,
    'tipo_doc': Arquivo.tipo_doc,
    'nome_interno_app': Arquivo.nome_interno_app,
    'nome_hex': Arquivo.nome_hex,
    'tamanho_mb': Arquivo.tamanho_mb,
}

@router.get("", response_model=ArquivosPaginados)
def listar_arquivos(
    nome: Optional[str] = None,
    nome_original: Optional[str] = None,
    tipo_doc: Optional[str] = None,
    nome_interno: Optional[str] = None,
    nome_hex: Optional[str] = None,
    order_by: Optional[str] = Query(None, description="Coluna para ordenação"),
    order_dir: Optional[str] = Query("asc", description="Direção: asc ou desc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """Lista arquivos com filtros, ordenação e paginação."""
    query = db.query(Arquivo)

    # Filtros individuais
    if nome:
        query = query.filter(
            or_(
                Arquivo.nome_arquivo.ilike(f"%{nome}%"),
                Arquivo.nome_original.ilike(f"%{nome}%")
            )
        )
    if nome_original:
        query = query.filter(Arquivo.nome_original.ilike(f"%{nome_original}%"))
    if tipo_doc:
        query = query.filter(Arquivo.tipo_doc.ilike(f"%{tipo_doc}%"))
    if nome_interno:
        query = query.filter(Arquivo.nome_interno_app.ilike(f"%{nome_interno}%"))
    if nome_hex:
        query = query.filter(Arquivo.nome_hex.ilike(f"%{nome_hex}%"))

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
        query = query.order_by(Arquivo.id)

    # Aplicar paginação
    items = query.offset(skip).limit(limit).all()

    # Calcular página atual e total de páginas
    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = math.ceil(total / limit) if limit > 0 else 1

    return ArquivosPaginados(
        items=items,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages
    )


@router.get("/{arq_id}", response_model=ArquivoSchema)
def obter_arquivo(arq_id: int, db: Session = Depends(get_db)):
    """Obtém um arquivo específico pelo ID."""
    arq = db.query(Arquivo).filter(Arquivo.id == arq_id).first()
    if not arq:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    return arq
