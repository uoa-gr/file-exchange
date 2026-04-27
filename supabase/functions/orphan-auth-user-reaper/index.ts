// Reaps auth.users rows that never got a matching profiles row within
// 10 minutes — i.e. signups that crashed between auth.signUp and
// create_profile. Schedule via Supabase Cron at */10 * * * *.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
// Prefer the modern SUPABASE_SECRET_KEY; fall back to the legacy injection.
const SECRET_KEY = Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY_KEY')!;
const STALE_MINUTES = 10;

Deno.serve(async () => {
  const sb = createClient(SUPABASE_URL, SECRET_KEY);

  const { data: orphans, error } = await sb.rpc('find_orphan_auth_users', { p_minutes: STALE_MINUTES });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const deleted: string[] = [];
  for (const u of (orphans as { user_id: string }[]) ?? []) {
    const { error: delErr } = await sb.auth.admin.deleteUser(u.user_id);
    if (!delErr) deleted.push(u.user_id);
  }

  return new Response(JSON.stringify({ deleted: deleted.length, ids: deleted }), {
    headers: { 'content-type': 'application/json' },
  });
});
