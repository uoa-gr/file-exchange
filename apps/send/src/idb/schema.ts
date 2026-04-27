import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { EncryptedPrivateKey } from '@spourgiti/keystore';

export const DB_NAME = 'spourgiti-send';
export const DB_VERSION = 1;

export interface SendDB extends DBSchema {
  keystore: { key: 'self'; value: EncryptedPrivateKey };
  profile: {
    key: 'self';
    value: {
      user_id: string;
      username: string;
      display_name: string | null;
      ed25519_public_key: Uint8Array;
      ed25519_pubkey_fp: string;
    };
  };
  fingerprints: {
    key: string;
    value: {
      user_id: string;
      ed25519_public_key: Uint8Array;
      first_seen_at: number;
      manually_trusted_at: number | null;
    };
  };
  seen_sends: {
    key: string;
    value: { send_id: string; seen_at: number };
    indexes: { 'by-seen_at': number };
  };
  inbox_cache: {
    key: string;
    value: unknown;
    indexes: { 'by-created_at': number };
  };
  outbox_cache: {
    key: string;
    value: unknown;
    indexes: { 'by-created_at': number };
  };
}

export async function openSendDb(): Promise<IDBPDatabase<SendDB>> {
  return openDB<SendDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('keystore');
        db.createObjectStore('profile');
        db.createObjectStore('fingerprints', { keyPath: 'user_id' });
        const seen = db.createObjectStore('seen_sends', { keyPath: 'send_id' });
        seen.createIndex('by-seen_at', 'seen_at');
        const inbox = db.createObjectStore('inbox_cache');
        inbox.createIndex('by-created_at', 'created_at');
        const outbox = db.createObjectStore('outbox_cache');
        outbox.createIndex('by-created_at', 'created_at');
      }
      // Future versions add upgrade branches here. Bump DB_VERSION; never delete branches.
    },
  });
}
