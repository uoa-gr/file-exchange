import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base path:
//   - Vercel serves at the apex (/), so PAGES_BASE_URL is unset → '/'.
//   - GitHub Pages serves at /<repo>/, so the pages workflow sets
//     PAGES_BASE_URL='/file-exchange/' (override in repo Variables to '/'
//     when a custom domain is in use).
const base = process.env.PAGES_BASE_URL ?? '/';

export default defineConfig({
  plugins: [react()],
  base,
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2022' },
  server: { port: 5173, strictPort: true },
  resolve: { conditions: ['browser', 'import', 'default'] },
});
