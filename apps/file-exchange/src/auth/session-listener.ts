import { getSupabaseClient } from '@liaskos/supabase-client';
import { useCryptoStore } from '../store/cryptoContext.js';

let bound = false;

/**
 * Wires Supabase auth events to cryptoStore. Mounted once at app start.
 * On SIGNED_OUT we lock the store. We never auto-unlock — the user must
 * always enter their password on a fresh tab (spec section 4.2).
 */
export function bindAuthSessionToCryptoStore(): void {
  if (bound) return;
  bound = true;
  const sb = getSupabaseClient();
  sb.auth.onAuthStateChange((event: string) => {
    if (event === 'SIGNED_OUT') useCryptoStore.getState().lock();
  });
}
