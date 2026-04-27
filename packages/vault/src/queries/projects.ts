import type { Vault } from '../db.js';
import type { ProjectRow } from '../types.js';

export interface NewProject {
  id: string;
  name: string;
  folder_path: string;
}

export function insertProject(db: Vault, p: NewProject): void {
  db.prepare(`INSERT INTO projects (id, name, folder_path) VALUES (@id, @name, @folder_path)`).run(p);
}

export function getProject(db: Vault, id: string): ProjectRow | null {
  const row = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(id) as
    | ProjectRow
    | undefined;
  return row ?? null;
}

export function listProjects(db: Vault): ProjectRow[] {
  return db.prepare(`SELECT * FROM projects ORDER BY created_at DESC`).all() as ProjectRow[];
}

export function updateProjectStatus(
  db: Vault,
  id: string,
  status: ProjectRow['status'],
  lastSeenPath?: string,
): void {
  if (lastSeenPath !== undefined) {
    db.prepare(`UPDATE projects SET status = ?, last_seen_path = ? WHERE id = ?`).run(
      status,
      lastSeenPath,
      id,
    );
  } else {
    db.prepare(`UPDATE projects SET status = ? WHERE id = ?`).run(status, id);
  }
}
