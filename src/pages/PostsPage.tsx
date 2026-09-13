import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

import { PostCard, postsQueryOptions } from '../entities/post';
import {
  AVAILABLE_LIMITS,
  PostsPagination,
  type PostsLimit,
  usePostsPagination,
} from '../features/posts-pagination';
import { isApiError } from '../shared/api';
import { MessageState } from '../shared/ui';
import styles from './PostsPage.module.css';

function getErrorDescription(error: unknown) {
  if (isApiError(error) && error.kind === 'validation') {
    return 'Ответ сервера не соответствует ожидаемому формату. Попробуйте ещё раз позже.';
  }

  return 'Не удалось загрузить новости. Проверьте подключение и повторите попытку.';
}

export function PostsPage() {
  const location = useLocation();
  const { page, limit, setPage, setLimit } = usePostsPagination();
  const query = useQuery(postsQueryOptions(page, limit));

  return (
    <main className="page-shell">
      <header className={styles.header}>
        <div>
          <p className="eyebrow">Новости / The Guardian</p>
          <h1 className={styles.heading}>Последние новости</h1>
          <p className={styles.lead}>
            Свежие материалы редакции с авторами, иллюстрациями и полным текстом
            на отдельной странице.
          </p>
        </div>
        <label className={styles.limitLabel}>
          Показывать на странице
          <select
            className={styles.select}
            value={limit}
            onChange={(event) =>
              setLimit(Number(event.target.value) as PostsLimit)
            }
          >
            {AVAILABLE_LIMITS.map((value) => (
              <option key={value} value={value}>
                {value} новостей
              </option>
            ))}
          </select>
        </label>
      </header>

      {query.isPending ? (
        <MessageState
          title="Собираем новости"
          description="Запрашиваем свежие материалы The Guardian. Это займёт несколько секунд."
          busy
        />
      ) : query.isError ? (
        <MessageState
          title="Не получилось загрузить"
          description={getErrorDescription(query.error)}
          actionLabel="Повторить запрос"
          onAction={() => void query.refetch()}
        />
      ) : query.data.posts.length === 0 ? (
        <MessageState
          title="На этой странице пусто"
          description="Вернитесь назад — возможно, вы вышли за пределы каталога."
          actionLabel={page > 1 ? 'На предыдущую страницу' : undefined}
          onAction={page > 1 ? () => setPage(page - 1) : undefined}
        />
      ) : (
        <>
          <ol
            className={`${styles.grid} ${query.isFetching ? styles.updating : ''}`}
            aria-busy={query.isFetching}
          >
            {query.data.posts.map((post) => (
              <li key={post.id}>
                <PostCard post={post} listSearch={location.search} />
              </li>
            ))}
          </ol>
          <PostsPagination
            page={page}
            limit={limit}
            itemCount={query.data.posts.length}
            totalCount={query.data.totalCount}
            disabled={query.isFetching}
            onPageChange={setPage}
          />
        </>
      )}
    </main>
  );
}
