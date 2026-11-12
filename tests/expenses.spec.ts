import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

test('expense page separates line items, reserves allowance once and flags exceptions', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'Expenses', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Expenses', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Expenses', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('region', { name: 'What changes for the customer' })).toContainText('committed spend');
  await expect(page.getByRole('region', { name: 'Pilot scorecard' })).toContainText('about 13 staff hours per month');
  await expect(page.getByRole('link', { name: 'Product requirements', exact: true })).toHaveAttribute('href', /expense-requirements\.md$/);
  await page.getByRole('button', { name: 'Try sample receipt' }).click();
  await expect(page.locator('.expense-line').filter({ hasText: 'Cordless drill' })).toContainText('Eligible');
  await expect(page.locator('.expense-line').filter({ hasText: 'Chocolate bar' })).toContainText('Excluded');
  await page.getByRole('button', { name: 'Confirm and submit' }).click();
  await expect(page.getByRole('status')).toContainText('€89.90 reserved');
  await expect(page.getByRole('complementary', { name: 'Monthly allowance' })).toContainText('€90.10 left');

  await page.getByRole('button', { name: 'Try sample receipt' }).click();
  await expect(page.getByRole('alert')).toContainText('already submitted');
  await expect(page.getByRole('button', { name: 'Confirm and submit' })).toBeDisabled();

  await page.getByRole('button', { name: 'Try flagged sample' }).click();
  await expect(page.getByText('AI-source marker found')).toBeVisible();
  await expect(page.getByText(/Outside the example/)).toBeVisible();
  await expect(page.getByText(/exceed the remaining monthly allowance/)).toBeVisible();
  await page.getByRole('button', { name: 'Send for review' }).click();
  await expect(page.getByRole('status')).toContainText('allowance is unchanged');
});

test('uploaded receipt uses real local OCR and reports the explicit image marker', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const external: string[] = [];
  await page.goto('./expenses/');
  const origin = new URL(page.url()).origin;
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.protocol.startsWith('http') && url.origin !== origin) external.push(url.href);
  });
  await page.getByLabel('Choose receipt image').setInputFiles(fileURLToPath(new URL('../public/receipts/flagged-shop.png', import.meta.url)));
  await expect(page.getByRole('heading', { name: 'Harbor Hardware', exact: false })).toBeVisible({ timeout: 35_000 });
  await expect(page.locator('.expense-line').filter({ hasText: /cordless drill/i })).toContainText('€199.90');
  await expect(page.locator('.expense-line').filter({ hasText: /chocolate bar/i })).toContainText('Excluded');
  await expect(page.getByText('AI-source marker found')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send for review' })).toBeEnabled();
  expect(external).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath('expenses-mobile.png'), fullPage: true });
});

test('expense architecture slide is published with a mobile alternative', async ({ page, request }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./expenses/');
  await page.getByRole('button', { name: 'Try sample receipt' }).click();
  const link = page.getByRole('link', { name: 'Open architecture slide' });
  const response = await request.get((await link.getAttribute('href'))!);
  expect(response.ok()).toBeTruthy();
  expect(response.headers()['content-type']).toContain('image/svg+xml');
  expect(await response.text()).toContain('Receipt processing on Azure');
  const slide = page.locator('.expense-slide img');
  await slide.scrollIntoViewIfNeeded();
  await expect.poll(() => slide.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1120);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: testInfo.outputPath('expenses-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 320, height: 760 });
  await expect(page.getByText('Mobile React → Go API → private Azure Blob')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
