import { StatusBadge } from './StatusBadge';
import { FileIcon } from './FileIcon';
import type { Documento, Arquivo } from '../services/api';

export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

interface ItemsTableProps {
  docs: Documento[];
  files: Arquivo[];
  selectedItems: number[];
  loading: boolean;
  sortConfig?: SortConfig;
  onSelectItem: (id: number, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onViewItem: (id: number) => void;
  onSort?: (column: string) => void;
}

interface SortableHeaderProps {
  column: string;
  label: string;
  sortConfig?: SortConfig;
  onSort?: (column: string) => void;
  className?: string;
}

function SortableHeader({ column, label, sortConfig, onSort, className = '' }: SortableHeaderProps) {
  const isActive = sortConfig?.column === column;
  const direction = isActive ? sortConfig.direction : null;

  const handleClick = () => {
    if (onSort) {
      onSort(column);
    }
  };

  return (
    <th
      className={`p-4 font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none ${className}`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <span className="material-icons-outlined text-sm">
          {isActive ? (
            direction === 'asc' ? 'arrow_upward' : 'arrow_downward'
          ) : (
            'unfold_more'
          )}
        </span>
      </div>
    </th>
  );
}

export function ItemsTable({
  docs,
  files,
  selectedItems,
  loading,
  sortConfig,
  onSelectItem,
  onSelectAll,
  onViewItem,
  onSort,
}: ItemsTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="material-icons-outlined animate-spin text-4xl text-primary">refresh</span>
      </div>
    );
  }

  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-background-light dark:bg-background-dark text-text-muted-light dark:text-text-muted-dark text-xs uppercase tracking-wider">
          <th className="p-4 font-semibold w-12 text-center">
            <input
              type="checkbox"
              onChange={(e) => onSelectAll(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
            />
          </th>
          <SortableHeader
            column="nome_hex"
            label="Identificação"
            sortConfig={sortConfig}
            onSort={onSort}
          />
          <SortableHeader
            column="nome_original"
            label="Nome Original"
            sortConfig={sortConfig}
            onSort={onSort}
          />
          <SortableHeader
            column="nome_interno_app"
            label="Nome Interno"
            sortConfig={sortConfig}
            onSort={onSort}
          />
          <SortableHeader
            column="versao"
            label="Versão"
            sortConfig={sortConfig}
            onSort={onSort}
          />
          <SortableHeader
            column="tipo_doc"
            label="Tipo"
            sortConfig={sortConfig}
            onSort={onSort}
          />
          <SortableHeader
            column="estado"
            label="Status"
            sortConfig={sortConfig}
            onSort={onSort}
          />
          <th className="p-4 font-semibold text-right">Ações</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border-light dark:divide-border-dark text-sm">
        {docs.map((doc) => (
          <tr
            key={`doc-${doc.id}`}
            className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <td className="p-4 text-center">
              <input
                type="checkbox"
                checked={selectedItems.includes(doc.id)}
                onChange={(e) => onSelectItem(doc.id, e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary h-4 w-4"
              />
            </td>
            <td className="p-4 font-medium text-text-light dark:text-white">
              <div className="flex items-center gap-2">
                <span className="material-icons-outlined text-gray-400 text-lg">description</span>
                {doc.numero_doc || '-'}
              </div>
            </td>
            <td className="p-4 text-text-muted-light dark:text-text-muted-dark">{doc.nome_doc || '-'}</td>
            <td className="p-4 text-text-muted-light dark:text-text-muted-dark font-mono text-xs">-</td>
            <td className="p-4 text-text-muted-light dark:text-text-muted-dark">
              {doc.versao ? `${doc.versao}.${doc.iteracao || 0}` : '-'}
            </td>
            <td className="p-4 text-text-muted-light dark:text-text-muted-dark">Documento</td>
            <td className="p-4">
              <StatusBadge status={doc.estado || 'imported'} />
            </td>
            <td className="p-4 text-right">
              <button
                onClick={() => onViewItem(doc.id)}
                className="text-text-muted-light hover:text-primary dark:text-text-muted-dark dark:hover:text-white transition-colors p-1"
                title="Ver Detalhes"
              >
                <span className="material-icons-outlined text-lg">visibility</span>
              </button>
            </td>
          </tr>
        ))}
        {files.map((file) => (
          <tr
            key={`file-${file.id}`}
            className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <td className="p-4 text-center">
              <input
                type="checkbox"
                checked={selectedItems.includes(file.id)}
                onChange={(e) => onSelectItem(file.id, e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary h-4 w-4"
              />
            </td>
            <td className="p-4 font-medium text-text-light dark:text-white">
              <div className="flex items-center gap-2">
                <FileIcon filename={file.nome_arquivo} className="text-lg" />
                <span className="font-mono text-xs">{file.nome_hex || '-'}</span>
              </div>
            </td>
            <td className="p-4 text-text-muted-light dark:text-text-muted-dark">
                {file.nome_original || file.nome_arquivo || '-'}
            </td>
            <td className="p-4 text-text-muted-light dark:text-text-muted-dark font-mono text-xs">
                {file.nome_interno_app || '-'}
            </td>
            <td className="p-4 text-text-muted-light dark:text-text-muted-dark">-</td>
            <td className="p-4 text-text-muted-light dark:text-text-muted-dark">
              {file.tipo_doc || 'Arquivo'}
            </td>
            <td className="p-4">
              <StatusBadge status="imported" />
            </td>
            <td className="p-4 text-right">
              <button
                onClick={() => onViewItem(file.id)}
                className="text-text-muted-light hover:text-primary dark:text-text-muted-dark dark:hover:text-white transition-colors p-1"
                title="Ver Detalhes"
              >
                <span className="material-icons-outlined text-lg">visibility</span>
              </button>
            </td>
          </tr>
        ))}
        {docs.length === 0 && files.length === 0 && (
          <tr>
            <td colSpan={8} className="p-8 text-center text-text-muted-light dark:text-text-muted-dark">
              Nenhum registro encontrado
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
