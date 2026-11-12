import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/ifs-zero-touch-week/',
  build: {
    rollupOptions: {
      input: {
        timesheets: fileURLToPath(new URL('index.html', import.meta.url)),
        expenses: fileURLToPath(new URL('expenses/index.html', import.meta.url)),
      },
    },
  },
  plugins: [react(), tailwindcss()],
});
