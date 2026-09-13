import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { server } from '../test/mocks/server';
import { mockPosts } from '../test/mocks/handlers';
import { AppRouter } from './AppRouter';

function renderRouter(pathname: string) {
  window.history.pushState({}, '', pathname);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AppRouter />
    </QueryClientProvider>,
  );
}

describe('маршрутизация приложения', () => {
  it('перенаправляет с главной страницы к списку постов', async () => {
    renderRouter('/');

    expect(
      await screen.findByRole('heading', { name: 'Список постов' }),
    ).toBeInTheDocument();
    expect(window.location.search).toBe('?page=1&limit=10');
  });

  it('нормализует параметры и сбрасывает страницу при смене лимита', async () => {
    const user = userEvent.setup();
    renderRouter('/posts?page=-5&limit=99');

    await screen.findByText('Тестовая публикация 1');
    expect(window.location.search).toBe('?page=1&limit=10');

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Показывать на странице' }),
      '20',
    );
    expect(window.location.search).toBe('?page=1&limit=20');
  });

  it('переходит к деталям и сохраняет параметры возврата', async () => {
    const user = userEvent.setup();
    renderRouter('/posts?page=2&limit=10');

    const detailLinks = await screen.findAllByRole('link', {
      name: /Читать полностью/,
    });
    await user.click(detailLinks[0]);
    expect(window.location.pathname).toBe('/posts/11');
    expect(window.location.search).toBe('?page=2&limit=10');
    expect(
      await screen.findByRole('heading', { name: 'Тестовая публикация 11' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Вернуться к списку' }));
    expect(window.location.pathname).toBe('/posts');
    expect(window.location.search).toBe('?page=2&limit=10');
  });

  it('показывает состояние отсутствующей публикации', async () => {
    renderRouter('/posts/999?page=1&limit=10');

    expect(
      await screen.findByRole('heading', { name: 'Публикация не найдена' }),
    ).toBeInTheDocument();
  });

  it('позволяет повторить запрос после ошибки списка', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    server.use(
      http.get('https://jsonplaceholder.typicode.com/posts', () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({}, { status: 500 })
          : HttpResponse.json(mockPosts.slice(0, 10), {
              headers: { 'X-Total-Count': '20' },
            });
      }),
    );
    renderRouter('/posts?page=1&limit=10');

    await user.click(
      await screen.findByRole('button', { name: 'Повторить запрос' }),
    );
    expect(
      await screen.findByText('Тестовая публикация 1'),
    ).toBeInTheDocument();
  });

  it('показывает страницу для неизвестного адреса', () => {
    renderRouter('/неизвестный-раздел');

    expect(
      screen.getByRole('heading', { name: 'Страница не найдена' }),
    ).toBeInTheDocument();
  });
});
