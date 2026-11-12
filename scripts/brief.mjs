import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const documentUrl = new URL('../docs/brief/index.html', import.meta.url);
const outputDir = new URL('../public/docs/', import.meta.url);
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
try {
  const page = await browser.newPage({ viewport: { width: 940, height: 1200 } });
  await page.goto(documentUrl.href, { waitUntil: 'load' });
  await page.emulateMedia({ media: 'print' });
  const result = await page.evaluate(async () => {
    await document.fonts.ready;
    const pages = [...document.querySelectorAll('.page')];
    const overflow = pages.flatMap((sheet, index) => {
      const footer = sheet.querySelector('footer');
      const lastContent = footer?.previousElementSibling;
      if (!footer || !lastContent || lastContent.getBoundingClientRect().bottom > footer.getBoundingClientRect().top - 10 || sheet.scrollWidth > sheet.clientWidth) {
        return [index + 1];
      }
      return [];
    });
    const fonts = [...document.fonts].map(font => font.status);
    const missingImages = [...document.images].filter(image => !image.complete || image.naturalWidth === 0).length;
    return { overflow, count: pages.length, fonts, missingImages };
  });
  if (result.count !== 11 || result.missingImages || result.overflow.length || result.fonts.some(status => status !== 'loaded')) {
    throw new Error(`Brief layout check failed: ${JSON.stringify(result)}`);
  }

  await page.pdf({
    path: fileURLToPath(new URL('zero-touch-week-architecture.pdf', outputDir)),
    preferCSSPageSize: true,
    printBackground: true,
    tagged: true,
  });
  await page.emulateMedia({ media: 'screen' });
  await page.locator('.cover').screenshot({ path: fileURLToPath(new URL('brief-preview.png', outputDir)) });
  console.log('Generated the eleven-page architecture brief and cover preview.');
} finally {
  await browser.close();
}
