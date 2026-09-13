import { Link } from 'react-router-dom';

import type { Post } from '../model/post';
import styles from './PostCard.module.css';

type PostCardProps = {
  post: Post;
  listSearch: string;
};

export function PostCard({ post, listSearch }: PostCardProps) {
  const publicationDate = new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'long',
  }).format(new Date(post.webPublicationDate));

  return (
    <article className={styles.card}>
      {post.fields?.thumbnail ? (
        <img
          className={styles.image}
          src={post.fields.thumbnail}
          alt=""
          loading="lazy"
        />
      ) : null}
      <div className={styles.content}>
        <p className={styles.meta}>
          {post.sectionName} ·{' '}
          <time dateTime={post.webPublicationDate}>{publicationDate}</time>
        </p>
        <h2 className={styles.title}>{post.webTitle}</h2>
        {post.fields?.byline ? (
          <p className={styles.byline}>{post.fields.byline}</p>
        ) : null}
        <p className={styles.body}>
          {post.fields?.bodyText ??
            'Полный текст доступен на странице новости.'}
        </p>
      </div>
      <Link
        className={styles.link}
        to={`/posts/${encodeURIComponent(post.id)}${listSearch}`}
      >
        Читать полностью <span aria-hidden="true">↗</span>
      </Link>
    </article>
  );
}
