-- Realtime Authorization: gate `broadcast` topic membership on signal: channels.
-- Topic format: signal:<send_id>. Only the sender or recipient of the
-- referenced send may join; anyone else is rejected.
--
-- Requires Supabase Realtime Authorization to be enabled on the project
-- (Dashboard → Realtime → Authorization, or supabase CLI). Until that
-- toggle flips, realtime.messages does not exist and this migration is a
-- no-op — signaling falls back to UUID-as-secret + DTLS fingerprint binding
-- from the signed manifest (still secure end-to-end, less defense in depth).
--
-- Re-applying this migration after Realtime Authorization is enabled is
-- safe; the policies will be created on the now-existing realtime.messages
-- table.

do $$
begin
  if exists (
    select 1 from information_schema.tables
     where table_schema = 'realtime' and table_name = 'messages'
  ) then
    -- Drop any existing policies of these names so re-application is idempotent.
    drop policy if exists "signal_channel_party_only_select" on realtime.messages;
    drop policy if exists "signal_channel_party_only_insert" on realtime.messages;

    create policy "signal_channel_party_only_select"
      on realtime.messages
      for select
      to authenticated
      using (
        realtime.topic() like 'signal:%'
        and exists (
          select 1 from public.sends s
           where s.id::text = substring(realtime.topic() from 8)
             and (select auth.uid()) in (s.sender_id, s.recipient_id)
        )
      );

    create policy "signal_channel_party_only_insert"
      on realtime.messages
      for insert
      to authenticated
      with check (
        realtime.topic() like 'signal:%'
        and exists (
          select 1 from public.sends s
           where s.id::text = substring(realtime.topic() from 8)
             and (select auth.uid()) in (s.sender_id, s.recipient_id)
        )
      );

    raise notice 'Realtime Authorization policies applied on realtime.messages';
  else
    raise notice 'realtime.messages does not exist; Realtime Authorization policies skipped. Enable Realtime Authorization in the Supabase dashboard, then re-run this migration.';
  end if;
end$$;
