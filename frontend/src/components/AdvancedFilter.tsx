import { useState, useEffect } from 'react';

export interface FilterCondition {
    id: string;
    field: string;
    operator: 'contains' | 'equals' | 'startsWith' | 'endsWith';
    value: string;
    logic: 'AND' | 'OR';
}

interface AdvancedFilterProps {
    onFilterChange: (filters: FilterCondition[]) => void;
    onClose: () => void;
}

export function AdvancedFilter({ onFilterChange, onClose }: AdvancedFilterProps) {
    const [filters, setFilters] = useState<FilterCondition[]>([
        { id: '1', field: 'nome_arquivo', operator: 'contains', value: '', logic: 'AND' }
    ]);

    const addFilter = () => {
        setFilters([
            ...filters,
            { id: Date.now().toString(), field: 'nome_arquivo', operator: 'contains', value: '', logic: 'AND' }
        ]);
    };

    const removeFilter = (id: string) => {
        setFilters(filters.filter(f => f.id !== id));
    };

    const updateFilter = (id: string, key: keyof FilterCondition, value: string) => {
        setFilters(filters.map(f => f.id === id ? { ...f, [key]: value } : f));
    };

    const applyFilters = () => {
        onFilterChange(filters);
        onClose();
    };

    return (
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-xl mb-6 animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-text-light dark:text-white">Filtros Avançados</h3>
                <button onClick={onClose} className="text-text-muted-light hover:text-red-500">
                    <span className="material-icons-outlined">close</span>
                </button>
            </div>

            <div className="space-y-3 mb-6">
                {filters.map((filter, index) => (
                    <div key={filter.id} className="flex gap-2 items-center flex-wrap">
                        {index > 0 && (
                            <select
                                value={filter.logic}
                                onChange={(e) => updateFilter(filter.id, 'logic', e.target.value as 'AND' | 'OR')}
                                className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded p-2 text-sm w-20"
                            >
                                <option value="AND">E</option>
                                <option value="OR">OU</option>
                            </select>
                        )}

                        <select
                            value={filter.field}
                            onChange={(e) => updateFilter(filter.id, 'field', e.target.value)}
                            className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded p-2 text-sm flex-1"
                        >
                            <option value="nome_arquivo">Nome Arquivo</option>
                            <option value="nome_original">Nome Original</option>
                            <option value="nome_interno_app">Nome Interno</option>
                            <option value="tipo_doc">Tipo Doc</option>
                            <option value="numero_doc">Número Doc</option>
                        </select>

                        <select
                            value={filter.operator}
                            onChange={(e) => updateFilter(filter.id, 'operator', e.target.value as any)}
                            className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded p-2 text-sm w-32"
                        >
                            <option value="contains">Contém</option>
                            <option value="equals">Igual</option>
                            <option value="startsWith">Começa com</option>
                            <option value="endsWith">Termina com</option>
                        </select>

                        <input
                            type="text"
                            value={filter.value}
                            onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                            placeholder="Valor..."
                            className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded p-2 text-sm flex-1 min-w-[150px]"
                        />

                        <button
                            onClick={() => removeFilter(filter.id)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                            title="Remover filtro"
                            disabled={filters.length === 1}
                        >
                            <span className="material-icons-outlined text-lg">delete</span>
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex justify-between">
                <button
                    onClick={addFilter}
                    className="text-primary hover:text-primary-hover text-sm font-medium flex items-center gap-1"
                >
                    <span className="material-icons-outlined text-base">add</span> Adicionar Condição
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-text-muted-light hover:text-text-light"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={applyFilters}
                        className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg shadow-primary/30"
                    >
                        Aplicar Filtros
                    </button>
                </div>
            </div>
        </div>
    );
}
