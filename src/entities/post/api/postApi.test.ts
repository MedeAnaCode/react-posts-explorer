import { http, HttpResponse } from 'msw';

import { ApiError } from '../../../shared/api';
import { mockPosts } from '../../../test/mocks/handlers';
import { server } from '../../../test/mocks/server';
import { getPost, getPosts } from './postApi';

describe('API новостей The Guardian', () => {
  it('сохраняет строковый Guardian id со слешами в запросе новости', async () => {
    let requestedUrl = '';
    server.use(
      http.get('*', ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          response: { status: 'ok', content: mockPosts[0] },
        });
      }),
    );

    await getPost(mockPosts[0].id);

    const url = new URL(requestedUrl);
    expect(url.pathname).toBe(`/guardian-api/${mockPosts[0].id}`);
    expect(url.searchParams.get('show-fields')).toBe(
      'byline,bodyText,thumbnail',
    );
  });

  it('передаёт Guardian-пагинацию и читает response.total', async () => {
    let requestedUrl = '';
    server.use(
      http.get('*/guardian-api/search', ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json({
          response: {
            status: 'ok',
            total: 42,
            results: mockPosts.slice(0, 10),
          },
        });
      }),
    );

    const result = await getPosts({ page: 2, limit: 10 });
    const url = new URL(requestedUrl);

    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('page-size')).toBe('10');
    expect(url.searchParams.get('order-by')).toBe('newest');
    expect(url.searchParams.get('show-fields')).toBe(
      'byline,bodyText,thumbnail',
    );
    expect(result).toMatchObject({ totalCount: 42 });
  });

  it('извлекает список из response.results', async () => {
    const result = await getPosts({ page: 1, limit: 10 });

    expect(result.posts).toHaveLength(10);
    expect(result.posts[0]).toMatchObject({
      id: 'world/2026/sep/01/test-news-1',
      webTitle: 'Тестовая новость 1',
      sectionName: 'World news',
      webPublicationDate: '2026-09-01T10:00:00Z',
      fields: {
        byline: 'Автор 1',
        bodyText: 'Полный текст тестовой новости 1.',
        thumbnail: 'https://media.guim.co.uk/test-news-1.jpg',
      },
    });
  });

  it('извлекает отдельную новость из response.content', async () => {
    await expect(getPost(mockPosts[0].id)).resolves.toEqual(mockPosts[0]);
  });

  it('нормализует пустые опциональные Guardian fields', async () => {
    server.use(
      http.get('*/guardian-api/search', () =>
        HttpResponse.json({
          response: {
            status: 'ok',
            total: 1,
            results: [
              {
                ...mockPosts[0],
                fields: { byline: ' ', bodyText: '', thumbnail: '' },
              },
            ],
          },
        }),
      ),
    );

    const result = await getPosts({ page: 1, limit: 10 });

    expect(result.posts[0].fields).toEqual({
      byline: undefined,
      bodyText: undefined,
      thumbnail: undefined,
    });
  });

  it('отклоняет небезопасный Guardian id до сетевого запроса', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(getPost('world/../escape')).rejects.toMatchObject<
      Partial<ApiError>
    >({ kind: 'validation' });
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it.each([
    {
      name: 'списка без response.results',
      url: '*/guardian-api/search',
      response: { response: { status: 'ok', total: 1 } },
      request: () => getPosts({ page: 1, limit: 10 }),
    },
    {
      name: 'детали без response.content',
      url: /\/guardian-api\/.+/,
      response: { response: { status: 'ok', total: 1 } },
      request: () => getPost(mockPosts[0].id),
    },
    {
      name: 'списка с небезопасным webUrl',
      url: '*/guardian-api/search',
      response: {
        response: {
          status: 'ok',
          total: 1,
          results: [{ ...mockPosts[0], webUrl: 'javascript:alert(1)' }],
        },
      },
      request: () => getPosts({ page: 1, limit: 10 }),
    },
  ])(
    'преобразует неверный Guardian-ответ $name в ApiError',
    async (testCase) => {
      server.use(
        http.get(testCase.url, () => HttpResponse.json(testCase.response)),
      );

      await expect(testCase.request()).rejects.toMatchObject<Partial<ApiError>>(
        { kind: 'validation' },
      );
    },
  );
});
