const esbuild = require('esbuild');

const common = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: ['electron', 'better-sqlite3', 'electron-updater'],
  sourcemap: true,
  outdir: 'dist',
  logLevel: 'info',
};

Promise.all([
  esbuild.build({ ...common, entryPoints: ['src/main.ts'] }),
  esbuild.build({ ...common, entryPoints: ['src/preload.ts'] }),
]).catch((err) => {
  console.error(err);
  process.exit(1);
});
