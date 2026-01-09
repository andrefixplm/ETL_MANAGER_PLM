from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


# === Documento ===
class DocumentoBase(BaseModel):
    numero_doc: str
    nome_doc: str
    versao: Optional[str] = None
    iteracao: Optional[int] = None
    estado: Optional[str] = None
    criado_por: Optional[str] = None
    data_criacao: Optional[datetime] = None
    data_modificacao: Optional[datetime] = None


class DocumentoCreate(DocumentoBase):
    pass


class Documento(DocumentoBase):
    id: int

    class Config:
        from_attributes = True


# === Arquivo ===
class ArquivoBase(BaseModel):
    nome_arquivo: str
    nome_original: Optional[str] = None
    tamanho_mb: Optional[float] = None
    tipo_conteudo: Optional[str] = None
    tipo_doc: Optional[str] = None
    nome_interno_app: Optional[str] = None
    seq_decimal: Optional[int] = None
    nome_hex: Optional[str] = None
    caminho_raiz_vault: Optional[str] = None
    caminho_completo_estimado: Optional[str] = None


class ArquivoCreate(ArquivoBase):
    documento_id: Optional[int] = None


class Arquivo(ArquivoBase):
    id: int
    documento_id: Optional[int] = None

    class Config:
        from_attributes = True


# === ETL Log ===
class ETLLogBase(BaseModel):
    tipo: str
    detalhes: str
    registros_afetados: Optional[int] = None
    severity: str = "INFO"


class ETLLog(ETLLogBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True


# === Missing Item ===
class MissingItemBase(BaseModel):
    arquivo_id: int
    caminho_estimado: Optional[str] = None
    nome_hex: Optional[str] = None
    status_resolucao: str = "PENDING"


class MissingItem(MissingItemBase):
    id: int
    data_verificacao: datetime

    class Config:
        from_attributes = True


# === Requests/Responses ===
class ImportResponse(BaseModel):
    success: bool
    message: str
    registros_importados: int
    log_id: Optional[int] = None
    job_id: Optional[str] = None  # Para importações em background


class RestoreRequest(BaseModel):
    arquivo_ids: List[int]
    destino: str


class RestoreResponse(BaseModel):
    success: bool
    message: str
    arquivos_copiados: int
    arquivos_copiados: int
    erros: List[str]


class VerifyRequest(BaseModel):
    arquivo_ids: List[int]


class VerifyResponse(BaseModel):
    total_verificados: int
    total_falhas: int
    itens_ausentes: List[MissingItem]
    message: str


# === Configuração ===
class ConfiguracaoBase(BaseModel):
    chave: str
    valor: str
    descricao: Optional[str] = None


class ConfiguracaoCreate(ConfiguracaoBase):
    pass


class ConfiguracaoUpdate(BaseModel):
    valor: str


class Configuracao(ConfiguracaoBase):
    id: int
    atualizado_em: datetime

    class Config:
        from_attributes = True


class ConfiguracoesResponse(BaseModel):
    vault_raiz: Optional[str] = None
    destino_padrao: Optional[str] = None
    usar_padding_hex: bool = True
    adicionar_extensao_fv: bool = False


# === Paginated Responses ===
from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar('T')


class PaginatedResponse(BaseModel):
    """Resposta paginada genérica."""
    items: List
    total: int
    page: int
    page_size: int
    total_pages: int


class DocumentosPaginados(BaseModel):
    items: List[Documento]
    total: int
    page: int
    page_size: int
    total_pages: int


class ArquivosPaginados(BaseModel):
    items: List[Arquivo]
    total: int
    page: int
    page_size: int
    total_pages: int


class LogsPaginados(BaseModel):
    items: List[ETLLog]
    total: int
    page: int
    page_size: int
    total_pages: int
