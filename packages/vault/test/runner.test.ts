import { describe, it, expect } from 'vitest';
import { openDatabase } from '../src/db.js';
import { runMigrations, type Migration } from '../src/runner.js';

const migrations: Migration[] = [
  { version: 1, name: 'create-foo', sql: `CREATE TABLE foo (id INTEGER PRIMARY KEY, x TEXT NOT NULL)` },
  { version: 2, name: 'create-bar', sql: `CREATE TABLE bar (id INTEGER PRIMARY KEY, foo_id INTEGER REFERENCES foo(id))` },
];

describe('runMigrations', () => {
  it('applies all migrations on a fresh database', () => {
    const db = openDatabase(':memory:');
    const result = runMigrations(db, migrations);
    expect(result.applied).toEqual([1, 2]);
    expect(db.prepare('SELECT version FROM schema_version').get()).toEqual({ version: 2 });
    db.close();
  });

  it('is idempotent: a second run applies nothing', () => {
    const db = openDatabase(':memory:');
    runMigrations(db, migrations);
    const second = runMigrations(db, migrations);
    expect(second.applied).toEqual([]);
    expect(db.prepare('SELECT version FROM schema_version').get()).toEqual({ version: 2 });
    db.close();
  });

  it('throws if the database is from a future schema version', () => {
    const db = openDatabase(':memory:');
    runMigrations(db, migrations);
    expect(() => runMigrations(db, [migrations[0]!])).toThrow(/future/i);
    db.close();
  });

  it('rejects duplicate version numbers in the migration list', () => {
    const db = openDatabase(':memory:');
    const bad: Migration[] = [
      { version: 1, name: 'a', sql: 'CREATE TABLE a (id INTEGER PRIMARY KEY)' },
      { version: 1, name: 'b', sql: 'CREATE TABLE b (id INTEGER PRIMARY KEY)' },
    ];
    expect(() => runMigrations(db, bad)).toThrow(/duplicate|order/i);
    db.close();
  });
});
