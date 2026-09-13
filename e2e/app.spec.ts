import { expect, test } from '@playwright/test';

test('открывает каталог публикаций', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Список постов' }),
  ).toBeVisible();
});
