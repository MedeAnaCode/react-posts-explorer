import { http, HttpResponse } from 'msw';

export const mockPosts = Array.from({ length: 20 }, (_, index) => ({
  userId: Math.floor(index / 10) + 1,
  id: index + 1,
  title: `Тестовая публикация ${index + 1}`,
  body: `Полный текст тестовой публикации ${index + 1}.`,
}));

export const handlers = [
  http.get('https://jsonplaceholder.typicode.com/posts', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('_page') ?? 1);
    const limit = Number(url.searchParams.get('_limit') ?? 10);
    const start = (page - 1) * limit;

    return HttpResponse.json(mockPosts.slice(start, start + limit), {
      headers: { 'X-Total-Count': String(mockPosts.length) },
    });
  }),
  http.get(
    'https://jsonplaceholder.typicode.com/posts/:postId',
    ({ params }) => {
      const post = mockPosts.find((item) => item.id === Number(params.postId));

      return post
        ? HttpResponse.json(post)
        : HttpResponse.json({ message: 'Not found' }, { status: 404 });
    },
  ),
];
