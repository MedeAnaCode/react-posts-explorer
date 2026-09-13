import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="page-shell">
      <p className="eyebrow">Ошибка 404</p>
      <h1>Страница не найдена</h1>
      <p>Проверьте адрес или вернитесь к списку публикаций.</p>
      <Link to="/posts">Открыть список постов</Link>
    </main>
  );
}
