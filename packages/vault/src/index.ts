import { openDatabase, type Vault } from './db.js';
import { runMigrations } from './runner.js';
import { migrations } from './migrations/index.js';

export type { Vault } from './db.js';
export type { ProjectRow, FileRow } from './types.js';
export { runMigrations, type Migration } from './runner.js';
export * from './queries/projects.js';
export * from './queries/files.js';

/**
 * Open a vault, applying any pending migrations atomically. Use ':memory:'
 * for tests. The caller is responsible for closing the returned Vault.
 */
export function openVault(path: string): Vault {
  const db = openDatabase(path);
  runMigrations(db, migrations);
  return db;
}
