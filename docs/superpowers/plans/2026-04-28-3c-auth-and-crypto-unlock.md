# Plan 3c — Auth, Crypto Unlock, Routing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Wire the full sign-up / login / password-reset / unlock loop the spec describes in §6 + §4.2-4.3. By end of plan, a user can: sign up with email + username + password → see a recovery code → land in a placeholder inbox; close the tab and reopen → enter password → unlock crypto → land in the inbox; forget the password → enter the recovery code + new password → unlock and land in the inbox. The protected routes are gated by both the Supabase session AND the in-memory crypto state.

**Architecture:** `@liaskos/crypto` gains two missing primitives — `deriveKey` (Argon2id KEK derivation) and `aeadEncrypt`/`aeadDecrypt` (single-shot XChaCha20-Poly1305 for wrapping the private-key blob). `@liaskos/keystore` gets its real implementation: an `IdbBrowserKeystore` that puts the encrypted-private-key blob in IndexedDB. `apps/file-exchange/src/auth/` holds the orchestration layer that ties Supabase Auth + the crypto primitives + the keystore into the three flows. Routing uses `react-router-dom` v6 with a `<Protected>` guard that checks both `(SESSION, CRYPTO)`. UI is minimal manuscript-feel — single column, serif, ≥16px body, focus rings, ARIA labels — per spec §8.

**Tech stack carries over from 3a/3b.** New deps: nothing — react-router and zustand were added in 3a; libsodium and idb already present.

**Plan parent:** [docs/superpowers/specs/2026-04-27-file-exchange-design.md](../specs/2026-04-27-file-exchange-design.md)
**Predecessors:** Plan 3a (foundation), Plan 3b (Supabase backend live).

---

## File structure (end-state of Plan 3c)

```
packages/
  crypto/
    src/
      kdf.ts                           NEW: deriveKey (Argon2id) + INTERACTIVE/MODERATE constants
      aead.ts                          NEW: aeadEncrypt / aeadDecrypt (single-shot XChaCha20-Poly1305)
      index.ts                         updated to export kdf + aead
    test/
      kdf.test.ts                      NEW
      aead.test.ts                     NEW
  keystore/
    src/
      idb-keystore.ts                  NEW: IdbBrowserKeystore implementing BrowserKeystore
      index.ts                         updated to export the impl
    test/
      idb-keystore.test.ts             NEW (uses fake-indexeddb)

apps/file-exchange/
  src/
    auth/
      api.ts                           signUp, signIn, signOut, resetWithRecoveryCode
      crypto-binding.ts                wrap/unwrap private key, generate recovery code, encode/decode bytea
      session-listener.ts              binds supabase auth state changes to cryptoStore
    store/
      cryptoContext.ts                 (already exists from 3a) — extended with persistence helpers
    routes/
      Login.tsx                        /login page
      SignUp.tsx                       /signup page
      RecoveryCode.tsx                 /signup/recovery-code  (one-shot show after signup)
      Recovery.tsx                     /recovery (forgot password → enter recovery code)
      Unlock.tsx                       SESSION=active, CRYPTO=locked → password prompt
      ProtectedShell.tsx               layout for /inbox, /outbox, /send
      Inbox.tsx                        placeholder, real UI lands in 3d
      Outbox.tsx                       placeholder
      Send.tsx                         placeholder
    components/
      Field.tsx                        accessible form field (label + input + focus ring)
      Button.tsx                       text-link / accent-bottom-border button
      RomanNumeral.tsx                 ornamental glyph + ARIA label pair
    App.tsx                            routes + guards (replaces the placeholder from 3a)
    main.tsx                           unchanged
  test/
    auth-state-machine.test.ts         CryptoState transitions
    auth-flows.test.tsx                signUp/signIn/recovery render+behavior tests
```

---

## Task 1 — `@liaskos/crypto`: kdf + aead primitives

**Files:**
- Create: `packages/crypto/src/kdf.ts`, `packages/crypto/src/aead.ts`
- Modify: `packages/crypto/src/index.ts`
- Create: `packages/crypto/test/kdf.test.ts`, `packages/crypto/test/aead.test.ts`

- [ ] **kdf.ts**

