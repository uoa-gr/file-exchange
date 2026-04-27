import { describe, it, expect } from 'vitest';
import { openDatabase } from '../src/db.js';

describe('openDatabase', () => {
  it('opens an in-memory database', () => {
    const db = openDatabase(':memory:');
    expect(db.open).toBe(true);
    db.close();
  });

  it('runs DDL and INSERT/SELECT round-trip', () => {
    const db = openDatabase(':memory:');
    db['exec']('CREATE TABLE t (id INTEGER PRIMARY KEY, x TEXT)');
    db.prepare('INSERT INTO t (x) VALUES (?)').run('hi');
    const row = db.prepare('SELECT x FROM t').get() as { x: string };
    expect(row.x).toBe('hi');
    db.close();
  });
});
