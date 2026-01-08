import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatsCard } from '../components/StatsCard';
import { ImportModal } from '../components/ImportModal';
import { ItemsTable } from '../components/ItemsTable';
import { getStats, getDocumentos, getArquivos, restoreFiles, verifyIntegrity, getConfiguracoes, type Stats, type Documento, type Arquivo } from '../services/api';
import { AdvancedFilter, type FilterCondition } from '../components/AdvancedFilter';

type TabType = 'todos' | 'documentos' | 'arquivos';

export function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterCondition[]>([]);
  const [defaultDestino, setDefaultDestino] = useState('C:\\Export');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalItems, setTotalItems] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * pageSize;

      const configRes = await getConfiguracoes(); // Get config first

      let docsData: Documento[] = [];
      let filesData: Arquivo[] = [];
      let totalDocs = 0;
      let totalFiles = 0;

      if (activeTab === 'todos' || activeTab === 'documentos') {
        const docsRes = await getDocumentos({ skip, limit: pageSize });
        docsData = docsRes.data;
      }

      if (activeTab === 'todos' || activeTab === 'arquivos') {
        // Map advanced filters to backend params
        const params: any = { skip, limit: pageSize };

        // Basic search term override if present
        if (searchTerm) params.nome = searchTerm;

        // Apply advanced filters (simplified mapping)
        activeFilters.forEach(f => {
          if (f.field === 'nome_interno_app' && (f.operator === 'contains' || f.operator === 'equals')) {
            params.nome_interno = f.value;
          }
          if (f.field === 'nome_arquivo' && f.operator === 'contains') {
            params.nome = f.value;
          }
        });

        const filesRes = await getArquivos(params);
        filesData = filesRes.data;
      }

      const statsRes = await getStats();
      setStats(statsRes.data);
      setTotalItems((statsRes.data.total_documentos + statsRes.data.total_arquivos)); // Aproximação, ideal seria count do endpoint

      setDocumentos(docsData);
      setArquivos(filesData);

      if (configRes.data.destino_padrao) {
        setDefaultDestino(configRes.data.destino_padrao);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchRestore = async () => {
    if (selectedItems.length === 0) return;

    const destino = window.prompt('Caminho de destino para restauração:', defaultDestino);
    if (!destino) return;

    try {
      const response = await restoreFiles(selectedItems, destino);
      const { success, message, erros } = response.data;

      if (success) {
        alert(message);
        setSelectedItems([]); // Limpa seleção
      } else {
        alert(`Erro parcial:\n${message}\n\nErros:\n${erros.join('\n')}`);
      }
    } catch (error) {
      console.error('Erro na restauração:', error);
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
        // Futuramente abrir modal de relatório
      }

      alert(report);
      // Atualizar stats ou logs se necessário
      fetchData();

    } catch (error) {
      console.error('Erro na verificação:', error);
      alert('Falha ao executar verificação.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, activeTab, activeFilters]); // Re-fetch on page or tab change

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

  const filteredDocumentos = documentos.filter(
    d => d.numero_doc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.nome_doc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredArquivos = arquivos.filter(
    a => a.nome_arquivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.nome_original && a.nome_original.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getDisplayData = () => {
    switch (activeTab) {
      case 'documentos':
        return { docs: filteredDocumentos, files: [] };
      case 'arquivos':
        return { docs: [], files: filteredArquivos };
      default:
        return { docs: filteredDocumentos, files: filteredArquivos };
    }
  };

  const { docs, files } = getDisplayData();

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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Número do Documento..."
              className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark rounded-full py-3 pl-5 pr-12 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
            />
            <button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary hover:bg-primary-hover text-white p-2 rounded-full transition-colors w-8 h-8 flex items-center justify-center">
              <span className="material-icons-outlined text-sm">search</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-4 w-full lg:w-auto items-center">
            <select className="appearance-none bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-muted-light dark:text-text-muted-dark py-2.5 px-5 pr-10 rounded-full text-sm focus:outline-none focus:border-primary cursor-pointer min-w-[160px]">
              <option>Todos os Status</option>
              <option>INWORK</option>
              <option>RELEASED</option>
            </select>
          </div>
        </div>
      </div>



      {/* Advanced Filters */}
      <div className="flex justify-end mb-4">
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
          onFilterChange={(filters) => {
            setActiveFilters(filters);
            setPage(1); // Reset page on filter
          }}
          onClose={() => setShowAdvancedFilter(false)}
        />
      )
      }

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
            Todos
          </button>
          <button
            onClick={() => setActiveTab('documentos')}
            className={`py-4 px-6 font-medium text-sm transition-colors ${activeTab === 'documentos'
              ? 'text-primary border-b-2 border-primary font-semibold'
              : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-white'
              }`}
          >
            Documentos ({documentos.length})
          </button>
          <button
            onClick={() => setActiveTab('arquivos')}
            className={`py-4 px-6 font-medium text-sm transition-colors ${activeTab === 'arquivos'
              ? 'text-primary border-b-2 border-primary font-semibold'
              : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-white'
              }`}
          >
            Arquivos ({arquivos.length})
          </button>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <ItemsTable
            docs={docs}
            files={files}
            selectedItems={selectedItems}
            loading={loading}
            onSelectItem={handleSelectItem}
            onSelectAll={handleSelectAll}
            onViewItem={(id) => navigate(`/arquivo/${id}`)}
          />
        </div>

        {/* Pagination */}
        {/* Pagination */}<div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex items-center justify-between bg-background-light/50 dark:bg-background-dark/50">
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-muted-light dark:text-text-muted-dark">
              Página <span className="font-semibold text-text-light dark:text-white">{page}</span> (50 itens/pág)
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-medium rounded-md border border-border-light dark:border-border-dark hover:bg-background-light dark:hover:bg-background-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={docs.length + files.length < pageSize}
              className="px-4 py-2 text-sm font-medium rounded-md border border-border-light dark:border-border-dark hover:bg-background-light dark:hover:bg-background-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Próxima
            </button>
          </div>
        </div>
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
