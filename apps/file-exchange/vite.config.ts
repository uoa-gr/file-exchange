import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Base path:
//   - Vercel serves at the apex (/), so PAGES_BASE_URL is unset → '/'.
//   - GitHub Pages serves at /<repo>/, so the pages workflow sets
//     PAGES_BASE_URL='/file-exchange/' (override in repo Variables to '/'
//     when a custom domain is in use).
const base = process.env.PAGES_BASE_URL ?? '/';

// libsodium-wrappers-sumo v0.7.x ESM entry imports './libsodium-sumo.mjs'
// as a sibling, but that file lives in the *separate* libsodium-sumo
// package's dist directory. Rewrite the relative import.
const sumoSiblingMjs = fileURLToPath(
  new URL(
    '../../node_modules/libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs',
    import.meta.url,
  ),
);

// Esbuild plugin (used by Vite's dev pre-bundler).
const esbuildSumoFix = {
  name: 'fix-libsodium-esm-esbuild',
  setup(build: { onResolve: (opts: { filter: RegExp }, cb: (args: { importer: string }) => { path: string } | undefined) => void }) {
    build.onResolve({ filter: /^\.\/libsodium-sumo\.mjs$/ }, (args) => {
      if (args.importer.includes('libsodium-wrappers-sumo')) {
        return { path: sumoSiblingMjs };
      }
      return undefined;
    });
  },
};

// Rollup plugin (used by Vite's production build).
function rollupSumoFix(): Plugin {
  return {
    name: 'fix-libsodium-esm-rollup',
    enforce: 'pre',
    resolveId(source, importer) {
      if (
        source === './libsodium-sumo.mjs' &&
        importer &&
        importer.includes('libsodium-wrappers-sumo')
      ) {
        return sumoSiblingMjs;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [rollupSumoFix(), react()],
  base,
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2022' },
  server: { port: 5173, strictPort: true },
  optimizeDeps: {
    include: ['libsodium-wrappers-sumo'],
    esbuildOptions: {
      target: 'es2022',
      plugins: [esbuildSumoFix],
    },
  },
});
