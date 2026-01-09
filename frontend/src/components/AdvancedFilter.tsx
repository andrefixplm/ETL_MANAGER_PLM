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
    initialFilters?: FilterCondition[];
}

// Field options with labels
const FIELD_OPTIONS = [
    { value: 'nome_arquivo', label: 'Nome Arquivo', type: 'arquivo' },
    { value: 'nome_original', label: 'Nome Original', type: 'arquivo' },
    { value: 'nome_interno_app', label: 'Nome Interno', type: 'arquivo' },
    { value: 'nome_hex', label: 'Nome Hex (Vault)', type: 'arquivo' },
    { value: 'tipo_doc', label: 'Tipo Documento', type: 'both' },
    { value: 'numero_doc', label: 'Número Documento', type: 'documento' },
];

const OPERATOR_OPTIONS = [
    { value: 'contains', label: 'Contém' },
    { value: 'equals', label: 'Igual a' },
    { value: 'startsWith', label: 'Começa com' },
    { value: 'endsWith', label: 'Termina com' },
];

export function AdvancedFilter({ onFilterChange, onClose, initialFilters }: AdvancedFilterProps) {
    const [filters, setFilters] = useState<FilterCondition[]>(
        initialFilters && initialFilters.length > 0
            ? initialFilters
            : [{ id: '1', field: 'nome_arquivo', operator: 'contains', value: '', logic: 'AND' }]
    );
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Update filters when initialFilters change
    useEffect(() => {
        if (initialFilters && initialFilters.length > 0) {
            setFilters(initialFilters);
        }
    }, [initialFilters]);

    const addFilter = () => {
        const newFilter: FilterCondition = {
            id: Date.now().toString(),
            field: 'nome_arquivo',
            operator: 'contains',
            value: '',
            logic: 'AND'
        };
        setFilters([...filters, newFilter]);
    };

    const removeFilter = (id: string) => {
        if (filters.length > 1) {
            setFilters(filters.filter(f => f.id !== id));
            // Clear error for removed filter
            const newErrors = { ...errors };
            delete newErrors[id];
            setErrors(newErrors);
        }
    };

    const updateFilter = (id: string, key: keyof FilterCondition, value: string) => {
        setFilters(filters.map(f => f.id === id ? { ...f, [key]: value } : f));
        // Clear error when user starts typing
        if (key === 'value' && errors[id]) {
            const newErrors = { ...errors };
            delete newErrors[id];
            setErrors(newErrors);
        }
    };

    const applyFilters = () => {
        // Filter out empty values and validate
        const validFilters = filters.filter(f => f.value.trim() !== '');

        if (validFilters.length === 0) {
            // If no valid filters, clear all and close
            onFilterChange([]);
            onClose();
            return;
        }

        onFilterChange(validFilters);
        onClose();
    };

    const clearAllFilters = () => {
        setFilters([{ id: '1', field: 'nome_arquivo', operator: 'contains', value: '', logic: 'AND' }]);
        setErrors({});
        onFilterChange([]);
    };

    const getFieldLabel = (fieldValue: string): string => {
        return FIELD_OPTIONS.find(f => f.value === fieldValue)?.label || fieldValue;
    };

    const activeFiltersCount = filters.filter(f => f.value.trim() !== '').length;

    return (
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg border border-border-light dark:border-border-dark shadow-xl mb-6 animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-text-light dark:text-white">Filtros Avançados</h3>
                    {activeFiltersCount > 0 && (
                        <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">
                            {activeFiltersCount} ativo(s)
                        </span>
                    )}
                </div>
                <button onClick={onClose} className="text-text-muted-light hover:text-red-500 transition-colors">
                    <span className="material-icons-outlined">close</span>
                </button>
            </div>

            {/* Filter hint */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                <span className="material-icons-outlined text-sm align-middle mr-1">info</span>
                Combine múltiplos filtros usando E (AND) ou OU (OR) para refinar sua busca.
            </div>

            <div className="space-y-3 mb-6">
                {filters.map((filter, index) => (
                    <div key={filter.id} className="space-y-2">
                        <div className="flex gap-2 items-start flex-wrap">
                            {/* Logic operator (for filters after the first) */}
                            {index > 0 && (
                                <select
                                    value={filter.logic}
                                    onChange={(e) => updateFilter(filter.id, 'logic', e.target.value)}
                                    className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded p-2 text-sm w-20 font-medium"
                                >
                                    <option value="AND">E</option>
                                    <option value="OR">OU</option>
                                </select>
                            )}

                            {/* Field selector */}
                            <select
                                value={filter.field}
                                onChange={(e) => updateFilter(filter.id, 'field', e.target.value)}
                                className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded p-2 text-sm flex-1 min-w-[150px]"
                            >
                                {FIELD_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>

                            {/* Operator selector */}
                            <select
                                value={filter.operator}
                                onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
                                className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded p-2 text-sm w-36"
                            >
                                {OPERATOR_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>

                            {/* Value input */}
                            <div className="flex-1 min-w-[200px]">
                                <input
                                    type="text"
                                    value={filter.value}
                                    onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                                    placeholder={`Digite o valor para ${getFieldLabel(filter.field)}...`}
                                    className={`w-full bg-background-light dark:bg-background-dark border rounded p-2 text-sm ${
                                        errors[filter.id]
                                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                            : 'border-border-light dark:border-border-dark focus:border-primary focus:ring-primary'
                                    } focus:outline-none focus:ring-1`}
                                />
                            </div>

                            {/* Remove button */}
                            <button
                                onClick={() => removeFilter(filter.id)}
                                className={`p-2 rounded-full transition-colors ${
                                    filters.length === 1
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : 'text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                }`}
                                title={filters.length === 1 ? 'Não é possível remover o último filtro' : 'Remover filtro'}
                                disabled={filters.length === 1}
                            >
                                <span className="material-icons-outlined text-lg">delete</span>
                            </button>
                        </div>

                        {/* Error message */}
                        {errors[filter.id] && (
                            <p className="text-red-500 text-xs ml-1">{errors[filter.id]}</p>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border-light dark:border-border-dark">
                <div className="flex gap-2">
                    <button
                        onClick={addFilter}
                        className="text-primary hover:text-primary-hover text-sm font-medium flex items-center gap-1 transition-colors"
                    >
                        <span className="material-icons-outlined text-base">add</span>
                        Adicionar Condição
                    </button>

                    {activeFiltersCount > 0 && (
                        <button
                            onClick={clearAllFilters}
                            className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-1 ml-4 transition-colors"
                        >
                            <span className="material-icons-outlined text-base">clear_all</span>
                            Limpar Tudo
                        </button>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-text-muted-light hover:text-text-light transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={applyFilters}
                        className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg shadow-primary/30 transition-all"
                    >
                        Aplicar Filtros
                    </button>
                </div>
            </div>
        </div>
    );
}
