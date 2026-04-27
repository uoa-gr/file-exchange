import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { IdbBrowserKeystore } from '../src/idb-keystore.js';
import type { EncryptedPrivateKey } from '../src/types.js';

function blob(): EncryptedPrivateKey {
  return {
    ciphertext: new Uint8Array([1, 2, 3, 4]),
    salt: new Uint8Array(16).fill(0xaa),
    ops_limit: 1,
    mem_limit: 1,
    kdf_version: 1,
  };
}

describe('IdbBrowserKeystore', () => {
  beforeEach(async () => {
    // Wipe before each test so the in-memory IDB shim doesn't leak state.
    const ks = new IdbBrowserKeystore();
    await ks.clear();
  });

  it('round-trips an encrypted blob', async () => {
    const ks = new IdbBrowserKeystore();
    const v = blob();
    await ks.storeEncryptedKey(v);
    const out = await ks.loadEncryptedKey();
    expect(out).not.toBeNull();
    expect(Buffer.from(out!.ciphertext).equals(Buffer.from(v.ciphertext))).toBe(true);
    expect(out!.kdf_version).toBe(1);
  });

  it('returns null when nothing has been stored', async () => {
    const ks = new IdbBrowserKeystore();
    const out = await ks.loadEncryptedKey();
    expect(out).toBeNull();
  });

  it('clear() removes the entry', async () => {
    const ks = new IdbBrowserKeystore();
    await ks.storeEncryptedKey(blob());
    await ks.clear();
    expect(await ks.loadEncryptedKey()).toBeNull();
  });

  it('store overwrites a prior value', async () => {
    const ks = new IdbBrowserKeystore();
    const a = blob();
    const b: EncryptedPrivateKey = { ...blob(), kdf_version: 2 };
    await ks.storeEncryptedKey(a);
    await ks.storeEncryptedKey(b);
    const out = await ks.loadEncryptedKey();
    expect(out!.kdf_version).toBe(2);
  });
});
