# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ETL Manager for migrating PLM data from Windchill to Teamcenter. The application handles document metadata extraction, file path reconstruction from Windchill vault format, and export preparation for Teamcenter import.

## Architecture

Four-layer architecture:

1. **Frontend** (React/Tailwind) - Optional visualization panel with filters
2. **API** (FastAPI) - Upload, query, transformation, and export endpoints
3. **ETL Engine** (Python/Pandas) - CSV/JSON/MD import, data transformation, field mapping
4. **Database** (SQLite, Postgres optional) - Stores documents, files, and metadata

## Project Structure

```
ETL_MANAGER_PLM/
├── backend/
│   ├── main.py           # FastAPI server + endpoints
│   ├── models.py         # SQLAlchemy ORM (4 tabelas)
│   ├── database.py       # Conexão SQLite
│   ├── schemas.py        # Pydantic models
│   ├── requirements.txt  # Dependências Python
│   └── etl/
│       ├── __init__.py
│       ├── importer.py   # Leitura CSV/JSON/MD
│       ├── transformer.py # Mapeamento e transformação
│       ├── exporter.py   # Exportação + restauração de arquivos
│       └── utils.py      # Funções auxiliares (hex, datas, paths)
├── Exemplos/             # Arquivos de exemplo do Windchill
└── frontend/             # (Futuro) React app
```

## Database Schema

Four main tables:
- `documentos` - Document metadata (numero_doc, nome_doc, versao, estado, etc.)
- `arquivos` - File information with vault path reconstruction fields
- `metadados` - Key-value metadata with origin tracking (Windchill/Teamcenter/Manual)
- `etl_logs` - Operation logs (import/transform/export)

## Key Business Logic

### Windchill Vault Path Reconstruction

Windchill stores files with hex-encoded names in vaults. The transformation:
- Internal name: `005-21-0005-1-1.prt` → Hex: `B0BB4C`
- Vault path format: 14 digits zero-padded, no extension
- Example: `E:\PTC\Windchill\vaults\defaultcachevault\00000000B0BB4C`
- Output: Copy to destination with original filename

### API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| POST | /import | Upload CSV/JSON/MD files |
| GET | /documentos | List/filter documents |
| GET | /documentos/{id} | Document details |
| GET | /arquivos | List/filter files |
| GET | /arquivos/{id} | File details |
| POST | /restore | Copy vault files to destination with original names |
| GET | /export | Generate Teamcenter-ready CSV/JSON |
| GET | /logs | View ETL operation history |
| GET | /stats | System statistics |

## Build Commands

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend (if implemented)
```bash
cd frontend
npm install
npm run dev
```

## Development Notes

- File imports support CSV, JSON, and Markdown table formats
- The `SEQ_DECIMAL` and `NOME_ARQUIVO_HEX` fields are used for vault path joining
- Vault root paths are configurable per environment
