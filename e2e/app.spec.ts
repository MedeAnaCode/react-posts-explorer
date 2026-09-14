import { expect, test } from '@playwright/test';

const news = Array.from({ length: 25 }, (_, index) => ({
  id: `world/2026/sep/13/test-news-${index + 1}`,
  webTitle: `Guardian test article ${index + 1}`,
  sectionName: 'World news',
  webPublicationDate: '2026-09-13T09:30:00Z',
  webUrl: `https://www.theguardian.com/world/2026/sep/13/test-news-${index + 1}`,
  fields: {
    byline: `Reporter ${index + 1}`,
    trailText: `<p>Short summary for article ${index + 1} &amp; its context.</p>`,
    bodyText: `Full text of Guardian article ${index + 1}.`,
    thumbnail: 'https://media.guim.co.uk/test-image.svg',
  },
}));

test.beforeEach(async ({ page }) => {
  await page.route('https://media.guim.co.uk/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#dde5ec"/></svg>',
    }),
  );
  await page.route('**/guardian-api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/guardian-api/search')) {
      const currentPage = Number(url.searchParams.get('page') ?? 1);
      const pageSize = Number(url.searchParams.get('page-size') ?? 10);
      const start = (currentPage - 1) * pageSize;
      await route.fulfill({
        json: {
          response: {
            status: 'ok',
            total: news.length,
            currentPage,
            pageSize,
            results: news.slice(start, start + pageSize),
          },
        },
      });
      return;
    }
    const id = decodeURIComponent(
      url.pathname.split('/guardian-api/')[1] ?? '',
    );
    const post = news.find((item) => item.id === id);
    await route.fulfill({
      status: post ? 200 : 404,
      json: {
        response: post
          ? { status: 'ok', content: post }
          : { status: 'error', message: 'Not found' },
      },
    });
  });
});

