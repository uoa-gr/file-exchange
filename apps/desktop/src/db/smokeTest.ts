import Database from 'better-sqlite3';

export function runDbSmokeTest(): void {
  const db = new Database(':memory:');
  const row = db.prepare('SELECT sqlite_version() AS v').get() as { v: string };
  console.log(`[db] better-sqlite3 OK, sqlite ${row.v}`);
  db.close();
}
