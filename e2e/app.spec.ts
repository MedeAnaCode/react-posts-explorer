import { expect, test } from '@playwright/test';

const news = [
  {
    id: 'world/2026/sep/13/guardian-test-news',
    webTitle: 'Детерминированная тестовая новость',
    sectionName: 'World news',
    webPublicationDate: '2026-09-13T09:30:00Z',
    webUrl: 'https://www.theguardian.com/world/2026/sep/13/guardian-test-news',
    fields: {
      byline: 'Test Reporter',
      bodyText: 'Полный текст новости из перехваченного ответа Guardian API.',
      thumbnail: 'https://media.guim.co.uk/guardian-test-news.jpg',
    },
  },
  {
    id: 'technology/2026/sep/12/second-test-news',
    webTitle: 'Вторая тестовая новость',
    sectionName: 'Technology',
    webPublicationDate: '2026-09-12T08:00:00Z',
    webUrl:
      'https://www.theguardian.com/technology/2026/sep/12/second-test-news',
    fields: {
      byline: 'Second Reporter',
      bodyText: 'Текст второй тестовой новости.',
      thumbnail: 'https://media.guim.co.uk/second-test-news.jpg',
    },
  },
];

test.beforeEach(async ({ page }) => {
  await page.route('**/guardian-api/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname.endsWith('/guardian-api/search')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          response: {
            status: 'ok',
            userTier: 'developer',
            total: news.length,
            startIndex: 1,
            pageSize: 10,
            currentPage: 1,
            pages: 1,
            orderBy: 'newest',
            results: news,
          },
        }),
      });
      return;
    }

    const encodedId = url.pathname.split('/guardian-api/')[1] ?? '';
    const post = news.find((item) => item.id === decodeURIComponent(encodedId));

    await route.fulfill({
      status: post ? 200 : 404,
      contentType: 'application/json',
      body: JSON.stringify({
        response: post
          ? { status: 'ok', userTier: 'developer', content: post }
          : { status: 'error', message: 'Not found' },
      }),
    });
  });
});

test('показывает каталог Guardian и открывает выбранную новость', async ({
  page,
}) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Последние новости' }),
  ).toBeVisible();
  await expect(page.getByText(news[0].webTitle)).toBeVisible();
  await expect(page.getByText(news[0].fields.byline)).toBeVisible();

  await page
    .getByRole('link', { name: /Читать полностью/ })
    .first()
    .click();

  await expect(page).toHaveURL(
    new RegExp(`/posts/${encodeURIComponent(news[0].id)}`),
  );
  await expect(
    page.getByRole('heading', { name: news[0].webTitle }),
  ).toBeVisible();
  await expect(page.getByText(news[0].fields.bodyText)).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Открыть оригинал на The Guardian/ }),
  ).toHaveAttribute('href', news[0].webUrl);
});
