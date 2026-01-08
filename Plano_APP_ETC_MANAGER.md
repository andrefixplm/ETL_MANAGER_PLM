
seguiremos com a stack **Python + FastAPI + SQLite**, a melhor para o teu fluxo de ETL Windchill → Teamcenter.
A seguir, o **plano completo e detalhado da arquitetura**, o **modelo relacional do banco**, e o **pipeline ETL** passo a passo.

---

## ⚙️ Visão Geral da Solução

Uma aplicação modular dividida em **quatro camadas**:

```
+----------------------------------------+
| FRONTEND (React/Tailwind - opcional)   |
| Painel de visualização e filtros       |
+----------------------------------------+
| API (FastAPI)                          |
| Upload, consulta, transformação, export|
+----------------------------------------+
| ETL ENGINE (Python/Pandas)             |
| Importa CSV/JSON, trata e mapeia dados |
+----------------------------------------+
| DATABASE (SQLite/Postgres opcional)    |
| Armazena documentos, arquivos e meta   |
+----------------------------------------+
```

---

## 🧱 1️⃣ Estrutura de Diretórios

```
etl_app/
├── backend/
│   ├── main.py                # Servidor FastAPI
│   ├── models.py              # ORM (SQLAlchemy)
│   ├── database.py            # Conexão e criação do BD
│   ├── schemas.py             # Pydantic Models
│   ├── etl/
│   │   ├── importer.py        # Leitura CSV/JSON/MD
│   │   ├── transformer.py     # Regras de tradução e mapeamento
│   │   ├── exporter.py        # Exportação para Teamcenter
│   │   └── utils.py           # Funções auxiliares
│   └── db.sqlite3             # Banco local
└── frontend/                  # (Opcional para visualização)
    ├── src/
    └── package.json
```

---

## 🗃️ 2️⃣ Modelo de Banco de Dados (SQLAlchemy ORM)

### 🔸 Tabela `documentos`

| Campo            | Tipo     | Descrição                          |
| ---------------- | -------- | ---------------------------------- |
| id               | INT (PK) | ID interno                         |
| numero_doc       | TEXT     | Código do documento (`0000004499`) |
| nome_doc         | TEXT     | Nome (`A0-588-99-13-0002-0-0 R2`)  |
| versao           | TEXT     | Ex: “A”                            |
| iteracao         | INT      | Ex: “1”                            |
| estado           | TEXT     | Ex: “INWORK”                       |
| criado_por       | TEXT     | Autor (pode vir vazio)             |
| data_criacao     | DATETIME | Data Windchill                     |
| data_modificacao | DATETIME | Data última versão                 |

### 🔸 Tabela `arquivos`

| Campo                     | Tipo                     | Descrição                                      |
| ------------------------- | ------------------------ | ---------------------------------------------- |
| id                        | INT (PK)                 | ID                                             |
| documento_id              | INT (FK → documentos.id) | Relaciona ao documento                         |
| nome_arquivo              | TEXT                     | Nome original (`A0-588-99-13-0002-0-0 R2.pdf`) |
| tamanho_mb                | FLOAT                    | Tamanho físico                                 |
| tipo_conteudo             | TEXT                     | Ex: PRIMARY                                    |
| caminho_completo_estimado | TEXT                     | Caminho físico Windchill                       |
| nome_interno_app          | TEXT                     | Nome interno (`005-21-0005-1-1.pvt`)           |
| nome_hex                  | TEXT                     | Nome interno convertido (`B0BB4C`)             |
| caminho_raiz_vault        | TEXT                     | Diretório base Windchill                       |

### 🔸 Tabela `metadados`

| Campo      | Tipo                   | Descrição                                               |
| ---------- | ---------------------- | ------------------------------------------------------- |
| id         | INT (PK)               |                                                         |
| arquivo_id | INT (FK → arquivos.id) |                                                         |
| chave      | TEXT                   | Nome do metadado                                        |
| valor      | TEXT                   | Valor correspondente                                    |
| origem     | TEXT                   | Indica origem do dado (Windchill / Teamcenter / Manual) |

