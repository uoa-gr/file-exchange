import type { Vault } from '../db.js';
import type { FileRow } from '../types.js';

export function insertFile(db: Vault, f: FileRow): void {
  db.prepare(
    `INSERT OR REPLACE INTO files
       (project_id, relative_path, sha256, size, mtime, introduced_by_user_id, parent_file_sha)
     VALUES
       (@project_id, @relative_path, @sha256, @size, @mtime, @introduced_by_user_id, @parent_file_sha)`,
  ).run(f);
}

export function listFilesForProject(db: Vault, projectId: string): FileRow[] {
  return db
    .prepare(`SELECT * FROM files WHERE project_id = ? ORDER BY relative_path`)
    .all(projectId) as FileRow[];
}

export function deleteFile(db: Vault, projectId: string, relativePath: string): boolean {
  const info = db
    .prepare(`DELETE FROM files WHERE project_id = ? AND relative_path = ?`)
    .run(projectId, relativePath);
  return info.changes > 0;
}
