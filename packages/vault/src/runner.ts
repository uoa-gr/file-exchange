import type { Vault } from './db.js';

export interface Migration {
  /** Strictly increasing positive integer; never reuse a version. */
  version: number;
  /** Short human-readable identifier; for logs/debugging only. */
  name: string;
  /** SQL DDL/DML to apply. Multiple statements separated by ';'. */
  sql: string;
}

export interface RunResult {
  applied: number[];
}

function readCurrentVersion(db: Vault): number {
  db['exec'](`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)`);
  const row = db.prepare('SELECT version FROM schema_version').get() as
    | { version: number }
    | undefined;
  return row?.version ?? 0;
}

function setVersion(db: Vault, version: number): void {
  const exists = db.prepare('SELECT 1 FROM schema_version').get();
  if (exists) {
    db.prepare('UPDATE schema_version SET version = ?').run(version);
  } else {
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(version);
  }
}

function validateMigrations(list: Migration[]): void {
  const seen = new Set<number>();
  let prev = 0;
  for (const m of list) {
    if (seen.has(m.version)) {
      throw new Error(`duplicate migration version: ${m.version}`);
    }
    if (m.version <= prev) {
      throw new Error(`migrations out of order: ${m.version} after ${prev}`);
    }
    seen.add(m.version);
    prev = m.version;
  }
}

export function runMigrations(db: Vault, list: Migration[]): RunResult {
  validateMigrations(list);
  const current = readCurrentVersion(db);
  const max = list.length > 0 ? list[list.length - 1]!.version : 0;
  if (current > max) {
    throw new Error(
      `vault is from a future schema version (db=${current}, code knows up to ${max}); refusing to start`,
    );
  }
  const applied: number[] = [];
  const trx = db.transaction(() => {
    for (const m of list) {
      if (m.version <= current) continue;
      db['exec'](m.sql);
      applied.push(m.version);
    }
    if (applied.length > 0) setVersion(db, applied[applied.length - 1]!);
  });
  trx();
  return { applied };
}
