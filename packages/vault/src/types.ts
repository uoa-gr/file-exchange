export interface ProjectRow {
  id: string;
  name: string;
  folder_path: string;
  last_seen_path: string | null;
  status: 'linked' | 'missing' | 'relocated';
  created_at: number;
}

export interface FileRow {
  project_id: string;
  relative_path: string;
  sha256: string;
  size: number;
  mtime: number;
  introduced_by_user_id: string;
  parent_file_sha: string | null;
}