test('открывает каталог, короткий анонс и выбранную новость', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/posts\?page=1&limit=10$/);
  await expect(
    page.getByRole('heading', { name: 'Последние новости' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: news[0].webTitle, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Short summary for article 1 & its context.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(news[0].fields.bodyText, { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('link', { name: /Читать полностью/ })
    .first()
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/posts/${encodeURIComponent(news[0].id)}\\?page=1&limit=10$`),
  );
  await expect(
    page.getByRole('heading', { name: news[0].webTitle, exact: true }),
  ).toBeVisible();
  await expect(page.getByText(news[0].fields.bodyText)).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Открыть оригинал на The Guardian/ }),
  ).toHaveAttribute('href', news[0].webUrl);
});

test('пагинация, лимит и история браузера сохраняют URL и список', async ({
  page,
}) => {
  await page.goto('/posts?page=1&limit=10');
  await expect(
    page.getByRole('button', { name: 'Перейти на предыдущую страницу' }),
  ).toBeDisabled();
  const request = page.waitForRequest(
    (req) =>
      req.url().includes('/guardian-api/search') &&
      new URL(req.url()).searchParams.get('page') === '2',
  );
  await page
    .getByRole('button', { name: 'Перейти на следующую страницу' })
    .click();
  expect(new URL((await request).url()).searchParams.get('page-size')).toBe(
    '10',
  );
  await expect(page).toHaveURL(/\?page=2&limit=10$/);
  await expect(
    page.getByRole('heading', { name: news[10].webTitle, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: news[0].webTitle, exact: true }),
  ).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\?page=1&limit=10$/);
  await expect(
    page.getByRole('heading', { name: news[0].webTitle, exact: true }),
  ).toBeVisible();
  await page.goForward();
  await expect(
    page.getByRole('heading', { name: news[10].webTitle, exact: true }),
  ).toBeVisible();
  const limitRequest = page.waitForRequest(
    (req) =>
      req.url().includes('/guardian-api/search') &&
      new URL(req.url()).searchParams.get('page-size') === '20',
  );
  await page
    .getByRole('combobox', { name: 'Количество новостей на странице' })
    .selectOption('20');
  expect(new URL((await limitRequest).url()).searchParams.get('page')).toBe(
    '1',
  );
  await expect(page).toHaveURL(/\?page=1&limit=20$/);
  await expect(page.locator('main ol > li')).toHaveCount(20);
  await page
    .getByRole('button', { name: 'Перейти на следующую страницу' })
    .click();
  await expect(page.locator('main ol > li')).toHaveCount(5);
  await expect(
    page.getByRole('button', { name: 'Перейти на следующую страницу' }),
  ).toBeDisabled();
  await page
    .getByRole('button', { name: 'Перейти на предыдущую страницу' })
    .click();
  await expect(page).toHaveURL(/\?page=1&limit=20$/);
  await expect(page.locator('main ol > li')).toHaveCount(20);
});

test('прямая ссылка и перезагрузка детали сохраняют страницу возврата', async ({
  page,
}) => {
  await page.goto(`/posts/${encodeURIComponent(news[10].id)}?page=2&limit=10`);
  await expect(page.getByText(news[10].fields.bodyText)).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: news[10].webTitle, exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Вернуться к списку' }).click();
  await expect(page).toHaveURL(/\/posts\?page=2&limit=10$/);
  await expect(
    page.getByRole('heading', { name: news[10].webTitle, exact: true }),
  ).toBeVisible();
});

test('показывает загрузку и сохраняет контекст карточек до нового ответа', async ({
  page,
}) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/guardian-api/search?**', async (route) => {
    await pending;
    await route.fallback();
  });
  await page.goto('/posts?page=1&limit=10');
  await expect(
    page.getByRole('heading', { name: 'Собираем новости' }),
  ).toBeVisible();
  release();
  await expect(
    page.getByRole('heading', { name: news[0].webTitle, exact: true }),
  ).toBeVisible();
  let releaseNext!: () => void;
  const next = new Promise<void>((resolve) => {
    releaseNext = resolve;
  });
  await page.route('**/guardian-api/search?**', async (route) => {
    await next;
    await route.fallback();
  });
  await page
    .getByRole('button', { name: 'Перейти на следующую страницу' })
    .click();
  await expect(page).toHaveURL(/\?page=2&limit=10$/);
  await expect(
    page.getByRole('link', { name: /Читать полностью/ }).first(),
  ).toHaveAttribute(
    'href',
    `/posts/${encodeURIComponent(news[0].id)}?page=1&limit=10`,
  );
  await expect(page.getByText('Страница 1 из 3')).toBeVisible();
  releaseNext();
  await expect(
    page.getByRole('heading', { name: news[10].webTitle, exact: true }),
  ).toBeVisible();
});

test('восстанавливает список после ошибки и пустой страницы', async ({
  page,
}) => {
  let fail = true;
  await page.route('**/guardian-api/search?**', async (route) => {
    if (fail) await route.fulfill({ status: 500, json: {} });
    else await route.fallback();
  });
  await page.goto('/posts?page=1&limit=10');
  await expect(
    page.getByRole('heading', { name: 'Не получилось загрузить' }),
  ).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Повторить запрос' }).click();
  await expect(
    page.getByRole('heading', { name: news[0].webTitle, exact: true }),
  ).toBeVisible();
  await page.goto('/posts?page=9&limit=10');
  await expect(
    page.getByRole('heading', { name: 'На этой странице пусто' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'На первую страницу' }).click();
  await expect(page).toHaveURL(/\?page=1&limit=10$/);
  await expect(
    page.getByRole('heading', { name: news[0].webTitle, exact: true }),
  ).toBeVisible();
});

test('показывает 404 для новости и неизвестного маршрута', async ({ page }) => {
  await page.goto('/posts/world%2Fmissing?page=2&limit=10');
  await expect(
    page.getByRole('heading', { name: 'Новость не найдена' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Вернуться к списку' }),
  ).toHaveAttribute('href', '/posts?page=2&limit=10');
  await page.goto('/unknown');
  await expect(
    page.getByRole('heading', { name: 'Страница не найдена' }),
  ).toBeVisible();
});

test('управляется клавиатурой и не создаёт горизонтальную прокрутку', async ({
  page,
}) => {
  await page.goto('/posts?page=1&limit=10');
  const selector = page.getByRole('combobox', {
    name: 'Количество новостей на странице',
  });
  const firstLink = page
    .getByRole('link', { name: /Читать полностью/ })
    .first();
  await expect(firstLink).toBeVisible();
  await selector.focus();
  await expect(selector).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(firstLink).toBeFocused();
  expect(
    await page.evaluate<boolean>(
      'document.documentElement.scrollWidth <= window.innerWidth',
    ),
  ).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.getByText(news[0].fields.bodyText)).toBeVisible();
  expect(
    await page.evaluate<boolean>(
      'document.documentElement.scrollWidth <= window.innerWidth',
    ),
  ).toBe(true);
});
