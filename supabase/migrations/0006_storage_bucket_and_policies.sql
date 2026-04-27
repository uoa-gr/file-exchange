-- Private bucket; client access strictly RLS-gated.
insert into storage.buckets (id, name, public, file_size_limit)
  values ('send-payloads', 'send-payloads', false, 200 * 1024 * 1024)
  on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit;

-- Sender can INSERT only into their own user-id-prefixed folder.
create policy "send_payloads_sender_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'send-payloads'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Recipient can SELECT (download) only objects of staged sends addressed to them.
create policy "send_payloads_recipient_download" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'send-payloads'
    and exists (
      select 1 from public.sends s
       where s.storage_object = storage.objects.name
         and s.recipient_id = (select auth.uid())
         and s.status = 'staged'
    )
  );

-- Sender can UPDATE their own object metadata (resumable uploads, etc.).
create policy "send_payloads_sender_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'send-payloads'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'send-payloads'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- DELETE is service-role only (drained by the storage-deletion-worker
-- Edge Function). No client-facing policy created.
