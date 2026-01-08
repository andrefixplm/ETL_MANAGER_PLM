interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { color: string; dotColor: string; label: string }> = {
  INWORK: {
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
    dotColor: 'bg-gray-400',
    label: 'Em Trabalho',
  },
  RELEASED: {
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    dotColor: 'bg-green-500',
    label: 'Liberado',
  },
  ready: {
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    dotColor: 'bg-green-500',
    label: 'Pronto para Carga',
  },
  error: {
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    dotColor: 'bg-red-500',
    label: 'Erro',
  },
  pending: {
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    dotColor: 'bg-yellow-500',
    label: 'Pendente',
  },
  imported: {
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    dotColor: 'bg-blue-500',
    label: 'Importado',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig['imported'];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`}></span>
      {config.label}
    </span>
  );
}
