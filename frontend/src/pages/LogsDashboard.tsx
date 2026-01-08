import { useState, useEffect } from 'react';
import { getLogs, type ETLLog } from '../services/api';

export function LogsDashboard() {
    const [logs, setLogs] = useState<ETLLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<string>('');
    const [page, setPage] = useState(1);
    const pageSize = 50;

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const skip = (page - 1) * pageSize;
            const response = await getLogs({
                tipo: filterType || undefined,
                skip,
                limit: pageSize
            });
            setLogs(response.data);
        } catch (error) {
            console.error('Failed to fetch logs', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, filterType]);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'ERROR': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
            case 'WARN': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
            default: return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
        }
    };

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-text-light dark:text-white">Logs do Sistema</h2>
                    <p className="text-text-muted-light dark:text-text-muted-dark text-sm">
                        Histórico de operações, erros e auditoria.
                    </p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-md px-4 py-2 text-sm"
                    >
                        <option value="">Todos os Tipos</option>
                        <option value="import">Importação</option>
                        <option value="restore">Restauração</option>
                        <option value="verify">Verificação</option>
                        <option value="export">Exportação</option>
                    </select>
                    <button onClick={fetchLogs} className="p-2 bg-primary text-white rounded-full">
                        <span className="material-icons-outlined">refresh</span>
                    </button>
                </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-background-light dark:bg-background-dark border-b border-border-light dark:border-border-dark text-text-muted-light dark:text-text-muted-dark font-medium uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Data/Hora</th>
                            <th className="px-6 py-4">Tipo</th>
                            <th className="px-6 py-4">Severidade</th>
                            <th className="px-6 py-4">Detalhes</th>
                            <th className="px-6 py-4 text-right">Registros</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light dark:divide-border-dark text-text-light dark:text-white">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-text-muted-light">Carregando logs...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-text-muted-light">Nenhum log encontrado.</td></tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-background-light dark:hover:bg-background-dark/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-text-muted-light font-mono text-xs">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 capitalize">
                                            {log.tipo}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getSeverityColor(log.severity || 'INFO')}`}>
                                            {log.severity || 'INFO'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 max-w-lg truncate" title={log.detalhes}>
                                        {log.detalhes}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {log.registros_afetados !== null ? log.registros_afetados : '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination Controls */}
                <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex justify-between">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="px-4 py-2 text-sm border rounded disabled:opacity-50"
                    >Anterior</button>
                    <span className="text-sm self-center">Página {page}</span>
                    <button
                        onClick={() => setPage(p => p + 1)} disabled={logs.length < pageSize}
                        className="px-4 py-2 text-sm border rounded disabled:opacity-50"
                    >Próxima</button>
                </div>
            </div>
        </div>
    );
}
