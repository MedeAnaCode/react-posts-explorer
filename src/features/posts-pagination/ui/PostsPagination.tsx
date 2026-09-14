import styles from './PostsPagination.module.css';

type PostsPaginationProps = {
  page: number;
  limit: number;
  totalCount: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
};

export function PostsPagination({
  page,
  limit,
  totalCount,
  disabled = false,
  onPageChange,
}: PostsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const hasNextPage = page < totalPages;

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
        Страница {page} из {totalPages}
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
