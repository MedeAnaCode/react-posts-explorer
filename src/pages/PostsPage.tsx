import { useQuery } from '@tanstack/react-query';

import { PostCard, postsQueryOptions } from '../entities/post';
import {
  AVAILABLE_LIMITS,
  PostsPagination,
  type PostsLimit,
  usePostsPagination,
} from '../features/posts-pagination';
import { getApiErrorDescription, isApiError } from '../shared/api';
import { MessageState, RefreshNotice } from '../shared/ui';
import styles from './PostsPage.module.css';

export function PostsPage() {
  const { page, limit, setPage, setLimit } = usePostsPagination();
  const query = useQuery(postsQueryOptions(page, limit));
  const canResetPage =
    page > 1 && isApiError(query.error) && query.error.status === 400;

  return (
    <main className={`page-shell ${styles.page}`}>
      <div className={styles.toolbar}>
        <select
          className={styles.select}
          aria-label="Количество новостей на странице"
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
      </div>

      {query.data && query.isError ? (
        <RefreshNotice
          description={getApiErrorDescription(query.error)}
          busy={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.isPending ? (
        <MessageState
          title="Собираем новости"
          description="Запрашиваем свежие материалы The Guardian. Это займёт несколько секунд."
          busy
        />
      ) : !query.data ? (
        <MessageState
          title="Не получилось загрузить"
          description={getApiErrorDescription(query.error)}
          actionLabel={canResetPage ? 'На первую страницу' : 'Повторить запрос'}
          onAction={
            canResetPage ? () => setPage(1) : () => void query.refetch()
          }
        />
      ) : query.data.posts.length === 0 ? (
        <MessageState
          title="На этой странице пусто"
          description={
            page > 1
              ? 'Возможно, вы вышли за пределы каталога. Откройте первую страницу.'
              : 'Сейчас в каталоге нет новостей. Попробуйте обновить его позже.'
          }
          actionLabel={page > 1 ? 'На первую страницу' : 'Повторить запрос'}
          onAction={page > 1 ? () => setPage(1) : () => void query.refetch()}
        />
      ) : (
        <>
          <ol
            className={`${styles.grid} ${query.data.posts.length === 20 ? styles.gridTwenty : ''} ${query.isFetching ? styles.updating : ''}`}
            aria-busy={query.isFetching}
          >
            {query.data.posts.map((post) => (
              <li key={post.id}>
                <PostCard
                  post={post}
                  listSearch={`?page=${query.data.page}&limit=${query.data.limit}`}
                />
              </li>
            ))}
          </ol>
          <PostsPagination
            page={query.data.page}
            limit={query.data.limit}
            totalCount={query.data.totalCount}
            disabled={query.isFetching}
            onPageChange={setPage}
          />
        </>
      )}
    </main>
  );
}
