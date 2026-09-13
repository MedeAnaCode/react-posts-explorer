import { Link } from 'react-router-dom';

import styles from './SiteHeader.module.css';

const issueDate = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date());

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.masthead}>
        <Link
          className={styles.descriptor}
          to="/posts?page=1&limit=10"
          aria-label="На главную страницу"
        >
          Независимый обзор материалов The Guardian
        </Link>
        <p className={styles.date}>{issueDate}</p>
      </div>
    </header>
  );
}
