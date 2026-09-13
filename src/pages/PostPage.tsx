import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';

import { postQueryOptions } from '../entities/post';
import {
  createPostsSearchParams,
  parsePostsSearchParams,
} from '../features/posts-pagination';
import { isApiError } from '../shared/api';
import { MessageState } from '../shared/ui';
import styles from './PostPage.module.css';

function parsePostId(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const postId = Number(value);
  return Number.isSafeInteger(postId) && postId > 0 ? postId : null;
}

export function PostPage() {
  const params = useParams();
  const location = useLocation();
  const postId = parsePostId(params.postId);
  const listSearch = createPostsSearchParams(
    parsePostsSearchParams(new URLSearchParams(location.search)),
  );
  const query = useQuery(postQueryOptions(postId ?? 0));
  const isNotFound =
    postId === null ||
    (query.isError && isApiError(query.error) && query.error.status === 404);

  const backLink = (
    <Link className={styles.backLink} to={`/posts?${listSearch.toString()}`}>
      <span aria-hidden="true">←</span> Вернуться к списку
    </Link>
  );

  return (
    <main className="page-shell">
      {backLink}
      {isNotFound ? (
        <MessageState
          title="Публикация не найдена"
          description="Возможно, её удалили или в адресе указан неверный номер."
        />
      ) : query.isPending ? (
        <MessageState
          title="Открываем публикацию"
          description="Загружаем полный текст."
          busy
        />
      ) : query.isError ? (
        <MessageState
          title="Не получилось открыть"
          description="Проверьте подключение и повторите запрос."
          actionLabel="Повторить запрос"
          onAction={() => void query.refetch()}
        />
      ) : (
        <article className={styles.article}>
          <p className="eyebrow">Публикация · {query.data.id}</p>
          <h1 className={styles.title}>{query.data.title}</h1>
          <p className={styles.body}>{query.data.body}</p>
        </article>
      )}
    </main>
  );
}