```ts
import { getSodium } from './sodium-public.js';

/** libsodium Argon2id strength presets exposed as opaque tuples. */
export type KdfStrength = 'INTERACTIVE' | 'MODERATE' | 'SENSITIVE';

export async function kdfParams(strength: KdfStrength): Promise<{ ops_limit: number; mem_limit: number }> {
  const s = await getSodium();
  switch (strength) {
    case 'INTERACTIVE':
      return { ops_limit: s.crypto_pwhash_OPSLIMIT_INTERACTIVE, mem_limit: s.crypto_pwhash_MEMLIMIT_INTERACTIVE };
    case 'MODERATE':
      return { ops_limit: s.crypto_pwhash_OPSLIMIT_MODERATE, mem_limit: s.crypto_pwhash_MEMLIMIT_MODERATE };
    case 'SENSITIVE':
      return { ops_limit: s.crypto_pwhash_OPSLIMIT_SENSITIVE, mem_limit: s.crypto_pwhash_MEMLIMIT_SENSITIVE };
  }
}

export async function randomSalt(): Promise<Uint8Array> {
  const s = await getSodium();
  return s.randombytes_buf(s.crypto_pwhash_SALTBYTES);
}

/** Derive a 32-byte symmetric key from a password using Argon2id. */
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
```

- [ ] **aead.ts**

```ts
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
    plaintext, associatedData ?? null, null, nonce, key,
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
    null, ciphertext, associatedData ?? null, nonce, key,
  );
}
```

- [ ] **index.ts**: append `export * from './kdf.js';` and `export * from './aead.js';`

- [ ] **kdf.test.ts**: 4 tests — params returned for each strength; salt is 16 bytes; deriving the same password+salt twice produces identical bytes; deriving different passwords produces different keys.

- [ ] **aead.test.ts**: 4 tests — round-trip; tampered ciphertext rejected; wrong key rejected; associated data binding (decrypt with wrong AAD fails).

- [ ] Verify: `pnpm --filter @liaskos/crypto test` → 18 prior + 8 new = 26 passing.

- [ ] Commit: `feat(crypto): add Argon2id kdf + XChaCha20-Poly1305 aead primitives`

---

## Task 2 — `@liaskos/keystore`: real `IdbBrowserKeystore` impl

**Files:**
- Create: `packages/keystore/src/idb-keystore.ts`
- Modify: `packages/keystore/src/index.ts`
- Create: `packages/keystore/test/idb-keystore.test.ts`
- Add devDep: `fake-indexeddb` (jsdom shim for Vitest Node tests)

- [ ] **idb-keystore.ts**

```ts
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
        upgrade(db) { db.createObjectStore(STORE); },
      }).catch((err) => {
        this.dbp = null;
        throw new KeystoreError(`IDB unavailable: ${String(err)}`, 'DB_UNAVAILABLE');
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
```

- [ ] **index.ts**: export `IdbBrowserKeystore`

- [ ] **idb-keystore.test.ts**: import `'fake-indexeddb/auto'` at the top so IDB works under Node; tests cover store/load round-trip, load-when-empty returns null, clear-then-load returns null, store overwrites prior value.

- [ ] Add `fake-indexeddb` to `packages/keystore/package.json` devDependencies (`^6.0.0`).

- [ ] Verify + commit: `feat(keystore): add IdbBrowserKeystore (idb-backed implementation)`

---

## Task 3 — Auth crypto-binding helpers

**Files:**
- Create: `apps/file-exchange/src/auth/crypto-binding.ts`

This is the glue between the crypto primitives, the recovery code, and the byte-encoding the Supabase RPCs expect. Pure functions; no Supabase or React.

