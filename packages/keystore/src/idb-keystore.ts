import { openDB, type IDBPDatabase } from 'idb';
import { type BrowserKeystore, type EncryptedPrivateKey, KeystoreError } from './types.js';

const DB_NAME = 'liaskos-keystore';
const DB_VERSION = 1;
const STORE = 'keystore';
const KEY = 'self';

interface KeystoreSchema {
  keystore: { key: typeof KEY; value: EncryptedPrivateKey };
}

export class IdbBrowserKeystore implements BrowserKeystore {
  private dbp: Promise<IDBPDatabase<KeystoreSchema>> | null = null;

  private async db(): Promise<IDBPDatabase<KeystoreSchema>> {
    if (!this.dbp) {
      this.dbp = openDB<KeystoreSchema>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          db.createObjectStore(STORE);
        },
      }).catch((err: unknown) => {
        this.dbp = null;
        throw new KeystoreError(`IndexedDB unavailable: ${String(err)}`, 'DB_UNAVAILABLE');
      });
    }
    return this.dbp;
  }

  async storeEncryptedKey(value: EncryptedPrivateKey): Promise<void> {
    const db = await this.db();
    await db.put(STORE, value, KEY);
  }

  async loadEncryptedKey(): Promise<EncryptedPrivateKey | null> {
    const db = await this.db();
    const v = await db.get(STORE, KEY);
    return v ?? null;
  }

  async clear(): Promise<void> {
    const db = await this.db();
    await db.delete(STORE, KEY);
  }
}
