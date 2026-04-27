create extension if not exists pg_cron with schema extensions;

-- Sweep abandoned reservations every minute. Refunds the global pool
-- and per-user counter for tokens that timed out without commit_upload.
create or replace function public.sweep_pending_uploads() returns void
  language plpgsql security definer set search_path = public, pg_temp as $$
declare v_total bigint := 0;
begin
  with expired as (
    delete from public.pending_uploads where expires_at < now()
    returning sender_id, size_bytes
  ),
  per_user as (
    select sender_id, sum(size_bytes) as bytes from expired group by sender_id
  ),
  refund as (
    update public.user_quota_state u
       set pending_bytes = greatest(0, u.pending_bytes - p.bytes),
           updated_at = now()
      from per_user p
     where u.user_id = p.sender_id
     returning p.bytes
  )
  select coalesce(sum(bytes), 0) into v_total from refund;

  if v_total > 0 then
    update public.global_quota_state set used_bytes = greatest(0, used_bytes - v_total);
  end if;
end$$;

-- Expire stale staged sends every 5 minutes; flip status, refund quota
-- counters for cloud sends, enqueue storage deletions.
create or replace function public.expire_sends() returns void
  language plpgsql security definer set search_path = public, pg_temp as $$
declare v_total bigint := 0;
begin
  with expired as (
    update public.sends set status = 'expired'
     where status = 'staged' and expires_at < now()
     returning sender_id, size_bytes, transport, storage_object
  ),
  cloud_per_user as (
    select sender_id, sum(size_bytes) as bytes
      from expired where transport = 'cloud'
     group by sender_id
  ),
  refund as (
    update public.user_quota_state u
       set pending_bytes = greatest(0, u.pending_bytes - p.bytes),
           updated_at = now()
      from cloud_per_user p
     where u.user_id = p.sender_id
     returning p.bytes
  ),
  enqueue as (
    insert into public.object_deletion_jobs (storage_object)
    select storage_object from expired
     where transport = 'cloud' and storage_object is not null
    on conflict do nothing
    returning 1
  )
  select coalesce(sum(bytes), 0) into v_total from refund;

  if v_total > 0 then
    update public.global_quota_state set used_bytes = greatest(0, used_bytes - v_total);
  end if;
end$$;

select cron.schedule('sweep_pending', '* * * * *', $$select public.sweep_pending_uploads()$$);
select cron.schedule('expire_sends', '*/5 * * * *', $$select public.expire_sends()$$);
