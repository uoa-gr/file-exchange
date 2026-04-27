import { createClient as supaCreateClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env.js';
import type { Database } from './database.js';

export type SpourgitiClient = SupabaseClient<Database>;

let _client: SpourgitiClient | null = null;

/**
 * Returns the singleton supabase-js client. Apps must NEVER import
 * `createClient` from `@supabase/supabase-js` directly — go through
 * this factory so all auth/storage settings stay consistent.
 */
export function getSupabaseClient(): SpourgitiClient {
  if (_client) return _client;
  _client = supaCreateClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'spourgiti-send-auth',
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
