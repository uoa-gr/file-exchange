import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase } from '../src/db.js';
import { runMigrations } from '../src/runner.js';
import { migrations } from '../src/migrations/index.js';
import { insertProject, getProject, listProjects, updateProjectStatus } from '../src/queries/projects.js';
import { insertFile, listFilesForProject, deleteFile } from '../src/queries/files.js';

let db: ReturnType<typeof openDatabase>;

beforeEach(() => {
  db = openDatabase(':memory:');
  runMigrations(db, migrations);
});

describe('projects queries', () => {
  it('insert + getProject round-trips a row', () => {
    insertProject(db, { id: 'p1', name: 'Alpha', folder_path: '/tmp/a' });
    const got = getProject(db, 'p1');
    expect(got?.name).toBe('Alpha');
    expect(got?.status).toBe('linked');
  });

  it('listProjects returns all rows', () => {
    insertProject(db, { id: 'p1', name: 'A', folder_path: '/a' });
    insertProject(db, { id: 'p2', name: 'B', folder_path: '/b' });
    const all = listProjects(db);
    expect(all.map((p) => p.id).sort()).toEqual(['p1', 'p2']);
  });

  it('updateProjectStatus changes the status field', () => {
    insertProject(db, { id: 'p1', name: 'A', folder_path: '/a' });
    updateProjectStatus(db, 'p1', 'missing');
    expect(getProject(db, 'p1')?.status).toBe('missing');
  });
});

describe('files queries', () => {
  beforeEach(() => {
    insertProject(db, { id: 'p1', name: 'A', folder_path: '/a' });
  });

  it('insert + list returns the file', () => {
    insertFile(db, { project_id: 'p1', relative_path: 'logo.png', sha256: 'aa', size: 100, mtime: 1700000000, introduced_by_user_id: 'alice', parent_file_sha: null });
    const list = listFilesForProject(db, 'p1');
    expect(list).toHaveLength(1);
    expect(list[0]!.relative_path).toBe('logo.png');
  });

  it('insert with the same (project, path) replaces the row', () => {
    insertFile(db, { project_id: 'p1', relative_path: 'a', sha256: '1', size: 1, mtime: 0, introduced_by_user_id: 'u', parent_file_sha: null });
    insertFile(db, { project_id: 'p1', relative_path: 'a', sha256: '2', size: 2, mtime: 0, introduced_by_user_id: 'u', parent_file_sha: null });
    const list = listFilesForProject(db, 'p1');
    expect(list).toHaveLength(1);
    expect(list[0]!.sha256).toBe('2');
  });

  it('deleteFile removes the row and returns true; deleting again returns false', () => {
    insertFile(db, { project_id: 'p1', relative_path: 'a', sha256: '1', size: 1, mtime: 0, introduced_by_user_id: 'u', parent_file_sha: null });
    expect(deleteFile(db, 'p1', 'a')).toBe(true);
    expect(deleteFile(db, 'p1', 'a')).toBe(false);
  });
});
