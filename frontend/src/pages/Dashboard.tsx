import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatsCard } from '../components/StatsCard';
import { ImportModal } from '../components/ImportModal';
import { ItemsTable, type SortConfig } from '../components/ItemsTable';
import { Pagination } from '../components/Pagination';
import { getStats, getDocumentos, getArquivos, restoreFiles, verifyIntegrity, getConfiguracoes, type Stats, type Documento, type Arquivo } from '../services/api';
import { AdvancedFilter, type FilterCondition } from '../components/AdvancedFilter';

type TabType = 'todos' | 'documentos' | 'arquivos';

interface FilterState {
  searchTerm: string;
  estado: string;
  advancedFilters: FilterCondition[];
}

export function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('todos');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [defaultDestino, setDefaultDestino] = useState('C:\\Export');

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    estado: '',
    advancedFilters: []
  });

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: 'id',
    direction: 'asc'
  });

  // Build backend params from filters
  const buildFilterParams = useCallback((type: 'documentos' | 'arquivos') => {
    // When showing "todos", split the limit between docs and files
    const effectiveLimit = activeTab === 'todos' ? Math.floor(pageSize / 2) : pageSize;
    const effectiveSkip = activeTab === 'todos'
      ? Math.floor((page - 1) * pageSize / 2)
      : (page - 1) * pageSize;

    const params: Record<string, string | number | undefined> = {
      skip: effectiveSkip,
      limit: effectiveLimit
    };

    // Basic search term
    if (filters.searchTerm) {
      if (type === 'documentos') {
        params.busca = filters.searchTerm;
      } else {
        params.nome = filters.searchTerm;
      }
    }

    // Estado filter (documentos only)
    if (filters.estado && type === 'documentos') {
      params.estado = filters.estado;
    }

    // Advanced filters
    filters.advancedFilters.forEach(f => {
      if (!f.value.trim()) return;

      // Map frontend field names to backend param names
      const fieldMapping: Record<string, { doc?: string; arq?: string }> = {
        'nome_arquivo': { arq: 'nome' },
        'nome_original': { arq: 'nome_original' },
        'nome_interno_app': { arq: 'nome_interno' },
        'tipo_doc': { doc: 'nome_doc', arq: 'tipo_doc' },
        'numero_doc': { doc: 'numero_doc' },
        'nome_hex': { arq: 'nome_hex' }
      };

      const mapping = fieldMapping[f.field];
      if (mapping) {
        const paramKey = type === 'documentos' ? mapping.doc : mapping.arq;
        if (paramKey) {
          params[paramKey] = f.value;
        }
      }
    });

    // Sorting
    if (sortConfig.column) {
      params.order_by = sortConfig.column;
      params.order_dir = sortConfig.direction;
    }

    return params;
  }, [page, pageSize, filters, activeTab, sortConfig]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch config
      const configRes = await getConfiguracoes();
      if (configRes.data.destino_padrao) {
        setDefaultDestino(configRes.data.destino_padrao);
      }

      // Fetch data based on active tab
      if (activeTab === 'todos' || activeTab === 'documentos') {
        try {
          const docsRes = await getDocumentos(buildFilterParams('documentos'));
          setDocumentos(docsRes.data.items);
          setTotalDocs(docsRes.data.total);
        } catch (err) {
          console.error('Error fetching documentos:', err);
          setDocumentos([]);
          setTotalDocs(0);
        }
      } else {
        setDocumentos([]);
        setTotalDocs(0);
      }

      if (activeTab === 'todos' || activeTab === 'arquivos') {
        try {
          const filesRes = await getArquivos(buildFilterParams('arquivos'));
          setArquivos(filesRes.data.items);
          setTotalFiles(filesRes.data.total);
        } catch (err) {
          console.error('Error fetching arquivos:', err);
          setArquivos([]);
          setTotalFiles(0);
        }
      } else {
        setArquivos([]);
        setTotalFiles(0);
      }

      // Fetch stats
      const statsRes = await getStats();
      setStats(statsRes.data);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Erro ao carregar dados. Verifique a conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, buildFilterParams]);

  const handleBatchRestore = async () => {
    if (selectedItems.length === 0) return;

    const destino = window.prompt('Caminho de destino para restauração:', defaultDestino);
    if (!destino) return;

    try {
      const response = await restoreFiles(selectedItems, destino);
      const { success, message, erros } = response.data;

      if (success) {
        alert(message);
        setSelectedItems([]);
      } else {
        alert(`Erro parcial:\n${message}\n\nErros:\n${erros.join('\n')}`);
      }
    } catch (err) {
      console.error('Erro na restauração:', err);
      alert('Falha ao iniciar restauração.');
    }
  };

  const handleVerify = async () => {
    if (selectedItems.length === 0) return;

    if (!confirm(`Deseja verificar a integridade de ${selectedItems.length} arquivos físicos no vault?`)) return;

    try {
      setLoading(true);
      const response = await verifyIntegrity(selectedItems);
      const { total_verificados, total_falhas, message } = response.data;

      let report = `${message}\n\nVerificados: ${total_verificados}\nFalhas (Ausentes): ${total_falhas}`;

      if (total_falhas > 0) {
        report += `\n\nConsulte os Logs para detalhes dos itens ausentes.`;
      }

      alert(report);
      fetchData();

    } catch (err) {
      console.error('Erro na verificação:', err);
      alert('Falha ao executar verificação.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when filters or tab change
  useEffect(() => {
    setPage(1);
  }, [activeTab, filters.searchTerm, filters.estado, filters.advancedFilters]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = [...documentos.map(d => d.id), ...arquivos.map(a => a.id)];
      setSelectedItems(allIds);
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems.filter(i => i !== id));
    }
  };

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, searchTerm: value }));
  };

  const handleEstadoChange = (value: string) => {
    setFilters(prev => ({ ...prev, estado: value }));
  };

  const handleAdvancedFilterChange = (newFilters: FilterCondition[]) => {
    setFilters(prev => ({ ...prev, advancedFilters: newFilters }));
  };

  const clearAllFilters = () => {
    setFilters({
      searchTerm: '',
      estado: '',
      advancedFilters: []
    });
    setShowAdvancedFilter(false);
  };

  const handleSort = (column: string) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getDisplayData = () => {
    switch (activeTab) {
      case 'documentos':
        return { docs: documentos, files: [] };
      case 'arquivos':
        return { docs: [], files: arquivos };
      default:
        return { docs: documentos, files: arquivos };
    }
  };

  const { docs, files } = getDisplayData();

  // Calculate total items for pagination based on active tab
  const getTotalItems = () => {
    switch (activeTab) {
      case 'documentos':
        return totalDocs;
      case 'arquivos':
        return totalFiles;
      default:
        return totalDocs + totalFiles;
    }
  };

  const hasActiveFilters = filters.searchTerm || filters.estado || filters.advancedFilters.length > 0;

  // Pagination component to render at top and bottom
  const PaginationControls = ({ position }: { position: 'top' | 'bottom' }) => (
    <div className={`px-6 py-4 ${position === 'top' ? 'border-b' : 'border-t'} border-border-light dark:border-border-dark bg-background-light/50 dark:bg-background-dark/50`}>
      <Pagination
        currentPage={page}
        totalItems={getTotalItems()}
        pageSize={pageSize}
        onPageChange={setPage}
        showItemCount={position === 'bottom'}
      />
    </div>
  );

  return (
    <main className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1 text-text-light dark:text-white">Registro de Documentos</h2>
          <p className="text-text-muted-light dark:text-text-muted-dark text-sm">
            Revise arquivos importados, verifique status e execute restaurações.
          </p>
        </div>
        <div className="flex gap-3">
          {selectedItems.length > 0 && (
            <button
              onClick={handleBatchRestore}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-full shadow-lg shadow-green-600/30 transition-all flex items-center gap-2 text-sm font-semibold uppercase tracking-wider animate-fadeIn"
            >
              <span className="material-icons-outlined text-lg">restore_page</span>
              Restaurar Seleção ({selectedItems.length})
            </button>
          )}
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-muted-light dark:text-text-muted-dark px-6 py-2.5 rounded-full hover:border-primary hover:text-primary transition-all flex items-center gap-2 text-sm font-semibold uppercase tracking-wider"
          >
            <span className="material-icons-outlined text-lg">file_upload</span> Importar
          </button>
          <button
            onClick={handleVerify}
            className={`bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-full shadow-lg shadow-primary/30 transition-all flex items-center gap-2 text-sm font-semibold uppercase tracking-wider transform active:scale-95 ${selectedItems.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Verificar integridade física dos arquivos no vault"
            disabled={selectedItems.length === 0}
          >
            <span className="material-icons-outlined text-lg">sync_problem</span> Sincronização
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <span className="material-icons-outlined">error</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard
          icon="inventory_2"
          iconColor="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-100 dark:bg-blue-900/30"
          value={stats?.total_documentos || 0}
          label="Total Documentos"
        />
        <StatsCard
          icon="folder_open"
          iconColor="text-yellow-600 dark:text-yellow-400"
          bgColor="bg-yellow-100 dark:bg-yellow-900/30"
          value={stats?.total_arquivos || 0}
          label="Total Arquivos"
        />
        <StatsCard
          icon="check_circle"
          iconColor="text-green-600 dark:text-green-400"
          bgColor="bg-green-100 dark:bg-green-900/30"
          value={stats?.total_operacoes || 0}
          label="Operações ETL"
        />
        <StatsCard
          icon="error_outline"
          iconColor="text-red-600 dark:text-red-400"
          bgColor="bg-red-100 dark:bg-red-900/30"
          value={0}
          label="Erros de Validação"
          badge={{ text: 'OK', color: 'green' }}
        />
      </div>

      {/* Filters */}
      <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark mb-6">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-end lg:items-center">
          <div className="w-full lg:w-1/3 relative">
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar por Número do Documento..."
              className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark rounded-full py-3 pl-5 pr-12 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
            />
            <button
              onClick={fetchData}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary hover:bg-primary-hover text-white p-2 rounded-full transition-colors w-8 h-8 flex items-center justify-center"
            >
              <span className="material-icons-outlined text-sm">search</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-4 w-full lg:w-auto items-center">
            <select
              value={filters.estado}
              onChange={(e) => handleEstadoChange(e.target.value)}
              className="appearance-none bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-muted-light dark:text-text-muted-dark py-2.5 px-5 pr-10 rounded-full text-sm focus:outline-none focus:border-primary cursor-pointer min-w-[160px]"
            >
              <option value="">Todos os Status</option>
              <option value="INWORK">INWORK</option>
              <option value="RELEASED">RELEASED</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <span className="material-icons-outlined text-sm">clear</span>
                Limpar Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-text-muted-light dark:text-text-muted-dark">
          {hasActiveFilters && (
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">
              {filters.advancedFilters.length} filtro(s) avançado(s) ativo(s)
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
          className={`text-sm font-medium flex items-center gap-1 ${showAdvancedFilter ? 'text-primary' : 'text-text-muted-light'}`}
        >
          <span className="material-icons-outlined">filter_list</span>
          {showAdvancedFilter ? 'Ocultar Filtros' : 'Filtros Avançados'}
        </button>
      </div>

      {showAdvancedFilter && (
        <AdvancedFilter
          onFilterChange={handleAdvancedFilterChange}
          onClose={() => setShowAdvancedFilter(false)}
          initialFilters={filters.advancedFilters}
        />
      )}

      {/* Table */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-border-light dark:border-border-dark px-4">
          <button
            onClick={() => setActiveTab('todos')}
            className={`py-4 px-6 font-medium text-sm transition-colors ${activeTab === 'todos'
              ? 'text-primary border-b-2 border-primary font-semibold'
              : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-white'
              }`}
          >
            Todos ({totalDocs + totalFiles})
          </button>
          <button
            onClick={() => setActiveTab('documentos')}
            className={`py-4 px-6 font-medium text-sm transition-colors ${activeTab === 'documentos'
              ? 'text-primary border-b-2 border-primary font-semibold'
              : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-white'
              }`}
          >
            Documentos ({totalDocs})
          </button>
          <button
            onClick={() => setActiveTab('arquivos')}
            className={`py-4 px-6 font-medium text-sm transition-colors ${activeTab === 'arquivos'
              ? 'text-primary border-b-2 border-primary font-semibold'
              : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-white'
              }`}
          >
            Arquivos ({totalFiles})
          </button>
        </div>

        {/* Top Pagination */}
        <PaginationControls position="top" />

        {/* Table Content */}
        <div className="overflow-x-auto">
          <ItemsTable
            docs={docs}
            files={files}
            selectedItems={selectedItems}
            loading={loading}
            sortConfig={sortConfig}
            onSelectItem={handleSelectItem}
            onSelectAll={handleSelectAll}
            onViewItem={(id) => navigate(`/arquivo/${id}`)}
            onSort={handleSort}
          />
        </div>

        {/* Bottom Pagination */}
        <PaginationControls position="bottom" />
      </div>

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={fetchData}
      />
    </main>
  );
}
