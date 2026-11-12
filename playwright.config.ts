import { defineConfig } from '@playwright/test';

const external = process.env.SHOWCASE_BASE_URL;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: external || 'http://127.0.0.1:4173/ifs-zero-touch-week/',
    trace: 'retain-on-failure',
  },
  webServer: external ? undefined : {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/ifs-zero-touch-week/',
    reuseExistingServer: !process.env.CI,
  },
});
