import type { Migration } from '../runner.js';

export const migration001: Migration = {
  version: 1,
  name: 'initial-schema',
  sql: `
    CREATE TABLE projects (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      folder_path     TEXT NOT NULL,
      last_seen_path  TEXT,
      status          TEXT NOT NULL CHECK (status IN ('linked', 'missing', 'relocated')) DEFAULT 'linked',
      created_at      INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE project_members_cache (
      project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id      TEXT NOT NULL,
      username     TEXT NOT NULL,
      public_key   BLOB NOT NULL,
      role         TEXT NOT NULL CHECK (role IN ('admin', 'member')),
      PRIMARY KEY (project_id, user_id)
    );

    CREATE TABLE files (
      project_id              TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      relative_path           TEXT NOT NULL,
      sha256                  TEXT NOT NULL,
      size                    INTEGER NOT NULL,
      mtime                   INTEGER NOT NULL,
      introduced_by_user_id   TEXT NOT NULL,
      parent_file_sha         TEXT,
      PRIMARY KEY (project_id, relative_path)
    );

    CREATE TABLE sync_points (
      project_id        TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      peer_user_id      TEXT NOT NULL,
      manifest_sha256   TEXT NOT NULL,
      created_at        INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      PRIMARY KEY (project_id, peer_user_id)
    );

    CREATE TABLE updates_outbound (
      id                  TEXT PRIMARY KEY,
      project_id          TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      recipients_json     TEXT NOT NULL,
      status              TEXT NOT NULL CHECK (status IN ('composing', 'sent', 'revoked')),
      transport           TEXT NOT NULL CHECK (transport IN ('p2p', 'buffer')),
      buffer_object_id    TEXT,
      created_at          INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      sent_at             INTEGER
    );

    CREATE TABLE updates_inbound (
      id            TEXT PRIMARY KEY,
      project_id    TEXT REFERENCES projects(id) ON DELETE CASCADE,
      sender_id     TEXT NOT NULL,
      transport     TEXT NOT NULL CHECK (transport IN ('p2p', 'buffer')),
      status        TEXT NOT NULL CHECK (status IN ('pending', 'merged', 'declined')),
      received_at   INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      merged_at     INTEGER
    );

    CREATE TABLE chat_threads_cache (
      id                TEXT PRIMARY KEY,
      scope             TEXT NOT NULL CHECK (scope IN ('project', 'dm')),
      project_id        TEXT REFERENCES projects(id) ON DELETE CASCADE,
      title             TEXT NOT NULL,
      created_by        TEXT NOT NULL,
      created_at        INTEGER NOT NULL,
      last_message_at   INTEGER
    );

    CREATE TABLE chat_messages_cache (
      id            TEXT PRIMARY KEY,
      thread_id     TEXT NOT NULL REFERENCES chat_threads_cache(id) ON DELETE CASCADE,
      sender_id     TEXT NOT NULL,
      ciphertext    BLOB NOT NULL,
      nonce         BLOB NOT NULL,
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE keystore_meta (
      key_handle    TEXT PRIMARY KEY,
      created_at    INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE INDEX idx_files_project ON files(project_id);
    CREATE INDEX idx_messages_thread ON chat_messages_cache(thread_id, created_at);
    CREATE INDEX idx_outbound_status ON updates_outbound(status);
    CREATE INDEX idx_inbound_status ON updates_inbound(status);
  `,
};
