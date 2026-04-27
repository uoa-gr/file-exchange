import { getSodium } from './sodium-public.js';

/**
 * Single-shot XChaCha20-Poly1305 IETF AEAD. Uses a fresh random nonce
 * per call (192 bits — random nonces are safe at any volume). The
 * caller must persist `nonce` alongside the ciphertext.
 */

export async function aeadEncrypt(
  plaintext: Uint8Array,
  key: Uint8Array,
  associatedData?: Uint8Array,
): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array }> {
  const s = await getSodium();
  const nonce = s.randombytes_buf(s.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ciphertext = s.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintext,
    associatedData ?? null,
    null,
    nonce,
    key,
  );
  return { ciphertext, nonce };
}

export async function aeadDecrypt(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  key: Uint8Array,
  associatedData?: Uint8Array,
): Promise<Uint8Array> {
  const s = await getSodium();
  return s.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    ciphertext,
    associatedData ?? null,
    nonce,
    key,
  );
}
