import { Link } from 'react-router-dom';

import type { Post } from '../model/post';
import styles from './PostCard.module.css';

type PostCardProps = {
  post: Post;
  listSearch: string;
};

export function PostCard({ post, listSearch }: PostCardProps) {
  return (
    <article className={styles.card}>
      <p className={styles.meta}>Публикация · {post.id}</p>
      <h2 className={styles.title}>{post.title}</h2>
      <p className={styles.body}>{post.body}</p>
      <Link className={styles.link} to={`/posts/${post.id}${listSearch}`}>
        Читать полностью <span aria-hidden="true">↗</span>
      </Link>
    </article>
  );
}

