import { describe, it, expect } from 'vitest';
import { aeadEncrypt, aeadDecrypt } from '../src/aead.js';
import { randomKey } from '../src/random.js';

describe('aead round-trip', () => {
  it('decrypts what encrypt produced', async () => {
    const key = await randomKey();
    const plaintext = new Uint8Array([1, 2, 3, 4, 5]);
    const { ciphertext, nonce } = await aeadEncrypt(plaintext, key);
    const out = await aeadDecrypt(ciphertext, nonce, key);
    expect(Buffer.from(out).equals(Buffer.from(plaintext))).toBe(true);
  });

  it('rejects a tampered ciphertext', async () => {
    const key = await randomKey();
    const { ciphertext, nonce } = await aeadEncrypt(new Uint8Array([1, 2, 3]), key);
    ciphertext[0] ^= 0xff;
    await expect(aeadDecrypt(ciphertext, nonce, key)).rejects.toThrow();
  });

  it('rejects the wrong key', async () => {
    const key1 = await randomKey();
    const key2 = await randomKey();
    const { ciphertext, nonce } = await aeadEncrypt(new Uint8Array([1, 2, 3]), key1);
    await expect(aeadDecrypt(ciphertext, nonce, key2)).rejects.toThrow();
  });

  it('binds associated data', async () => {
    const key = await randomKey();
    const ad1 = new Uint8Array([0xaa]);
    const ad2 = new Uint8Array([0xbb]);
    const { ciphertext, nonce } = await aeadEncrypt(new Uint8Array([1, 2, 3]), key, ad1);
    await expect(aeadDecrypt(ciphertext, nonce, key, ad2)).rejects.toThrow();
    const ok = await aeadDecrypt(ciphertext, nonce, key, ad1);
    expect(ok.length).toBe(3);
  });
});