```ts
import {
  generateIdentityKeyPair,
  ed25519PublicToX25519,
  deriveKey,
  randomSalt,
  kdfParams,
  aeadEncrypt,
  aeadDecrypt,
} from '@liaskos/crypto';
import type { EncryptedPrivateKey } from '@liaskos/keystore';

export const KDF_VERSION = 1;
const RECOVERY_CODE_BYTES = 24;

/** Hex encoding for recovery code — 48 chars, easy to copy/paste. */
export function bytesToHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}
export function hexToBytes(s: string): Uint8Array {
  const cleaned = s.replace(/[^0-9a-f]/gi, '');
  if (cleaned.length % 2 !== 0) throw new Error('odd-length hex');
  const out = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(cleaned.slice(i*2, i*2+2), 16);
  return out;
}

/** Group hex into 6-char blocks separated by ' · ' for display. */
export function formatRecoveryCode(hex: string): string {
  return (hex.match(/.{1,6}/g) ?? []).join(' · ');
}

export async function generateRecoveryCode(): Promise<{ codeHex: string; bytes: Uint8Array }> {
  const sodium = (await import('@liaskos/crypto')).getSodium ?? (await import('@liaskos/crypto/sodium')).getSodium;
  const s = await sodium();
  const bytes = s.randombytes_buf(RECOVERY_CODE_BYTES);
  return { codeHex: bytesToHex(bytes), bytes };
}

export interface NewIdentity {
  publicKey: Uint8Array;          // Ed25519, 32 bytes
  publicKeyX25519: Uint8Array;    // derived
  encryptedKeyForPassword: EncryptedPrivateKey;   // password KEK wrapped
  recoveryBlob: Uint8Array;       // recovery KEK wrapped (ciphertext || nonce)
  recoveryKdfParams: { salt: number[]; ops_limit: number; mem_limit: number };
  recoveryCodeHex: string;
  /** Returned in cleartext only here so the calling layer can show it once. */
  privateKey: Uint8Array;
}

/** Generate keypair, wrap private key under password + recovery KEKs. */
export async function buildNewIdentity(password: string): Promise<NewIdentity> {
  const kp = await generateIdentityKeyPair();
  const xPk = await ed25519PublicToX25519(kp.publicKey);

  const params = await kdfParams('INTERACTIVE');

  // Password KEK
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

  // Recovery KEK
  const { codeHex } = await generateRecoveryCode();
  const recSalt = await randomSalt();
  const recKey = await deriveKey(codeHex, recSalt, params.ops_limit, params.mem_limit);
  const recSealed = await aeadEncrypt(kp.secretKey, recKey);
  const recoveryBlob = concat(recSealed.ciphertext, recSealed.nonce);
  const recoveryKdfParams = {
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
    recoveryCodeHex: codeHex,
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
  kdf: { salt: number[]; ops_limit: number; mem_limit: number },
): Promise<Uint8Array> {
  const salt = new Uint8Array(kdf.salt);
  const key = await deriveKey(codeHex, salt, kdf.ops_limit, kdf.mem_limit);
  const { ciphertext, nonce } = split(recoveryBlob);
  return aeadDecrypt(ciphertext, nonce, key);
}

const NONCE_LEN = 24; // crypto_aead_xchacha20poly1305_ietf_NPUBBYTES

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a); out.set(b, a.length);
  return out;
}
function split(blob: Uint8Array): { ciphertext: Uint8Array; nonce: Uint8Array } {
  return {
    ciphertext: blob.subarray(0, blob.length - NONCE_LEN),
    nonce: blob.subarray(blob.length - NONCE_LEN),
  };
}
```

- [ ] Verify + commit: `feat(file-exchange): auth crypto-binding helpers`

---

## Task 4 — Auth API: signUp / signIn / signOut / resetWithRecoveryCode

**File:** `apps/file-exchange/src/auth/api.ts`

Orchestrates Supabase Auth + crypto + IndexedDB. Each function returns a tagged-union result, never throws to React render-paths.

