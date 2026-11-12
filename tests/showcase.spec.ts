import { test, expect } from '@playwright/test';

test('pilot accuracy target defines the pre-edit daily comparison', async ({ page }) => {
  await page.goto('./');
  const target = page.getByRole('complementary', { name: 'Pilot accuracy target' });
  await expect(target).toContainText('≤30 minutes');
  await expect(target).toContainText('approved total for the same worker and day');
  await expect(target).toContainText('25 minutes of error');
  await expect(page.getByRole('region', { name: 'What changes for the customer' })).toContainText('Payroll and billing');
  await expect(page.getByRole('region', { name: 'Pilot scorecard' })).toContainText('50 staff hours per month');
  await expect(page.getByRole('link', { name: 'Product requirements', exact: true })).toHaveAttribute('href', /timesheet-requirements\.md$/);
});

test.describe('Mobile worker confirmation', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('worker correction moves through manager exceptions and approval', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('link', { name: 'Explore the demo' }).click();
    await page.getByRole('switch', { name: /camera evidence/i }).click();
    await page.getByRole('button', { name: /waiting for site clearance/i }).click();
    await expect(page.getByText(/anonymous inbound crossing/)).toBeVisible();
    await page.getByRole('button', { name: 'Review the proposed week' }).click();
    await expect(page.getByRole('button', { name: /confirm timesheet/i })).toBeFocused();
    const phone = page.getByRole('region', { name: 'Worker timesheet' });
    await expect(phone.getByText('40h 30m')).toBeVisible();
    await phone.getByRole('button', { name: 'Tue 10 Nov' }).tap();
    await expect(phone.getByRole('heading', { name: 'Tue · 10 Nov' })).toBeVisible();
    await phone.getByRole('button', { name: 'Mon 09 Nov' }).tap();
    const firstInterval = phone.getByRole('button', { name: /travel 08:00–08:45/i });
    await firstInterval.tap();
    await expect(firstInterval).toHaveAttribute('aria-expanded', 'true');
    await page.getByLabel('End for 0-e1').fill('08:50');
    await page.getByRole('button', { name: 'Submit draft' }).click();
    await expect(page.getByRole('alert')).toContainText('unresolved Monday');
    await expect(page.getByRole('alert')).toContainText('Mon contains overlapping intervals.');
    await page.getByLabel('End for 0-e1').fill('08:45');
    await phone.getByRole('button', { name: 'Done', exact: true }).tap();
    await expect(firstInterval).toHaveAttribute('aria-expanded', 'false');
    await phone.getByRole('button', { name: /unclassified gap/iu }).tap();
    await page.getByLabel('Activity for 0-e4').selectOption('Break');
    await page.getByLabel('Project for 0-e4').selectOption('Northline Retrofit');
    await page.getByRole('button', { name: 'Confirm gap' }).click();
    await page.getByRole('button', { name: 'Submit draft' }).click();
    await expect(page.getByText(/exceeds the 40-hour/)).toBeVisible();
    await expect(page.getByText(/project allocation changes/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approve', exact: true })).toBeDisabled();

    await page.getByRole('textbox', { name: /manager note/i }).fill('Confirm project with dispatch.');
    await page.getByRole('button', { name: 'Request changes' }).click();
    await expect(page.getByRole('status')).toContainText('Confirm project with dispatch.');
    await page.getByRole('button', { name: 'Open worker view' }).click();
    await expect(phone.getByText('Manager note: Confirm project with dispatch.')).toBeVisible();
    await phone.getByRole('button', { name: /break 12:15–12:45/i }).tap();
    await page.getByLabel('Project for 0-e4').selectOption('Harbor Works');
    await page.getByRole('button', { name: 'Submit draft' }).click();
    await page.getByLabel('I reviewed the flagged exceptions.').check();
    await page.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Approved in the demo');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download approved CSV' }).click();
    expect((await downloadPromise).suggestedFilename()).toBe('approved-timesheet-2026-11-09-r4.csv');
    await page.reload();
    await page.getByRole('button', { name: 'Manager inbox' }).click();
    await expect(page.getByRole('status')).toContainText('Approved in the demo');
  });
});

test('calculator and technical diagrams respond to changes', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'One-site pilot' }).click();
  await expect(page.getByText('ONE SITE · SHADOW MODE')).toBeVisible();
  await page.getByRole('button', { name: /validate policy/i }).click();
  await expect(page.getByText('Unknown or stale policy', { exact: false })).toBeVisible();
  await page.getByText('Capacity planner', { exact: true }).click();
  await page.getByRole('button', { name: 'Camera-free', exact: true }).click();
  await expect(page.getByText('0 GB', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Pilot', exact: true }).click();
  await expect(page.getByText('12.96 GB', { exact: true }).first()).toBeVisible();
  await page.getByLabel('Sample rate').fill('1');
  await expect(page.getByText('6.48 GB', { exact: true }).first()).toBeVisible();
  await page.getByText('Throughput, utilization & event assumptions').click();
  await page.getByLabel('Cloud processing window').fill('0.1');
  await expect(page.getByText('Startup consumes the full cloud window.')).toBeVisible();
  await page.getByText('Equations, units & exclusions').click();
  await expect(page.getByText('edge workers/site', { exact: false })).toBeVisible();
  await page.getByText('30-day pilot', { exact: true }).click();
  await page.getByRole('button', { name: /Days 22–30/ }).click();
  await expect(page.getByText('zero observed harmful approvals', { exact: false })).toBeVisible();
});

test('architecture brief opens and downloads as a PDF', async ({ page, request }) => {
  await page.goto('./');
  const link = page.getByRole('link', { name: 'Architecture PDF', exact: true });
  const path = await link.getAttribute('href');
  expect(path).toBeTruthy();
  const response = await request.get(path!);
  expect(response.ok()).toBeTruthy();
  expect(response.headers()['content-type']).toContain('application/pdf');
  expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download architecture PDF', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('zero-touch-week-architecture.pdf');
});

for (const width of [320, 390, 768, 1440]) {
  test(`responsive layout at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('link', { name: 'Timesheets' })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Expenses' })).toBeVisible();
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      scrollTo({ top: 0, behavior: 'instant' });
    });
    await page.screenshot({ fullPage: true, path: testInfo.outputPath('showcase.png'), animations: 'disabled' });
    await page.getByRole('button', { name: 'Confirm timesheet' }).click();
    const phone = page.getByRole('region', { name: 'Worker timesheet' });
    await expect(phone).toBeVisible();
    const bounds = await phone.boundingBox();
    expect(bounds?.width).toBeLessThanOrEqual(Math.min(405, width));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await phone.screenshot({ path: testInfo.outputPath('worker-confirmation.png'), animations: 'disabled' });
    expect(errors).toEqual([]);
  });
}
