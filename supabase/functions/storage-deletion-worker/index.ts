// Drains object_deletion_jobs. Schedule via Supabase Cron (Dashboard →
// Database → Cron) on a 1-minute interval, POSTing here with the
// secret-key bearer. Deletion is idempotent — DELETE on a missing
// object is a no-op. Each row is removed only after a successful delete;
// failures bump `attempts` and stash `last_error`.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
// Prefer the modern SUPABASE_SECRET_KEY (sb_secret_*); fall back to the
// legacy SUPABASE_SECRET_KEY_KEY for runtimes that still inject only that.
const SECRET_KEY = Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY_KEY')!;

const BATCH = 50;

Deno.serve(async () => {
  const sb = createClient(SUPABASE_URL, SECRET_KEY);
  const { data: jobs, error } = await sb
    .from('object_deletion_jobs')
    .select('storage_object, attempts')
    .order('enqueued_at', { ascending: true })
    .limit(BATCH);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const results: { storage_object: string; ok: boolean; reason?: string }[] = [];
  for (const job of jobs ?? []) {
    const del = await sb.storage.from('send-payloads').remove([job.storage_object]);
    if (del.error) {
      const msg = del.error.message ?? 'unknown';
      await sb
        .from('object_deletion_jobs')
        .update({ attempts: (job.attempts ?? 0) + 1, last_error: msg })
        .eq('storage_object', job.storage_object);
      results.push({ storage_object: job.storage_object, ok: false, reason: msg });
      continue;
    }
    await sb.from('object_deletion_jobs').delete().eq('storage_object', job.storage_object);
    results.push({ storage_object: job.storage_object, ok: true });
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { 'content-type': 'application/json' },
  });
});
