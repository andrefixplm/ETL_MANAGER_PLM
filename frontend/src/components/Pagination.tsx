import { useMemo } from 'react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  showItemCount?: boolean;
  compact?: boolean;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  showItemCount = true,
  compact = false
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const maxVisiblePages = 10;

  // Calculate visible page range
  const pageRange = useMemo(() => {
    const pages: (number | 'more')[] = [];

    if (totalPages <= maxVisiblePages) {
      // Show all pages if 10 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first pages, current area, and "more" indicator
      const startPage = Math.max(1, currentPage - 4);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      // Adjust start if we're near the end
      const adjustedStart = Math.max(1, endPage - maxVisiblePages + 1);

      for (let i = adjustedStart; i <= endPage; i++) {
        pages.push(i);
      }

      // Add "more" indicator if there are more pages
      if (endPage < totalPages) {
        pages.push('more');
      }
    }

    return pages;
  }, [currentPage, totalPages]);

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className={`flex items-center ${compact ? 'gap-2' : 'justify-between'} ${compact ? '' : 'w-full'}`}>
      {/* Item count info */}
      {showItemCount && !compact && (
        <div className="text-sm text-text-muted-light dark:text-text-muted-dark">
          Exibindo <span className="font-semibold text-text-light dark:text-white">{startItem}</span> a{' '}
          <span className="font-semibold text-text-light dark:text-white">{endItem}</span> de{' '}
          <span className="font-semibold text-text-light dark:text-white">{totalItems}</span> itens
        </div>
      )}

      {/* Page info and controls */}
      <div className="flex items-center gap-2">
        {/* Page range indicator */}
        <span className="text-sm text-text-muted-light dark:text-text-muted-dark mr-2">
          Páginas <span className="font-semibold text-text-light dark:text-white">1</span> a{' '}
          <span className="font-semibold text-text-light dark:text-white">{Math.min(maxVisiblePages, totalPages)}</span>
          {totalPages > maxVisiblePages && (
            <span className="text-text-muted-light dark:text-text-muted-dark"> de {totalPages}</span>
          )}
        </span>

        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 text-sm font-medium rounded-md border border-border-light dark:border-border-dark hover:bg-background-light dark:hover:bg-background-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Página anterior"
        >
          <span className="material-icons-outlined text-sm">chevron_left</span>
        </button>

        {/* Page numbers */}
        <div className="flex gap-1">
          {pageRange.map((page, index) => (
            page === 'more' ? (
              <button
                key={`more-${index}`}
                onClick={() => onPageChange(Math.min(totalPages, currentPage + maxVisiblePages))}
                className="px-3 py-1.5 text-sm font-medium rounded-md border border-border-light dark:border-border-dark hover:bg-primary hover:text-white hover:border-primary transition-colors"
                title={`Ir para página ${Math.min(totalPages, currentPage + maxVisiblePages)}`}
              >
                Mais...
              </button>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                  page === currentPage
                    ? 'bg-primary text-white border-primary'
                    : 'border-border-light dark:border-border-dark hover:bg-background-light dark:hover:bg-background-dark'
                }`}
              >
                {page}
              </button>
            )
          ))}
        </div>

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-2 text-sm font-medium rounded-md border border-border-light dark:border-border-dark hover:bg-background-light dark:hover:bg-background-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Próxima página"
        >
          <span className="material-icons-outlined text-sm">chevron_right</span>
        </button>

        {/* Jump to page (for many pages) */}
        {totalPages > maxVisiblePages && (
          <div className="flex items-center gap-1 ml-2">
            <span className="text-sm text-text-muted-light dark:text-text-muted-dark">Ir para:</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= totalPages) {
                  onPageChange(page);
                }
              }}
              className="w-16 px-2 py-1 text-sm text-center border border-border-light dark:border-border-dark rounded-md bg-background-light dark:bg-background-dark focus:outline-none focus:border-primary"
            />
          </div>
        )}
      </div>
    </div>
  );
}
