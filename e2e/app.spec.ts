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

test('заполняет grid без пустых ячеек для 10 и 20 новостей на всех брейкпоинтах', async ({
  page,
}) => {
  const viewports = [320, 375, 768, 1024, 1440];

  for (const width of viewports) {
    for (const limit of [10, 20]) {
      await test.step(`${width}px, ${limit} новостей`, async () => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/posts?page=1&limit=${limit}`);
        await expect(page.locator('main ol > li')).toHaveCount(limit);

        const layout = JSON.parse(
          await page.evaluate(`(() => {
            const grid = document.querySelector('main ol');
            if (!grid) throw new Error('Grid не найден');
            const style = getComputedStyle(grid);
            const columns = Array.from(
              style.gridTemplateColumns.matchAll(/([\\d.]+)px/g),
              (match) => Number(match[1]),
            );
            const gap = Number.parseFloat(style.columnGap);
            const gridLeft = grid.getBoundingClientRect().left;
            const starts = columns.reduce((result, _, index) => {
              const previous = result[index - 1];
              result.push(index === 0 ? gridLeft : previous + columns[index - 1] + gap);
              return result;
            }, []);
            const rows = new Map();

            for (const item of Array.from(grid.children)) {
              const rect = item.getBoundingClientRect();
              const row = Math.round(rect.top);
              const rowCells = rows.get(row) ?? {
                cells: Array(columns.length).fill(false),
                ranges: [],
              };
              const start = starts.findIndex((left) => Math.abs(rect.left - left) < 1);
              let end = -1;
              for (let index = columns.length - 1; index >= 0; index -= 1) {
                if (Math.abs(rect.right - (starts[index] + columns[index])) < 1) {
                  end = index;
                  break;
                }
              }

              if (start < 0 || end < start) {
                throw new Error('Не удалось определить положение карточки в grid');
              }
              rowCells.cells.fill(true, start, end + 1);
              rowCells.ranges.push({ start, end });
              rows.set(row, rowCells);
            }

            return JSON.stringify({
              columns: columns.length,
              rows: Array.from(rows.entries())
                .sort(([first], [second]) => first - second)
                .map(([, row]) => row),
              noHorizontalScroll: document.documentElement.scrollWidth <= window.innerWidth,
            });
          })()`),
        ) as {
          columns: number;
          rows: Array<{
            cells: boolean[];
            ranges: Array<{ start: number; end: number }>;
          }>;
          noHorizontalScroll: boolean;
        };

        expect(layout.columns).toBe(width < 672 ? 1 : width < 992 ? 2 : 4);
        const expectedRows =
          layout.columns === 1
            ? limit
            : layout.columns === 2
              ? limit === 10
                ? 6
                : 11
              : limit === 10
                ? 3
                : 6;
        expect(layout.rows).toHaveLength(expectedRows);
        for (const row of layout.rows) {
          expect(row.cells).toEqual(Array(layout.columns).fill(true));
          expect(row.ranges[0]?.start).toBe(0);
          expect(row.ranges.at(-1)?.end).toBe(layout.columns - 1);
          for (let index = 1; index < row.ranges.length; index += 1) {
            expect(row.ranges[index].start).toBe(row.ranges[index - 1].end + 1);
          }
        }
        expect(layout.noHorizontalScroll).toBe(true);
      });
    }
  }
});
