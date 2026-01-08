from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Documento(Base):
    """Metadados dos documentos do Windchill."""
    __tablename__ = "documentos"

    id = Column(Integer, primary_key=True, index=True)
    numero_doc = Column(String(50), index=True)
    nome_doc = Column(String(255))
    versao = Column(String(10))
    iteracao = Column(Integer)
    estado = Column(String(50))
    criado_por = Column(String(100), nullable=True)
    data_criacao = Column(DateTime, nullable=True)
    data_modificacao = Column(DateTime, nullable=True)

    arquivos = relationship("Arquivo", back_populates="documento")


class Arquivo(Base):
    """Informações dos arquivos físicos no vault."""
    __tablename__ = "arquivos"

    id = Column(Integer, primary_key=True, index=True)
    documento_id = Column(Integer, ForeignKey("documentos.id"), nullable=True)
    nome_arquivo = Column(String(255))
    nome_original = Column(String(255), nullable=True)
    tamanho_mb = Column(Float, nullable=True)
    tipo_conteudo = Column(String(50), nullable=True)
    tipo_doc = Column(String(50), nullable=True)
    nome_interno_app = Column(String(255), nullable=True)
    seq_decimal = Column(Integer, nullable=True)
    nome_hex = Column(String(20), nullable=True)
    caminho_raiz_vault = Column(String(500), nullable=True)
    caminho_completo_estimado = Column(String(500), nullable=True)

    documento = relationship("Documento", back_populates="arquivos")
    metadados = relationship("Metadado", back_populates="arquivo")


class Metadado(Base):
    """Atributos flexíveis chave-valor."""
    __tablename__ = "metadados"

    id = Column(Integer, primary_key=True, index=True)
    arquivo_id = Column(Integer, ForeignKey("arquivos.id"))
    chave = Column(String(100))
    valor = Column(Text)
    origem = Column(String(50))  # Windchill / Teamcenter / Manual

    arquivo = relationship("Arquivo", back_populates="metadados")


class ETLLog(Base):
    """Histórico de operações ETL."""
    __tablename__ = "etl_logs"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String(20))  # import, transform, export, restore, verify
    timestamp = Column(DateTime, default=datetime.utcnow)
    detalhes = Column(Text)
    registros_afetados = Column(Integer, nullable=True)
    severity = Column(String(10), default="INFO")  # INFO, WARN, ERROR


class MissingItem(Base):
    """Registro de itens não encontrados durante verificação."""
    __tablename__ = "missing_items"

    id = Column(Integer, primary_key=True, index=True)
    arquivo_id = Column(Integer, ForeignKey("arquivos.id"))
    caminho_estimado = Column(String(500))
    nome_hex = Column(String(50))
    data_verificacao = Column(DateTime, default=datetime.utcnow)
    status_resolucao = Column(String(20), default="PENDING")  # PENDING, RESOLVED, IGNORED

    arquivo = relationship("Arquivo")


class Configuracao(Base):
    """Configurações da aplicação."""
    __tablename__ = "configuracoes"

    id = Column(Integer, primary_key=True, index=True)
    chave = Column(String(100), unique=True, index=True)
    valor = Column(Text)
    descricao = Column(String(255), nullable=True)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
