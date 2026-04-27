import { describe, it, expect } from 'vitest';
import { openDatabase } from '../src/db.js';
import { runMigrations } from '../src/runner.js';
import { migrations } from '../src/migrations/index.js';

const expectedTables = [
  'projects', 'project_members_cache', 'files', 'sync_points',
  'updates_outbound', 'updates_inbound', 'chat_threads_cache',
  'chat_messages_cache', 'keystore_meta',
];

describe('initial migration (001)', () => {
  it('creates every table in the design spec', () => {
    const db = openDatabase(':memory:');
    runMigrations(db, migrations);
    const rows = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).all() as { name: string }[];
    const names = rows.map((r) => r.name);
    for (const t of expectedTables) expect(names).toContain(t);
    db.close();
  });

  it('foreign keys are enforced', () => {
    const db = openDatabase(':memory:');
    runMigrations(db, migrations);
    expect(() =>
      db.prepare(
        `INSERT INTO files (project_id, relative_path, sha256, size, mtime, introduced_by_user_id) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('00000000-0000-0000-0000-000000000000', 'a.txt', 'deadbeef', 0, 0, 'user-x'),
    ).toThrow(/FOREIGN KEY/i);
    db.close();
  });
});
