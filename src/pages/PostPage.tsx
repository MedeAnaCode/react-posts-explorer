import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';

import { isValidGuardianPostId, postQueryOptions } from '../entities/post';
import {
  createPostsSearchParams,
  parsePostsSearchParams,
} from '../features/posts-pagination';
import { getApiErrorDescription, isApiError } from '../shared/api';
import { MessageState, RefreshNotice } from '../shared/ui';
import styles from './PostPage.module.css';

function parsePostId(value: string | undefined) {
  const postId = value?.trim();

  return postId && isValidGuardianPostId(postId) ? postId : null;
}

export function PostPage() {
  const params = useParams();
  const location = useLocation();
  const postId = parsePostId(params.postId);
  // Параметры списка переносим в ссылку назад, чтобы сохранить контекст пользователя.
  const listSearch = createPostsSearchParams(
    parsePostsSearchParams(new URLSearchParams(location.search)),
  );
  const query = useQuery(postQueryOptions(postId ?? ''));
  const isNotFound =
    postId === null ||
    (!query.data &&
      query.isError &&
      isApiError(query.error) &&
      query.error.status === 404);

  const backLink = (
    <Link className={styles.backLink} to={`/posts?${listSearch.toString()}`}>
      <span aria-hidden="true">←</span> Вернуться к списку
    </Link>
  );

  return (
    <main className="page-shell">
      {backLink}
      {query.data && query.isError ? (
        <RefreshNotice
          description={getApiErrorDescription(query.error)}
          busy={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {isNotFound ? (
        <MessageState
          title="Новость не найдена"
          description="Возможно, её удалили или в адресе указан неверный идентификатор."
        />
      ) : query.isPending ? (
        <MessageState
          title="Открываем новость"
          description="Загружаем полный текст."
          busy
        />
      ) : !query.data ? (
        <MessageState
          title="Не получилось открыть"
          description={getApiErrorDescription(query.error)}
          actionLabel="Повторить запрос"
          onAction={() => void query.refetch()}
        />
      ) : (
        <article className={styles.article}>
          {query.data.fields?.thumbnail ? (
            <img
              className={styles.hero}
              src={query.data.fields.thumbnail}
              alt=""
            />
          ) : null}
          <p className="eyebrow" lang="en">
            {query.data.sectionName}
          </p>
          <h1 className={styles.title} lang="en">
            {query.data.webTitle}
          </h1>
          <div className={styles.meta}>
            {query.data.fields?.byline ? (
              <p className={styles.byline} lang="en">
                {query.data.fields.byline}
              </p>
            ) : null}
            <time dateTime={query.data.webPublicationDate}>
              {new Intl.DateTimeFormat('ru-RU', {
                dateStyle: 'long',
                timeStyle: 'short',
              }).format(new Date(query.data.webPublicationDate))}
            </time>
          </div>
          <p
            className={styles.body}
            lang={query.data.fields?.bodyText ? 'en' : 'ru'}
          >
            {query.data.fields?.bodyText ??
              'Полный текст этой новости недоступен в API.'}
          </p>
          <a
            className={styles.sourceLink}
            href={query.data.webUrl}
            target="_blank"
            rel="noreferrer"
          >
            Открыть оригинал на The Guardian <span aria-hidden="true">↗</span>
          </a>
        </article>
      )}
    </main>
  );
}
