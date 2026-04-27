import Database from 'better-sqlite3';
import type { Database as DB } from 'better-sqlite3';

export type Vault = DB;

/**
 * Open a SQLite database. For file paths, applies WAL journal mode and
 * synchronous=NORMAL pragmas (safe + fast for a single-writer desktop app).
 * For ':memory:', WAL is meaningless and skipped.
 */
export function openDatabase(path: string): Vault {
  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  if (path !== ':memory:') {
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
  }
  return db;
}