### 🔸 Tabela `etl_logs`

| Campo     | Tipo     | Descrição                       |
| --------- | -------- | ------------------------------- |
| id        | INT (PK) |                                 |
| tipo      | TEXT     | “import”, “transform”, “export” |
| timestamp | DATETIME |                                 |
| detalhes  | TEXT     | Log da operação                 |

---

## 🔄 3️⃣ Pipeline ETL — Fluxo Completo

### **Extract**

1. Usuário faz upload de `.csv`, `.md` ou `.json`.
2. `importer.py` identifica o formato:

   ```python
   import pandas as pd, json

   def importar_arquivo(file_path: str):
       if file_path.endswith(".csv"):
           df = pd.read_csv(file_path)
       elif file_path.endswith(".md"):
           df = pd.read_table(file_path, sep="|", engine="python")
       elif file_path.endswith(".json"):
           with open(file_path) as f:
               df = pd.json_normalize(json.load(f))
       return df
   ```

### **Transform**

3. `transformer.py` normaliza os campos (remove duplicados, formata datas).
4. Enriquecimento dos caminhos físicos → junção por `SEQ_DECIMAL` e `NOME_ARQUIVO_HEX`.
5. Inserção no banco:

   ```python
   from models import Documento, Arquivo
   from database import SessionLocal

   def carregar_dataframe(df):
       db = SessionLocal()
       for _, row in df.iterrows():
           doc = Documento(numero_doc=row['NUMERO_DOC'], nome_doc=row['NOME_DOC'], versao=row['VERSAO'])
           db.add(doc)
           db.commit()
   ```

### **Load**

6. Dados são salvos no SQLite.
7. API `/documentos` → consulta e filtro.
8. `/export` → gera CSV ou JSON final para importação no Teamcenter.

---

## 🌐 4️⃣ API FastAPI — Endpoints Base

| Método               | Rota                         | Descrição               |
| -------------------- | ---------------------------- | ----------------------- |
| `POST /import`       | Envia arquivo CSV/JSON       | Importa dados para o BD |
| `GET /documentos`    | Lista documentos             | Suporte a filtros       |
| `GET /arquivos/{id}` | Detalhes do arquivo          | Inclui metadados        |
| `POST /transform`    | Aplica regras de tradução    | Atualiza dados          |
| `GET /export`        | Exporta dataset transformado | CSV/JSON final          |
| `GET /logs`          | Lista logs ETL               | Visualiza histórico     |

---

## 🧠 5️⃣ Exemplo de Transformação Real

Com base no JSON anexado:

| NOME_ORIGINAL       | NOME_ARQUIVO_HEX | CAMINHO_RAIZ_VAULT                        |
| ------------------- | ---------------- | ----------------------------------------- |
| 005-21-0005-1-1.prt | B0BB4C           | E:\PTC\Windchill\vaults\defaultcachevault |

É convertido para:

```
E:\PTC\Windchill\vaults\defaultcachevault\B0BB4C.fv
→ 005-21-0005-1-1.prt
```

Sendo que o caminho raiz do volume pode ser alterado de acordo com o mapeamento/pasta diferente. 
Todos os dados no volume possuem 14 digitos sendo complementados com zeros a esquerda ex: B0BB4C ficaria como 00000000B0BB4C e sem extensao (sem o .fv)
Gostaria de um funcionalidade que eu pudesse selecionar/escolher os dados a serem restaurados e a aplicacao geraria a copia para uma pasta com os nomes originais 
EX: 
E:\PTC\Windchill\vaults\defaultcachevault\00000000B0BB4C → C:\SAIDA\005-21-0005-1-1.prt

A aplicação usará esta tradução para reconstruir o nome real do arquivo e gerar uma lista limpa e verificável para Teamcenter.

---

## 🔒 6️⃣ Segurança e Integridade

* Verificação de hashes de arquivo (MD5/SHA1) opcional.
* Log automático de importações.
* Backup automático em JSON do banco local.
* Controle de usuário (opcional com autenticação FastAPI JWT).

---

