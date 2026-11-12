import { expect, test } from '@playwright/test';

test('public feed preview stays honest about server-side inference and fits a phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.route('https://volcanoes.usgs.gov/**', route => route.abort());
  await page.goto('./');
  await page.getByRole('link', { name: 'Live feed', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Live feed analysis' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start analysis' })).toBeDisabled();
  await expect(page.getByRole('link', { name: /Run locally with Ollama or LiteLLM/ })).toHaveAttribute('href', /#run-the-live-demo$/);
  await expect(page.getByRole('img', { name: /USGS Kīlauea/ })).toHaveAttribute('src', /^https:\/\/volcanoes\.usgs\.gov\//);
  await expect(page.getByRole('list', { name: 'Model observations' }).getByRole('listitem')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
