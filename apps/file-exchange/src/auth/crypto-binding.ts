import {
  generateIdentityKeyPair,
  ed25519PublicToX25519,
  deriveKey,
  randomSalt,
  kdfParams,
  aeadEncrypt,
  aeadDecrypt,
  randomBytes,
} from '@liaskos/crypto';
import type { EncryptedPrivateKey } from '@liaskos/keystore';

export const KDF_VERSION = 1;
const RECOVERY_CODE_BYTES = 24;
const NONCE_LEN = 24; // crypto_aead_xchacha20poly1305_ietf_NPUBBYTES

export interface RecoveryKdfParams {
  salt: number[];
  ops_limit: number;
  mem_limit: number;
}

export interface NewIdentity {
  publicKey: Uint8Array;
  publicKeyX25519: Uint8Array;
  encryptedKeyForPassword: EncryptedPrivateKey;
  recoveryBlob: Uint8Array;
  recoveryKdfParams: RecoveryKdfParams;
  recoveryCodeHex: string;
  privateKey: Uint8Array;
}

export function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(s: string): Uint8Array {
  const cleaned = s.replace(/[^0-9a-f]/gi, '');
  if (cleaned.length % 2 !== 0) throw new Error('odd-length hex');
  const out = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function formatRecoveryCode(hex: string): string {
  return (hex.match(/.{1,6}/g) ?? []).join(' · ');
}

export async function generateRecoveryCode(): Promise<{ codeHex: string; bytes: Uint8Array }> {
  const bytes = await randomBytes(RECOVERY_CODE_BYTES);
  return { codeHex: bytesToHex(bytes), bytes };
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

function split(blob: Uint8Array): { ciphertext: Uint8Array; nonce: Uint8Array } {
  return {
    ciphertext: blob.subarray(0, blob.length - NONCE_LEN),
    nonce: blob.subarray(blob.length - NONCE_LEN),
  };
}

export async function buildNewIdentity(password: string): Promise<NewIdentity> {
  const kp = await generateIdentityKeyPair();
  const xPk = await ed25519PublicToX25519(kp.publicKey);
  const params = await kdfParams('INTERACTIVE');

  // Password KEK: Argon2id(password, salt) → 32-byte key, then AEAD-wrap secret key.
  const pwSalt = await randomSalt();
  const pwKey = await deriveKey(password, pwSalt, params.ops_limit, params.mem_limit);
  const pwSealed = await aeadEncrypt(kp.secretKey, pwKey);
  const encryptedKeyForPassword: EncryptedPrivateKey = {
    ciphertext: concat(pwSealed.ciphertext, pwSealed.nonce),
    salt: pwSalt,
    ops_limit: params.ops_limit,
    mem_limit: params.mem_limit,
    kdf_version: KDF_VERSION,
  };

  // Recovery KEK: Argon2id(recoveryCode, salt) → 32-byte key, AEAD-wrap secret key.
  const rec = await generateRecoveryCode();
  const recSalt = await randomSalt();
  const recKey = await deriveKey(rec.codeHex, recSalt, params.ops_limit, params.mem_limit);
  const recSealed = await aeadEncrypt(kp.secretKey, recKey);
  const recoveryBlob = concat(recSealed.ciphertext, recSealed.nonce);
  const recoveryKdfParams: RecoveryKdfParams = {
    salt: Array.from(recSalt),
    ops_limit: params.ops_limit,
    mem_limit: params.mem_limit,
  };

  return {
    publicKey: kp.publicKey,
    publicKeyX25519: xPk,
    encryptedKeyForPassword,
    recoveryBlob,
    recoveryKdfParams,
    recoveryCodeHex: rec.codeHex,
    privateKey: kp.secretKey,
  };
}

export async function unwrapWithPassword(
  password: string,
  blob: EncryptedPrivateKey,
): Promise<Uint8Array> {
  const key = await deriveKey(password, blob.salt, blob.ops_limit, blob.mem_limit);
  const { ciphertext, nonce } = split(blob.ciphertext);
  return aeadDecrypt(ciphertext, nonce, key);
}

export async function unwrapWithRecoveryCode(
  codeHex: string,
  recoveryBlob: Uint8Array,
  kdf: RecoveryKdfParams,
): Promise<Uint8Array> {
  const salt = new Uint8Array(kdf.salt);
  const key = await deriveKey(codeHex, salt, kdf.ops_limit, kdf.mem_limit);
  const { ciphertext, nonce } = split(recoveryBlob);
  return aeadDecrypt(ciphertext, nonce, key);
}

/** Re-wrap a known private key under a fresh password. Used in password-reset flow. */
export async function wrapWithPassword(
  privateKey: Uint8Array,
  password: string,
): Promise<EncryptedPrivateKey> {
  const params = await kdfParams('INTERACTIVE');
  const salt = await randomSalt();
  const kek = await deriveKey(password, salt, params.ops_limit, params.mem_limit);
  const sealed = await aeadEncrypt(privateKey, kek);
  return {
    ciphertext: concat(sealed.ciphertext, sealed.nonce),
    salt,
    ops_limit: params.ops_limit,
    mem_limit: params.mem_limit,
    kdf_version: KDF_VERSION,
  };
}
