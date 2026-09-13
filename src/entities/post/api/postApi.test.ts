import { http, HttpResponse } from 'msw';

import { ApiError } from '../../../shared/api';
import { server } from '../../../test/mocks/server';
import { mockPosts } from '../../../test/mocks/handlers';
import { getPost, getPosts } from './postApi';

describe('API публикаций', () => {
  it('нормализует несколько завершающих слешей базового URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://jsonplaceholder.typicode.com///');
    let requestedUrl = '';
    server.use(
      http.get('*', ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json(mockPosts[0]);
      }),
    );

    await getPost(1);

    expect(requestedUrl).toBe('https://jsonplaceholder.typicode.com/posts/1');
    vi.unstubAllEnvs();
  });

  it('передаёт пагинацию и читает общее количество', async () => {
    let requestedUrl = '';
    server.use(
      http.get('https://jsonplaceholder.typicode.com/posts', ({ request }) => {
        requestedUrl = request.url;
        return HttpResponse.json(mockPosts.slice(0, 10), {
          headers: { 'X-Total-Count': '42' },
        });
      }),
    );

    const result = await getPosts({ page: 2, limit: 10 });

    expect(requestedUrl).toContain('_page=2');
    expect(requestedUrl).toContain('_limit=10');
    expect(result).toMatchObject({ totalCount: 42 });
  });

  it('возвращает null, если сервер не сообщает общее количество', async () => {
    server.use(
      http.get('https://jsonplaceholder.typicode.com/posts', () =>
        HttpResponse.json(mockPosts.slice(0, 10)),
      ),
    );

    await expect(getPosts({ page: 1, limit: 10 })).resolves.toMatchObject({
      totalCount: null,
    });
  });

  it.each(['invalid', '-1', '9007199254740992'])(
    'игнорирует некорректный X-Total-Count: %s',
    async (totalCount) => {
      server.use(
        http.get('https://jsonplaceholder.typicode.com/posts', () =>
          HttpResponse.json(mockPosts.slice(0, 10), {
            headers: { 'X-Total-Count': totalCount },
          }),
        ),
      );

      await expect(getPosts({ page: 1, limit: 10 })).resolves.toMatchObject({
        totalCount: null,
      });
    },
  );

  it('преобразует ошибку схемы в типизированную ошибку', async () => {
    server.use(
      http.get('https://jsonplaceholder.typicode.com/posts/1', () =>
        HttpResponse.json({ id: 'не число' }),
      ),
    );

    await expect(getPost(1)).rejects.toMatchObject<Partial<ApiError>>({
      kind: 'validation',
    });
  });
});