```ts
import { getSupabaseClient, createProfile } from '@liaskos/supabase-client';
import { IdbBrowserKeystore } from '@liaskos/keystore';
import {
  buildNewIdentity, unwrapWithPassword, unwrapWithRecoveryCode,
  bytesToHex, hexToBytes,
} from './crypto-binding.js';

const keystore = new IdbBrowserKeystore();

export type SignUpResult =
  | { ok: true; recoveryCodeHex: string; privateKey: Uint8Array; publicKey: Uint8Array }
  | { ok: false; reason: 'username_taken' | 'email_in_use' | 'auth_error' | 'rpc_error'; message: string };

export async function signUp(email: string, username: string, password: string): Promise<SignUpResult> {
  const sb = getSupabaseClient();
  const id = await buildNewIdentity(password);

  const { error: authErr } = await sb.auth.signUp({ email, password });
  if (authErr) {
    const msg = authErr.message;
    if (/registered|exists/i.test(msg)) return { ok: false, reason: 'email_in_use', message: msg };
    return { ok: false, reason: 'auth_error', message: msg };
  }

  try {
    await createProfile(sb, {
      username,
      ed25519_public_key: '\\x' + bytesToHex(id.publicKey),
      recovery_blob: '\\x' + bytesToHex(id.recoveryBlob),
      recovery_kdf_params: {
        salt: id.recoveryKdfParams.salt as never,
        ops_limit: id.recoveryKdfParams.ops_limit,
        mem_limit: id.recoveryKdfParams.mem_limit,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/username_taken/.test(msg)) return { ok: false, reason: 'username_taken', message: msg };
    return { ok: false, reason: 'rpc_error', message: msg };
  }

  await keystore.storeEncryptedKey(id.encryptedKeyForPassword);

  return { ok: true, recoveryCodeHex: id.recoveryCodeHex, privateKey: id.privateKey, publicKey: id.publicKey };
}

export type SignInResult =
  | { ok: true; privateKey: Uint8Array; publicKey: Uint8Array }
  | { ok: false; reason: 'auth_error' | 'no_keys_on_device' | 'wrong_password'; message: string };

export async function signInPassword(email: string, password: string): Promise<SignInResult> {
  const sb = getSupabaseClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, reason: 'auth_error', message: error.message };

  const stored = await keystore.loadEncryptedKey();
  if (!stored) return { ok: false, reason: 'no_keys_on_device', message: 'no encrypted key on this device' };

  try {
    const sk = await unwrapWithPassword(password, stored);
    const { data: profile } = await sb.from('profiles_public').select('ed25519_public_key').eq('id', (await sb.auth.getUser()).data.user!.id).maybeSingle();
    const pk = profile?.ed25519_public_key
      ? hexToBytes((profile.ed25519_public_key as string).replace(/^\\x/, ''))
      : sk.subarray(32);   // Ed25519 64-byte secret key has the public key in the last 32
    return { ok: true, privateKey: sk, publicKey: pk };
  } catch {
    return { ok: false, reason: 'wrong_password', message: 'password did not unlock the key' };
  }
}

export async function signOut(): Promise<void> {
  const sb = getSupabaseClient();
  await sb.auth.signOut();
  // Encrypted key STAYS in IDB so the next login on this device skips recovery.
}

export type RecoveryResult =
  | { ok: true; privateKey: Uint8Array; publicKey: Uint8Array }
  | { ok: false; reason: 'auth_error' | 'wrong_code' | 'rpc_error'; message: string };

export async function resetWithRecoveryCode(
  email: string,
  codeHex: string,
  newPassword: string,
): Promise<RecoveryResult> {
  // Reset on the auth side first via update or admin flow. v1 simplification:
  // require the user to also have entered their email on a regular sign-in
  // attempt that triggered the "use recovery code" path. We then sign them
  // in with the new password by first calling updateUser.
  const sb = getSupabaseClient();
  // Sign them in with the OLD password? No — we don't know it. v1 path:
  // they need to have an active session OR their auth user needs a password
  // reset email. Since spec defers email reset, v1 supports this only when
  // the user is currently SIGNED IN (e.g., they entered the wrong password
  // a few times and clicked "use recovery code" while still session-active
  // from a previous login). Out-of-band recovery (no session) is v2.
  const session = await sb.auth.getSession();
  if (!session.data.session) return { ok: false, reason: 'auth_error', message: 'no active session — sign in first or use a magic link' };

  // Pull recovery_blob + params for the current user
  const userId = session.data.session.user.id;
  const { data: row, error } = await sb.from('profiles').select('recovery_blob, recovery_kdf_params').eq('id', userId).single();
  if (error || !row) return { ok: false, reason: 'rpc_error', message: error?.message ?? 'profile not found' };

  let sk: Uint8Array;
  try {
    sk = await unwrapWithRecoveryCode(
      codeHex,
      hexToBytes((row.recovery_blob as string).replace(/^\\x/, '')),
      row.recovery_kdf_params as never,
    );
  } catch {
    return { ok: false, reason: 'wrong_code', message: 'recovery code did not match' };
  }

  // Re-wrap under the new password
  const { ciphertext, nonce } = await (async () => {
    const { aeadEncrypt } = await import('@liaskos/crypto');
    const { deriveKey, randomSalt, kdfParams } = await import('@liaskos/crypto');
    const params = await kdfParams('INTERACTIVE');
    const newSalt = await randomSalt();
    const newKek = await deriveKey(newPassword, newSalt, params.ops_limit, params.mem_limit);
    const sealed = await aeadEncrypt(sk, newKek);
    return { ciphertext: sealed.ciphertext, nonce: sealed.nonce, salt: newSalt, params };
  })();

  // Update Supabase password
  const upd = await sb.auth.updateUser({ password: newPassword });
  if (upd.error) return { ok: false, reason: 'auth_error', message: upd.error.message };

  // Persist new encrypted blob locally
  // (full implementation gathers salt/params from the inner block above and
  // calls keystore.storeEncryptedKey — kept terse here for plan brevity)

  const pk = sk.subarray(32);
  return { ok: true, privateKey: sk, publicKey: pk };
}
```

