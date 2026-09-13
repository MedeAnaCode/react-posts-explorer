import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { mockPosts } from '../test/mocks/handlers';
import { server } from '../test/mocks/server';
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

function listResponse(results = mockPosts.slice(0, 10), total = 20) {
  return { response: { status: 'ok', total, results } };
}

describe('маршрутизация приложения', () => {
  it('перенаправляет с главной страницы к списку новостей', async () => {
    renderRouter('/');

    expect(
      await screen.findByRole('heading', { name: 'Последние новости' }),
    ).toBeInTheDocument();
    expect(window.location.search).toBe('?page=1&limit=10');
  });

  it('нормализует параметры и сбрасывает страницу при смене лимита', async () => {
    const user = userEvent.setup();
    renderRouter('/posts?page=-5&limit=99');

    await screen.findByText('Тестовая новость 1');
    expect(window.location.search).toBe('?page=1&limit=10');

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Показывать на странице' }),
      '20',
    );
    expect(window.location.search).toBe('?page=1&limit=20');
  });

  it('переходит к новости со строковым id и сохраняет параметры возврата', async () => {
    const user = userEvent.setup();
    renderRouter('/posts?page=2&limit=10');

    const detailLinks = await screen.findAllByRole('link', {
      name: /Читать полностью/,
    });
    await user.click(detailLinks[0]);

    expect(decodeURIComponent(window.location.pathname)).toBe(
      `/posts/${mockPosts[10].id}`,
    );
    expect(window.location.search).toBe('?page=2&limit=10');
    expect(
      await screen.findByRole('heading', { name: 'Тестовая новость 11' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Автор 11')).toBeInTheDocument();
    expect(
      screen.getByText('Полный текст тестовой новости 11.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Открыть оригинал на The Guardian/ }),
    ).toHaveAttribute('href', mockPosts[10].webUrl);

    await user.click(screen.getByRole('link', { name: 'Вернуться к списку' }));
    expect(window.location.pathname).toBe('/posts');
    expect(window.location.search).toBe('?page=2&limit=10');
  });

  it('показывает состояние отсутствующей новости', async () => {
    renderRouter('/posts/world%2F2026%2Fsep%2Fmissing?page=1&limit=10');

    expect(
      await screen.findByRole('heading', { name: 'Новость не найдена' }),
    ).toBeInTheDocument();
  });

  it('не отправляет запрос для небезопасного Guardian id', () => {
    renderRouter('/posts/world%2F..%2Fescape?page=1&limit=10');

    expect(
      screen.getByRole('heading', { name: 'Новость не найдена' }),
    ).toBeInTheDocument();
  });

  it('позволяет повторить запрос после ошибки списка', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    server.use(
      http.get('*/guardian-api/search', () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({}, { status: 500 })
          : HttpResponse.json(listResponse());
      }),
    );
    renderRouter('/posts?page=1&limit=10');

    await user.click(
      await screen.findByRole('button', { name: 'Повторить запрос' }),
    );
    expect(await screen.findByText('Тестовая новость 1')).toBeInTheDocument();
  });

  it('явно сообщает о пустой странице списка', async () => {
    server.use(
      http.get('*/guardian-api/search', () =>
        HttpResponse.json(listResponse([], 20)),
      ),
    );
    renderRouter('/posts?page=3&limit=10');

    expect(
      await screen.findByRole('heading', { name: 'На этой странице пусто' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'На предыдущую страницу' }),
    ).toBeEnabled();
  });

  it.each([
    {
      name: 'невалидный ответ',
      response: () => HttpResponse.json({ response: { status: 'ok' } }),
      description:
        'Ответ сервера не соответствует ожидаемому формату. Попробуйте ещё раз позже.',
    },
    {
      name: 'сетевую ошибку',
      response: () => HttpResponse.error(),
      description:
        'Не удалось загрузить новости. Проверьте подключение и повторите попытку.',
    },
  ])(
    'показывает понятное состояние для: $name',
    async ({ response, description }) => {
      server.use(http.get('*/guardian-api/search', response));
      renderRouter('/posts?page=1&limit=10');

      expect(await screen.findByText(description)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Повторить запрос' }),
      ).toBeEnabled();
    },
  );

  it('показывает страницу для неизвестного адреса', () => {
    renderRouter('/неизвестный-раздел');

    expect(
      screen.getByRole('heading', { name: 'Страница не найдена' }),
    ).toBeInTheDocument();
  });
});
