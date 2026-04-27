import { createClient as supaCreateClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env.js';
import type { Database } from './database.js';

export type FileExchangeClient = SupabaseClient<Database>;

let _client: FileExchangeClient | null = null;

/**
 * Returns the singleton supabase-js client. Apps must NEVER import
 * `createClient` from `@supabase/supabase-js` directly — go through
 * this factory so all auth/storage settings stay consistent.
 */
export function getSupabaseClient(): FileExchangeClient {
  if (_client) return _client;
  _client = supaCreateClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'file-exchange-auth',
    },
  });
  return _client;
}

/**
 * Reset the singleton (tests only). Production code never calls this.
 */
export function __resetSupabaseClient(): void {
  _client = null;
}