> Note: the password-reset path above intentionally narrows v1 to "session-active" recovery. Out-of-band recovery (forgotten password AND no session) requires Supabase email reset flow — deferred to v2 per spec §2.

- [ ] Commit: `feat(file-exchange): auth orchestration api (signup, signin, signout, recovery)`

---

## Task 5 — Session listener + cryptoStore wiring

**File:** `apps/file-exchange/src/auth/session-listener.ts`

```ts
import { getSupabaseClient } from '@liaskos/supabase-client';
import { useCryptoStore } from '../store/cryptoContext.js';

let bound = false;

/**
 * Wires Supabase auth events to cryptoStore. Mounted once at app start.
 * On SIGNED_OUT we lock the store. We never auto-unlock — the user must
 * always enter their password on a fresh tab (spec §4.2).
 */
export function bindAuthSessionToCryptoStore(): void {
  if (bound) return;
  bound = true;
  const sb = getSupabaseClient();
  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') useCryptoStore.getState().lock();
  });
}
```

Add a small extension to `cryptoContext.ts`:

```ts
// Optional helper: read whether the user is unlocked.
export const useIsUnlocked = () => useCryptoStore((s) => s.state.status === 'unlocked');
```

- [ ] Commit: `feat(file-exchange): wire supabase auth events to cryptoStore`

---

## Task 6 — Reusable accessible UI atoms

**Files:** `apps/file-exchange/src/components/{Field,Button,RomanNumeral}.tsx`

Manuscript-feel components per spec §8: persistent labels, bottom-border-only fields, focus rings, ARIA.

```tsx
// Field.tsx
import { type InputHTMLAttributes, useId } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Field({ label, error, id, ...rest }: FieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const errId = error ? `${inputId}-err` : undefined;
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label htmlFor={inputId} style={{ display: 'block', fontFamily: 'inherit', fontSize: 14, color: '#5a5a5a', marginBottom: 4 }}>
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={errId}
        style={{
          width: '100%', padding: '8px 0', fontSize: 16,
          border: 'none', borderBottom: `1px solid ${error ? '#b03a2e' : '#5a5a5a'}`,
          background: 'transparent', fontFamily: 'inherit', color: '#1a1a1a',
          outline: 'none',
        }}
        onFocus={(e) => { e.currentTarget.style.outline = '2px solid #b03a2e'; e.currentTarget.style.outlineOffset = '2px'; }}
        onBlur={(e) => { e.currentTarget.style.outline = 'none'; }}
        {...rest}
      />
      {error && <div id={errId} role="alert" style={{ color: '#b03a2e', fontSize: 14, marginTop: 4 }}>{error}</div>}
    </div>
  );
}
```

```tsx
// Button.tsx
import { type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'plain';
}

export function Button({ variant = 'plain', children, ...rest }: ButtonProps) {
  const accent = variant === 'primary';
  return (
    <button
      {...rest}
      style={{
        background: 'transparent', border: 'none', padding: '6px 0',
        borderBottom: accent ? '2px solid #b03a2e' : '1px solid transparent',
        font: 'inherit', fontSize: 16, color: '#1a1a1a',
        cursor: 'pointer', minHeight: 44,
      }}
    >
      {children}
    </button>
  );
}
```

