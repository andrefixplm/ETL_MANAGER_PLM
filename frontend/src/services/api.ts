import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface Documento {
  id: number;
  numero_doc: string;
  nome_doc: string;
  versao: string | null;
  iteracao: number | null;
  estado: string | null;
  criado_por: string | null;
  data_criacao: string | null;
  data_modificacao: string | null;
}

export interface Arquivo {
  id: number;
  documento_id: number | null;
  nome_arquivo: string;
  nome_original: string | null;
  tamanho_mb: number | null;
  tipo_conteudo: string | null;
  tipo_doc: string | null;
  nome_interno_app: string | null;
  seq_decimal: number | null;
  nome_hex: string | null;
  caminho_raiz_vault: string | null;
  caminho_completo_estimado: string | null;
}

export interface ETLLog {
  id: number;
  tipo: string;
  timestamp: string;
  detalhes: string;
  registros_afetados: number | null;
  severity: string;
}

export interface Stats {
  total_documentos: number;
  total_arquivos: number;
  total_operacoes: number;
}

export interface RestoreResponse {
  success: boolean;
  message: string;
  arquivos_copiados: number;
  erros: string[];
}

export interface MissingItem {
  id: number;
  arquivo_id: number;
  caminho_estimado: string;
  nome_hex: string;
  status_resolucao: string;
}

export interface VerifyResponse {
  total_verificados: number;
  total_falhas: number;
  itens_ausentes: MissingItem[];
  message: string;
}

// Paginated Response Types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// API Functions
export const getStats = () => api.get<Stats>('/stats');

export const getDocumentos = (params?: {
  numero_doc?: string;
  nome_doc?: string;
  estado?: string;
  versao?: string;
  criado_por?: string;
  busca?: string;
  order_by?: string;
  order_dir?: 'asc' | 'desc';
  skip?: number;
  limit?: number;
}) => api.get<PaginatedResponse<Documento>>('/documentos', { params });

export const getDocumento = (id: number) => api.get<Documento>(`/documentos/${id}`);

export const getArquivos = (params?: {
  nome?: string;
  nome_original?: string;
  tipo_doc?: string;
  nome_interno?: string;
  nome_hex?: string;
  order_by?: string;
  order_dir?: 'asc' | 'desc';
  skip?: number;
  limit?: number;
}) => api.get<PaginatedResponse<Arquivo>>('/arquivos', { params });

export const getArquivo = (id: number) => api.get<Arquivo>(`/arquivos/${id}`);

export const getLogs = (params?: {
  tipo?: string;
  skip?: number;
  limit?: number;
}) => api.get<ETLLog[]>('/logs', { params });

export const importFile = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const restoreFiles = (arquivoIds: number[], destino: string) =>
  api.post<RestoreResponse>('/restore', {
    arquivo_ids: arquivoIds,
    destino,
  });

export const verifyIntegrity = (arquivoIds: number[]) =>
  api.post<VerifyResponse>('/verify', {
    arquivo_ids: arquivoIds,
  });

export const exportData = (formato: 'csv' | 'json' = 'json') =>
  api.get('/export', { params: { formato } });

// Configurações
export interface Configuracoes {
  vault_raiz: string | null;
  destino_padrao: string | null;
  usar_padding_hex: boolean;
  adicionar_extensao_fv: boolean;
}

export interface ConfiguracaoDetalhe {
  id: number;
  chave: string;
  valor: string;
  descricao: string | null;
  atualizado_em: string;
}

export const getConfiguracoes = () => api.get<Configuracoes>('/configuracoes');

export const getTodasConfiguracoes = () => api.get<ConfiguracaoDetalhe[]>('/configuracoes/todas');

export const atualizarConfiguracao = (chave: string, valor: string) =>
  api.put<ConfiguracaoDetalhe>(`/configuracoes/${chave}`, { valor });
