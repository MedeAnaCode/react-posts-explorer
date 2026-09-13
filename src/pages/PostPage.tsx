import { Link, useParams } from 'react-router-dom';

export function PostPage() {
  const { postId } = useParams();

  return (
    <main className="page-shell">
      <p className="eyebrow">Публикация № {postId}</p>
      <h1>Страница поста</h1>
      <p>Здесь будет заголовок и полный текст выбранной публикации.</p>
      <Link to="/posts">Вернуться к списку</Link>
    </main>
  );
}
