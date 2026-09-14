import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
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

  render(
    <QueryClientProvider client={queryClient}>
      <AppRouter />
    </QueryClientProvider>,
  );
  return queryClient;
}

function listResponse(results = mockPosts.slice(0, 10), total = 20) {
  return { response: { status: 'ok', total, results } };
}

describe('маршрутизация приложения', () => {
  it('перенаправляет с главной страницы к списку новостей', async () => {
    renderRouter('/');

    expect(
      await screen.findByText('Независимый обзор материалов The Guardian'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Последние новости' }),
    ).not.toBeInTheDocument();
    expect(window.location.search).toBe('?page=1&limit=10');
  });

  it('нормализует невалидные параметры списка', async () => {
    renderRouter('/posts?page=-5&limit=99');

    await screen.findByText('Тестовая новость 1');
    expect(window.location.search).toBe('?page=1&limit=10');
  });

  it('сбрасывает вторую страницу при смене лимита и запрашивает новые данные', async () => {
    const user = userEvent.setup();
    const requests: URL[] = [];
    server.use(
      http.get('*/guardian-api/search', ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        const page = Number(url.searchParams.get('page'));
        const limit = Number(url.searchParams.get('page-size'));
        return HttpResponse.json(
          listResponse(mockPosts.slice((page - 1) * limit, page * limit)),
        );
      }),
    );
    renderRouter('/posts?page=2&limit=10');
    await screen.findByText('Тестовая новость 11');
    expect(screen.queryByText('Тестовая новость 1')).not.toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole('combobox', {
        name: 'Количество новостей на странице',
      }),
      '20',
    );
    expect(window.location.search).toBe('?page=1&limit=20');
    expect(await screen.findByText('Тестовая новость 1')).toBeInTheDocument();
    expect(screen.getByText('Тестовая новость 20')).toBeInTheDocument();
    expect(
      requests.map((url) => [
        url.searchParams.get('page'),
        url.searchParams.get('page-size'),
      ]),
    ).toEqual([
      ['2', '10'],
      ['1', '20'],
    ]);
  });

  it('переключает страницы вперёд и назад вместе с URL и данными', async () => {
    const user = userEvent.setup();
    const pages: string[] = [];
    server.use(
      http.get('*/guardian-api/search', ({ request }) => {
        const page = new URL(request.url).searchParams.get('page')!;
        pages.push(page);
        return HttpResponse.json(
          listResponse(
            mockPosts.slice((Number(page) - 1) * 10, Number(page) * 10),
          ),
        );
      }),
    );
    renderRouter('/posts?page=1&limit=10');
    await screen.findByText('Тестовая новость 1');
    expect(
      screen.getByRole('button', { name: 'Перейти на предыдущую страницу' }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole('button', { name: 'Перейти на следующую страницу' }),
    );
    await screen.findByText('Тестовая новость 11');
    expect(window.location.search).toBe('?page=2&limit=10');
    expect(screen.queryByText('Тестовая новость 1')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Перейти на следующую страницу' }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole('button', { name: 'Перейти на предыдущую страницу' }),
    );
    await screen.findByText('Тестовая новость 1');
    expect(window.location.search).toBe('?page=1&limit=10');
    expect(pages).toContain('2');
    expect(pages[0]).toBe('1');
  });

  it.each([
    '/posts?page=1&limit=10',
    `/posts/${encodeURIComponent(mockPosts[0].id)}`,
  ])('показывает загрузку до ответа API: %s', async (path) => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get('*/guardian-api/*', async () => {
        await pending;
        return HttpResponse.json(
          path.includes('?page')
            ? listResponse()
            : { response: { status: 'ok', content: mockPosts[0] } },
        );
      }),
    );
    renderRouter(path);
    expect(
      screen.getByRole('heading', {
        name: /Собираем новости|Открываем новость/,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Тестовая новость 1')).not.toBeInTheDocument();
    release();
    expect(
      await screen.findByRole('heading', { name: 'Тестовая новость 1' }),
    ).toBeInTheDocument();
  });

  it.each(['page', 'limit'])(
    'сохраняет контекст старых карточек во время изменения %s',
    async (change) => {
      const user = userEvent.setup();
      renderRouter('/posts?page=2&limit=10');
      await screen.findByText('Тестовая новость 11');
      let release!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      server.use(
        http.get('*/guardian-api/search', async () => {
          await pending;
          return HttpResponse.json(listResponse());
        }),
      );
      if (change === 'page') {
        await user.click(
          screen.getByRole('button', {
            name: 'Перейти на предыдущую страницу',
          }),
        );
      } else {
        await user.selectOptions(screen.getByRole('combobox'), '20');
      }
      const oldLink = screen.getAllByRole('link', {
        name: /Читать полностью/,
      })[0];
      expect(oldLink).toHaveAttribute(
        'href',
        `/posts/${encodeURIComponent(mockPosts[10].id)}?page=2&limit=10`,
      );
      expect(screen.getByText('Страница 2 из 2')).toBeInTheDocument();
      release();
      await screen.findByText('Тестовая новость 1');
    },
  );

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

  it('позволяет вернуться с пустой страницы к первой', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('*/guardian-api/search', ({ request }) =>
        HttpResponse.json(
          listResponse(
            new URL(request.url).searchParams.get('page') === '1'
              ? mockPosts.slice(0, 10)
              : [],
            20,
          ),
        ),
      ),
    );
    renderRouter('/posts?page=3&limit=10');

    expect(
      await screen.findByRole('heading', { name: 'На этой странице пусто' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'На первую страницу' }),
    ).toBeEnabled();
    await user.click(
      screen.getByRole('button', { name: 'На первую страницу' }),
    );
    await screen.findByText('Тестовая новость 1');
    expect(window.location.search).toBe('?page=1&limit=10');
  });

  it.each([
    { name: 'сетевая ошибка', response: () => HttpResponse.error() },
    {
      name: 'невалидный ответ',
      response: () => HttpResponse.json({ response: { status: 'ok' } }),
    },
  ])('позволяет повторить запрос детали: $name', async ({ response }) => {
    const user = userEvent.setup();
    let failed = true;
    server.use(
      http.get(/\/guardian-api\/.+/, () =>
        failed
          ? response()
          : HttpResponse.json({
              response: { status: 'ok', content: mockPosts[0] },
            }),
      ),
    );
    renderRouter(`/posts/${encodeURIComponent(mockPosts[0].id)}`);
    await screen.findByRole('heading', { name: 'Не получилось открыть' });
    failed = false;
    await user.click(screen.getByRole('button', { name: 'Повторить запрос' }));
    expect(
      await screen.findByText(mockPosts[0].fields.bodyText),
    ).toBeInTheDocument();
  });

  it.each([
    { name: 'список', path: '/posts?page=1&limit=10', status: 500 },
    {
      name: 'деталь',
      path: `/posts/${encodeURIComponent(mockPosts[0].id)}`,
      status: 500,
    },
    {
      name: 'деталь при 404',
      path: `/posts/${encodeURIComponent(mockPosts[0].id)}`,
      status: 404,
    },
  ])(
    'сохраняет данные при ошибке фонового обновления: $name',
    async ({ path, status }) => {
      const user = userEvent.setup();
      const client = renderRouter(path);
      await screen.findByRole('heading', { name: mockPosts[0].webTitle });
      server.use(
        http.get('*/guardian-api/*', () => HttpResponse.json({}, { status })),
      );
      await act(async () => {
        await client.invalidateQueries();
      });
      expect(
        screen.getByRole('heading', { name: mockPosts[0].webTitle }),
      ).toBeInTheDocument();
      expect(
        await screen.findByText(/Не удалось обновить данные\./),
      ).toBeInTheDocument();
      server.resetHandlers();
      await user.click(
        screen.getByRole('button', { name: 'Повторить запрос' }),
      );
      await waitFor(() => expect(client.isFetching()).toBe(0));
      await waitFor(() =>
        expect(
          screen.queryByText(/Не удалось обновить данные\./),
        ).not.toBeInTheDocument(),
      );
    },
  );

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
        'Не удалось загрузить данные. Проверьте подключение и повторите попытку.',
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

  it('возвращает на первую страницу после отклонения номера страницы API', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('*/guardian-api/search', ({ request }) =>
        new URL(request.url).searchParams.get('page') === '1'
          ? HttpResponse.json(listResponse())
          : HttpResponse.json({}, { status: 400 }),
      ),
    );
    renderRouter('/posts?page=999&limit=10');
    await user.click(
      await screen.findByRole('button', { name: 'На первую страницу' }),
    );
    await screen.findByText('Тестовая новость 1');
    expect(window.location.search).toBe('?page=1&limit=10');
  });

  it('показывает русские fallback-тексты без необязательных полей новости', async () => {
    const user = userEvent.setup();
    const post = { ...mockPosts[0], fields: undefined };
    server.use(
      http.get('*/guardian-api/*', ({ request }) =>
        HttpResponse.json({
          response: new URL(request.url).pathname.endsWith('/search')
            ? { status: 'ok', total: 1, results: [post] }
            : { status: 'ok', content: post },
        }),
      ),
    );
    renderRouter('/posts?page=1&limit=10');
    const summary = await screen.findByText(
      'Полный текст доступен на странице новости.',
    );
    expect(summary).toHaveAttribute('lang', 'ru');
    expect(
      screen.getByRole('heading', { name: post.webTitle }),
    ).toHaveAttribute('lang', 'en');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /Читать полностью/ }));
    const body = await screen.findByText(
      'Полный текст этой новости недоступен в API.',
    );
    expect(body).toHaveAttribute('lang', 'ru');
    expect(
      screen.getByRole('link', { name: /Открыть оригинал на The Guardian/ }),
    ).toHaveAttribute('href', post.webUrl);
  });
});