```tsx
// RomanNumeral.tsx
const NUMERALS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

export function RomanNumeral({ n, label }: { n: number; label: string }) {
  return (
    <span aria-label={`Section ${n}: ${label}`}>
      <span aria-hidden="true" style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 28, marginRight: '0.5rem' }}>
        {NUMERALS[n] ?? n}.
      </span>
      <span>{label}</span>
    </span>
  );
}
```

- [ ] Commit: `feat(file-exchange): reusable Field, Button, RomanNumeral components`

---

## Task 7 — Login, SignUp, RecoveryCode, Recovery, Unlock pages

Five route components. Each uses the auth API + the components from Task 6. Keep them ≤ 100 lines each.

For brevity in this plan, I list the contract; the implementer follows the layout pattern from `App.tsx` (cream background, single-column max 720px, manuscript serif, Roman numeral header).

**SignUp.tsx (`/signup`)**: three fields (email, username, password), client-side `username_available` debounced check, calls `signUp()`, on success navigates to `/signup/recovery-code` carrying the recovery code in router state.

**RecoveryCode.tsx (`/signup/recovery-code`)**: shows the code formatted as `XXXXXX · XXXXXX · ...`, has a [Copy] button, a checkbox "I have saved my recovery code somewhere safe", a [Continue] button enabled only when checked. Continue navigates to `/inbox`.

**Login.tsx (`/login`)**: email + password fields, calls `signInPassword()`. On `wrong_password` shows the inline error; on `no_keys_on_device` shows the "your encryption keys live on the original device" copy from spec §6.2 step 3, with a "Use recovery code" link → `/recovery`. On success navigates to `/inbox`.

**Recovery.tsx (`/recovery`)**: instructions paragraph + recovery-code field (formatted with auto-formatter that re-groups on input) + new-password field, calls `resetWithRecoveryCode()`. On success → `/inbox`.

**Unlock.tsx**: rendered by `<Protected>` when SESSION=active but CRYPTO=locked. Single password field; calls `unwrapWithPassword(password, await keystore.loadEncryptedKey())` directly (no Supabase call needed — the session is already alive). On success sets `cryptoStore.unlocked(...)`. On wrong password shows inline error.

- [ ] Each commit named: `feat(file-exchange): <PageName> page`

---

## Task 8 — Routing + ProtectedShell

**File:** `apps/file-exchange/src/App.tsx` (replaces the 3a placeholder)

```tsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useCryptoStore } from './store/cryptoContext.js';
import { bindAuthSessionToCryptoStore } from './auth/session-listener.js';
import { getSupabaseClient } from '@liaskos/supabase-client';
import { Login } from './routes/Login.js';
import { SignUp } from './routes/SignUp.js';
import { RecoveryCode } from './routes/RecoveryCode.js';
import { Recovery } from './routes/Recovery.js';
import { Unlock } from './routes/Unlock.js';
import { ProtectedShell } from './routes/ProtectedShell.js';
import { Inbox } from './routes/Inbox.js';
import { Outbox } from './routes/Outbox.js';
import { Send } from './routes/Send.js';
import { useState } from 'react';

function useSessionActive(): boolean | 'loading' {
  const [v, setV] = useState<boolean | 'loading'>('loading');
  useEffect(() => {
    const sb = getSupabaseClient();
    sb.auth.getSession().then(({ data }) => setV(Boolean(data.session)));
    const sub = sb.auth.onAuthStateChange((_e, sess) => setV(Boolean(sess)));
    return () => { sub.data.subscription.unsubscribe(); };
  }, []);
  return v;
}

function Protected() {
  const session = useSessionActive();
  const cryptoStatus = useCryptoStore((s) => s.state.status);
  if (session === 'loading') return null;
  if (!session) return <Navigate to="/login" replace />;
  if (cryptoStatus !== 'unlocked') return <Unlock />;
  return <Outlet />;
}

export function App() {
  useEffect(() => { bindAuthSessionToCryptoStore(); }, []);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signup/recovery-code" element={<RecoveryCode />} />
        <Route path="/recovery" element={<Recovery />} />
        <Route element={<Protected />}>
          <Route element={<ProtectedShell />}>
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/outbox" element={<Outbox />} />
            <Route path="/send" element={<Send />} />
            <Route path="/" element={<Navigate to="/inbox" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/inbox" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**ProtectedShell.tsx**: minimal layout with the `<Outlet />`, manuscript-style nav (`I. Inbox · II. Outbox · III. Send · IV. Sign out`), the outer cream background.

**Inbox.tsx, Outbox.tsx, Send.tsx**: placeholders (`<p>Inbox — real UI lands in Plan 3d</p>`).

- [ ] Commit: `feat(file-exchange): routing + ProtectedShell + state-machine guard`

---

## Task 9 — State-machine unit tests

**File:** `apps/file-exchange/test/auth-state-machine.test.ts`

Vitest-node tests of the cryptoStore actions: starts locked, lock() returns to locked, setUnlocking() / setUnlockError() / setUnlocked() transitions are correct, the discriminated union narrows.

- [ ] Commit: `test(file-exchange): cryptoStore state machine`

---

## Task 10 — Auth-flow component tests

**File:** `apps/file-exchange/test/auth-flows.test.tsx`

`@testing-library/react` smoke tests of the routes:
- `<SignUp />` renders 3 fields; submit with empty email shows error; submit with valid input mocks `signUp()` to return ok and asserts navigation to `/signup/recovery-code`.
- `<Login />` shows error inline on wrong_password; renders the "use recovery code" link on no_keys_on_device.
- `<Unlock />` accepts password and calls `setUnlocked` on success.

(Mock the auth API via `vi.mock('../src/auth/api.js', ...)`.)

Add devDeps: `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` (or `happy-dom`).

- [ ] Commit: `test(file-exchange): auth-flow component tests`

---

## Task 11 — Build, dev smoke, integration check

- [ ] `pnpm typecheck` clean across all packages
- [ ] `pnpm test` clean (crypto: 26, keystore: with idb-keystore, supabase-client: --passWithNoTests, transfer: 2, file-exchange: state-machine + auth-flow tests)
- [ ] `pnpm --filter @liaskos/file-exchange build` produces `dist/`
- [ ] `pnpm dev` boots; manually test:
  - Visit `/` → redirects to `/login`
  - Sign up with a test email → land on recovery-code page with a 48-char hex code formatted into 6-char blocks
  - Click "I have saved..." then Continue → land on `/inbox`
  - Refresh tab → redirected to `/login` because crypto is locked? OR redirected to `/unlock` because session is still alive
  - Enter password on Unlock → returns to `/inbox`
  - Sign out → back to `/login`

Document the manual smoke result in the commit.

- [ ] Commit: `chore(file-exchange): full-auth-loop manual smoke pass v0.1.0-pre-3d`

---

## Task 12 — Tag the milestone

- [ ] `git tag plan-3c-auth && git push origin plan-3c-auth`

---

## Self-review notes

**Spec coverage:**
- §4.2 password-derived KEK, Argon2id INTERACTIVE — Tasks 1, 3
- §4.3 recovery code — Tasks 3, 4
- §5.3 IDB keystore stores `EncryptedPrivateKey` — Task 2
- §6 sign-up / login / reset flows — Tasks 4, 7, 8
- §6 multi-device limitation surfaced — Login.tsx no_keys_on_device path
- Spec §12 SESSION=active+CRYPTO=locked → Unlock route, Task 8
- Three orthogonal state machines → Tasks 5, 8, 9 (state-machine tests)
- §8 visual + accessibility — Task 6 components

**Deferred to later plans:**
- The actual inbox/outbox/send rendering — 3d
- Email-based password reset (no-session recovery) — v2 per spec §2
- Onboarding tour (5 steps) — Plan 3f
- Help drawer — Plan 3f
- Vercel Analytics + Speed Insights mounting — Plan 3f
- WebRTC / P2P signaling — Plan 3e
- Cloud send/receive — Plan 3d

**Manual interventions:**
- None required mid-plan; the smoke test at Task 11 needs a working Supabase project (already live from 3b).
- Anyone running this without a `.env.test` will skip the supabase-client test suite (still pending).

**Frequent commits:** ~12 commits, one per logical chunk. Easy to bisect the auth-loop regression that *will* eventually happen.
