import { create } from 'zustand';

/**
 * Three orthogonal state machines per spec section 6:
 *   SUPABASE SESSION (handled by supabase-js, Plan 3b)
 *   CRYPTO UNLOCK    (this store)
 *   IN-FLIGHT XFER   (per-transfer stores in Plans 3d/3e)
 *
 * SESSION=active + CRYPTO=locked is reachable: tab reload restores
 * the session from localStorage but the in-memory key is gone.
 * Route guards must check both.
 */

export type CryptoState =
  | { status: 'locked' }
  | { status: 'unlocking'; error?: string }
  | { status: 'unlocked'; privateKey: Uint8Array; publicKey: Uint8Array };

interface CryptoStore {
  state: CryptoState;
  lock(): void;
  setUnlocking(): void;
  setUnlockError(error: string): void;
  setUnlocked(privateKey: Uint8Array, publicKey: Uint8Array): void;
}

export const useCryptoStore = create<CryptoStore>((set) => ({
  state: { status: 'locked' },
  lock: () => set({ state: { status: 'locked' } }),
  setUnlocking: () => set({ state: { status: 'unlocking' } }),
  setUnlockError: (error) => set({ state: { status: 'unlocking', error } }),
  setUnlocked: (privateKey, publicKey) =>
    set({ state: { status: 'unlocked', privateKey, publicKey } }),
}));
