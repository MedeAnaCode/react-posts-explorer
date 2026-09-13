import styles from './PostsPagination.module.css';

type PostsPaginationProps = {
  page: number;
  limit: number;
  itemCount: number;
  totalCount: number | null;
  disabled?: boolean;
  onPageChange: (page: number) => void;
};

export function PostsPagination({
  page,
  limit,
  itemCount,
  totalCount,
  disabled = false,
  onPageChange,
}: PostsPaginationProps) {
  const totalPages = totalCount === null ? null : Math.ceil(totalCount / limit);
  // Без общего количества следующая страница остаётся доступной после полного ответа.
  const hasNextPage =
    totalPages === null ? itemCount === limit : page < totalPages;

  return (
    <nav className={styles.pagination} aria-label="Постраничная навигация">
      <button
        type="button"
        disabled={disabled || page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Перейти на предыдущую страницу"
      >
        ← Назад
      </button>
      <p className={styles.status} aria-live="polite">
        Страница {page}
        {totalPages === null ? '' : ` из ${Math.max(totalPages, 1)}`}
      </p>
      <button
        type="button"
        disabled={disabled || !hasNextPage}
        onClick={() => onPageChange(page + 1)}
        aria-label="Перейти на следующую страницу"
      >
        Вперёд →
      </button>
    </nav>
  );
}
