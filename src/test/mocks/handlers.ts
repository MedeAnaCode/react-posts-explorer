import { http, HttpResponse } from 'msw';

export const mockPosts = Array.from({ length: 20 }, (_, index) => {
  const number = index + 1;

  return {
    id: `world/2026/sep/${String(number).padStart(2, '0')}/test-news-${number}`,
    webTitle: `Тестовая новость ${number}`,
    sectionName: index % 2 === 0 ? 'World news' : 'Technology',
    webPublicationDate: `2026-09-${String(number).padStart(2, '0')}T10:00:00Z`,
    webUrl: `https://www.theguardian.com/world/2026/sep/${String(number).padStart(2, '0')}/test-news-${number}`,
    fields: {
      byline: `Автор ${number}`,
      bodyText: `Полный текст тестовой новости ${number}.`,
      thumbnail: `https://media.guim.co.uk/test-news-${number}.jpg`,
    },
  };
});

function guardianResponse<T>(response: T) {
  return { response };
}

export const handlers = [
  http.get('*/guardian-api/search', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('page-size') ?? 10);
    const start = (page - 1) * pageSize;

    return HttpResponse.json(
      guardianResponse({
        status: 'ok',
        userTier: 'developer',
        total: mockPosts.length,
        startIndex: start + 1,
        pageSize,
        currentPage: page,
        pages: Math.ceil(mockPosts.length / pageSize),
        orderBy: 'newest',
        results: mockPosts.slice(start, start + pageSize),
      }),
    );
  }),
  http.get(/\/guardian-api\/.+/, ({ request }) => {
    const url = new URL(request.url);
    const encodedId = url.pathname.split('/guardian-api/')[1] ?? '';
    const postId = decodeURIComponent(encodedId);
    const post = mockPosts.find((item) => item.id === postId);

    return post
      ? HttpResponse.json(
          guardianResponse({
            status: 'ok',
            userTier: 'developer',
            total: 1,
            content: post,
          }),
        )
      : HttpResponse.json(
          guardianResponse({ status: 'error', message: 'Not found' }),
          { status: 404 },
        );
  }),
];
