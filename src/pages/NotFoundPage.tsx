import { Link } from 'react-router-dom';

import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  return (
    <main className="page-shell">
      <div className={styles.content}>
        <p className={styles.code}>Ошибка 404</p>
        <h1 className={styles.title}>Страница не найдена</h1>
        <p className={styles.description}>
          Такой страницы нет. Проверьте адрес или вернитесь к каталогу новостей.
        </p>
        <Link className={styles.link} to="/posts?page=1&limit=10">
          Открыть список новостей
        </Link>
      </div>
    </main>
  );
}
