import { getSodium } from './sodium-public.js';

/** libsodium Argon2id strength presets exposed as opaque tuples. */
export type KdfStrength = 'INTERACTIVE' | 'MODERATE' | 'SENSITIVE';

export async function kdfParams(
  strength: KdfStrength,
): Promise<{ ops_limit: number; mem_limit: number }> {
  const s = await getSodium();
  switch (strength) {
    case 'INTERACTIVE':
      return {
        ops_limit: s.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        mem_limit: s.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      };
    case 'MODERATE':
      return {
        ops_limit: s.crypto_pwhash_OPSLIMIT_MODERATE,
        mem_limit: s.crypto_pwhash_MEMLIMIT_MODERATE,
      };
    case 'SENSITIVE':
      return {
        ops_limit: s.crypto_pwhash_OPSLIMIT_SENSITIVE,
        mem_limit: s.crypto_pwhash_MEMLIMIT_SENSITIVE,
      };
  }
}

export async function randomSalt(): Promise<Uint8Array> {
  const s = await getSodium();
  return s.randombytes_buf(s.crypto_pwhash_SALTBYTES);
}

/** Derive a 32-byte symmetric key from a password using Argon2id v1.3. */
export async function deriveKey(
  password: string,
  salt: Uint8Array,
  opsLimit: number,
  memLimit: number,
): Promise<Uint8Array> {
  const s = await getSodium();
  return s.crypto_pwhash(
    32,
    password,
    salt,
    opsLimit,
    memLimit,
    s.crypto_pwhash_ALG_ARGON2ID13,
  );
}
