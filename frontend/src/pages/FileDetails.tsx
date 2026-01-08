import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getArquivo, restoreFiles, getConfiguracoes, type Arquivo } from '../services/api';

export function FileDetails() {
  const { id } = useParams<{ id: string }>();
  const [arquivo, setArquivo] = useState<Arquivo | null>(null);
  const [loading, setLoading] = useState(true);
  const [destino, setDestino] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        // Busca arquivo e configurações em paralelo
        const [arquivoRes, configRes] = await Promise.all([
          getArquivo(parseInt(id)),
          getConfiguracoes(),
        ]);
        setArquivo(arquivoRes.data);
        // Usa destino padrão das configurações
        if (configRes.data.destino_padrao) {
          setDestino(configRes.data.destino_padrao);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleRestore = async () => {
    if (!arquivo || !destino) return;

    setRestoring(true);
    setResult(null);

    try {
      const response = await restoreFiles([arquivo.id], destino);
      setResult({
        success: response.data.success,
        message: response.data.success
          ? `Arquivo restaurado com sucesso! ${response.data.arquivos_copiados} arquivo(s) copiado(s).`
          : `Erros encontrados: ${response.data.erros.join(', ')}`,
      });
    } catch (error: any) {
      setResult({
        success: false,
        message: error.response?.data?.detail || 'Erro ao restaurar arquivo',
      });
    } finally {
      setRestoring(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="material-icons-outlined animate-spin text-4xl text-primary">refresh</span>
      </div>
    );
  }

  if (!arquivo) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <span className="material-icons-outlined text-6xl text-gray-300 mb-4">error_outline</span>
          <h2 className="text-xl font-bold text-text-light dark:text-white mb-2">Arquivo não encontrado</h2>
          <Link to="/" className="text-primary hover:underline">Voltar ao painel</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      {/* Breadcrumbs */}
      <nav className="flex flex-wrap gap-2 mb-6 items-center">
        <Link to="/" className="text-text-muted-light dark:text-text-muted-dark text-sm font-medium hover:text-primary transition-colors">
          Início
        </Link>
        <span className="material-icons-outlined text-text-muted-light dark:text-text-muted-dark text-base">
          chevron_right
        </span>
        <span className="text-text-light dark:text-white text-sm font-medium">Detalhes do Arquivo</span>
      </nav>

      {/* Page Heading */}
      <div className="flex flex-wrap justify-between gap-3 mb-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-text-light dark:text-white">Detalhes do Arquivo</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500 ring-1 ring-inset ring-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Disponível
            </span>
          </div>
          <p className="text-text-muted-light dark:text-text-muted-dark text-sm max-w-2xl">
            Visualize metadados técnicos extraídos do Windchill e execute a restauração manual de arquivos para o sistema de arquivos local.
          </p>
        </div>
      </div>

      {/* File Details Card */}
      <div className="overflow-hidden rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark shadow-sm mb-8">
        <div className="border-b border-border-light dark:border-border-dark px-6 py-4">
          <h3 className="text-base font-semibold text-text-light dark:text-white">Metadados do Arquivo</h3>
          <p className="mt-1 text-sm text-text-muted-light dark:text-text-muted-dark">
            Informações técnicas do objeto no vault.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="flex flex-col gap-1 border-b border-border-light dark:border-border-dark py-4 px-6 md:border-r">
            <dt className="text-text-muted-light dark:text-text-muted-dark text-sm font-medium flex items-center gap-2">
              <span className="material-icons-outlined text-lg">description</span> Nome Original
            </dt>
            <dd className="text-text-light dark:text-white text-sm font-medium mt-1 break-all">
              {arquivo.nome_original || arquivo.nome_arquivo}
            </dd>
          </div>
          <div className="flex flex-col gap-1 border-b border-border-light dark:border-border-dark py-4 px-6">
            <dt className="text-text-muted-light dark:text-text-muted-dark text-sm font-medium flex items-center gap-2">
              <span className="material-icons-outlined text-lg">fingerprint</span> Nome Hex (Vault)
            </dt>
            <dd className="text-text-light dark:text-white text-sm font-mono mt-1 break-all">
              {arquivo.nome_hex || '-'}
            </dd>
          </div>
          <div className="flex flex-col gap-1 border-b border-border-light dark:border-border-dark py-4 px-6 md:border-r">
            <dt className="text-text-muted-light dark:text-text-muted-dark text-sm font-medium flex items-center gap-2">
              <span className="material-icons-outlined text-lg">folder_open</span> Caminho Estimado
            </dt>
            <dd className="text-text-light dark:text-white text-sm font-mono mt-1 break-all">
              {arquivo.caminho_completo_estimado || '-'}
            </dd>
          </div>
          <div className="flex flex-col gap-1 border-b border-border-light dark:border-border-dark py-4 px-6">
            <dt className="text-text-muted-light dark:text-text-muted-dark text-sm font-medium flex items-center gap-2">
              <span className="material-icons-outlined text-lg">data_usage</span> Tamanho do Arquivo
            </dt>
            <dd className="text-text-light dark:text-white text-sm font-medium mt-1">
              {arquivo.tamanho_mb ? `${arquivo.tamanho_mb} MB` : '-'}
            </dd>
          </div>
          <div className="flex flex-col gap-1 py-4 px-6 md:col-span-2">
            <dt className="text-text-muted-light dark:text-text-muted-dark text-sm font-medium flex items-center gap-2">
              <span className="material-icons-outlined text-lg">category</span> Tipo de Conteúdo
            </dt>
            <dd className="text-text-light dark:text-white text-sm font-medium mt-1">
              {arquivo.tipo_conteudo || arquivo.tipo_doc || '-'}
            </dd>
          </div>
        </div>
      </div>

      {/* Restoration Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-text-light dark:text-white pb-4 border-b border-border-light dark:border-border-dark mb-6">
          Restauração de Arquivo
        </h2>
      </div>

      <div className="p-6 rounded-xl bg-background-light dark:bg-surface-dark border border-border-light dark:border-border-dark flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-text-light dark:text-white mb-2">
            Caminho de Destino para Restauração
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="material-icons-outlined text-gray-400 text-xl">folder</span>
            </div>
            <input
              type="text"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              placeholder="C:\Export\SmartPLM\Restored\"
              className="block w-full rounded-lg border-0 py-3 pl-10 pr-10 text-text-light dark:text-white ring-1 ring-inset ring-border-light dark:ring-border-dark placeholder:text-gray-400 focus:ring-2 focus:ring-primary bg-surface-light dark:bg-background-dark text-sm"
            />
          </div>
          <p className="mt-2 text-sm text-text-muted-light dark:text-text-muted-dark">
            O arquivo será renomeado para o nome original durante a restauração.
          </p>
        </div>
        <div className="flex flex-col justify-end h-full pt-8 w-full md:w-auto">
          <button
            onClick={handleRestore}
            disabled={restoring || !destino}
            className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {restoring ? (
              <>
                <span className="material-icons-outlined animate-spin text-xl">refresh</span>
                Restaurando...
              </>
            ) : (
              <>
                <span className="material-icons-outlined text-xl">restore_page</span>
                Iniciar Restauração
              </>
            )}
          </button>
        </div>
      </div>

      {/* Result Message */}
      {result && (
        <div className={`mt-4 p-4 rounded-lg ${
          result.success
            ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
            : 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`material-icons-outlined ${result.success ? 'text-green-600' : 'text-red-600'}`}>
              {result.success ? 'check_circle' : 'error'}
            </span>
            <p className={`text-sm font-medium ${result.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              {result.message}
            </p>
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-8">
        <div className="lg:col-span-2 rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-4">
          <h4 className="text-sm font-bold text-text-light dark:text-white mb-3">Informações Adicionais</h4>
          <div className="space-y-3">
            {arquivo.seq_decimal && (
              <div className="flex gap-3 text-sm">
                <span className="text-blue-500 material-icons-outlined text-lg">tag</span>
                <div className="flex flex-col">
                  <span className="text-text-light dark:text-white font-medium">Sequência Decimal</span>
                  <span className="text-text-muted-light dark:text-text-muted-dark text-xs">{arquivo.seq_decimal}</span>
                </div>
              </div>
            )}
            {arquivo.nome_interno_app && (
              <div className="flex gap-3 text-sm">
                <span className="text-green-500 material-icons-outlined text-lg">inventory</span>
                <div className="flex flex-col">
                  <span className="text-text-light dark:text-white font-medium">Nome Interno App</span>
                  <span className="text-text-muted-light dark:text-text-muted-dark text-xs">{arquivo.nome_interno_app}</span>
                </div>
              </div>
            )}
            {arquivo.caminho_raiz_vault && (
              <div className="flex gap-3 text-sm">
                <span className="text-purple-500 material-icons-outlined text-lg">folder</span>
                <div className="flex flex-col">
                  <span className="text-text-light dark:text-white font-medium">Caminho Raiz Vault</span>
                  <span className="text-text-muted-light dark:text-text-muted-dark text-xs font-mono">{arquivo.caminho_raiz_vault}</span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-4 flex flex-col items-center justify-center text-center gap-2">
          <div className="bg-background-light dark:bg-background-dark p-3 rounded-full mb-1">
            <span className="material-icons-outlined text-4xl text-text-muted-light dark:text-text-muted-dark">image</span>
          </div>
          <p className="text-text-light dark:text-white text-sm font-medium">Visualização não disponível</p>
          <p className="text-text-muted-light dark:text-text-muted-dark text-xs">
            O formato requer software CAD específico.
          </p>
        </div>
      </div>
    </div>
  );
}
