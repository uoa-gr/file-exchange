-- =========================================================================
-- create_profile: atomic signup step 2.
-- =========================================================================
create or replace function public.create_profile(
  p_username extensions.citext,
  p_ed25519_public_key bytea,
  p_recovery_blob bytea,
  p_recovery_kdf_params jsonb
) returns public.profiles
  language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare r public.profiles;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode = 'P0001';
  end if;
  if octet_length(p_ed25519_public_key) <> 32 then
    raise exception 'invalid_public_key_length' using errcode = 'P0001';
  end if;
  insert into public.profiles (id, username, ed25519_public_key, recovery_blob, recovery_kdf_params)
       values (auth.uid(), p_username, p_ed25519_public_key, p_recovery_blob, p_recovery_kdf_params)
    returning * into r;
  return r;
exception when unique_violation then
  raise exception 'username_taken' using errcode = 'P0001';
end$$;
grant execute on function public.create_profile(extensions.citext, bytea, bytea, jsonb) to authenticated;

-- =========================================================================
-- username_available: cheap pre-check before signup attempt.
-- =========================================================================
create or replace function public.username_available(p_username extensions.citext)
  returns boolean language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select not exists (select 1 from public.profiles where username = p_username);
$$;
grant execute on function public.username_available(extensions.citext) to anon, authenticated;

-- =========================================================================
-- reserve_quota: atomic global + per-user reservation.
-- 200 MB per file, 500 MB per-user pending cap.
-- =========================================================================
create or replace function public.reserve_quota(p_size bigint)
  returns table (ok boolean, free bigint, token uuid)
  language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_user_used bigint;
  v_token uuid;
  v_free bigint;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = 'P0001'; end if;
  if p_size <= 0 then raise exception 'invalid_size' using errcode = 'P0001'; end if;
  if p_size > 200 * 1024 * 1024 then
    return query select false, 0::bigint, null::uuid; return;
  end if;

  select coalesce(pending_bytes, 0) into v_user_used from public.user_quota_state where user_id = v_uid;
  if coalesce(v_user_used, 0) + p_size > 500 * 1024 * 1024 then
    return query select false, (500 * 1024 * 1024 - coalesce(v_user_used, 0))::bigint, null::uuid; return;
  end if;

  update public.global_quota_state
     set used_bytes = used_bytes + p_size
   where used_bytes + p_size <= total_capacity_bytes
   returning total_capacity_bytes - used_bytes into v_free;

  if not found then
    select total_capacity_bytes - used_bytes into v_free from public.global_quota_state;
    return query select false, v_free, null::uuid; return;
  end if;

  insert into public.user_quota_state (user_id, pending_bytes)
       values (v_uid, p_size)
    on conflict (user_id) do update
      set pending_bytes = public.user_quota_state.pending_bytes + p_size,
          updated_at = now();

  insert into public.pending_uploads (sender_id, size_bytes)
       values (v_uid, p_size)
    returning token into v_token;

  return query select true, v_free, v_token;
end$$;
grant execute on function public.reserve_quota(bigint) to authenticated;

-- =========================================================================
-- commit_upload: validates storage object exists, atomically inserts sends row.
-- =========================================================================
create or replace function public.commit_upload(
  p_token uuid,
  p_recipient_id uuid,
  p_transport text,
  p_storage_object text,
  p_size_bytes bigint,
  p_encrypted_manifest bytea,
  p_manifest_sig bytea,
  p_wrapped_key bytea
) returns public.sends
  language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_pending public.pending_uploads%rowtype;
  r public.sends;
begin
  if v_uid is null then raise exception 'unauthenticated' using errcode = 'P0001'; end if;

  delete from public.pending_uploads
   where token = p_token and sender_id = v_uid
   returning * into v_pending;
  if not found then raise exception 'invalid_or_expired_token' using errcode = 'P0001'; end if;

  if v_pending.size_bytes <> p_size_bytes then
    update public.global_quota_state set used_bytes = greatest(0, used_bytes - v_pending.size_bytes);
    update public.user_quota_state set pending_bytes = greatest(0, pending_bytes - v_pending.size_bytes) where user_id = v_uid;
    raise exception 'size_mismatch' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.profiles where id = p_recipient_id) then
    update public.global_quota_state set used_bytes = greatest(0, used_bytes - v_pending.size_bytes);
    update public.user_quota_state set pending_bytes = greatest(0, pending_bytes - v_pending.size_bytes) where user_id = v_uid;
    raise exception 'recipient_not_found' using errcode = 'P0001';
  end if;

  if p_transport not in ('cloud', 'p2p') then
    raise exception 'invalid_transport' using errcode = 'P0001';
  end if;

  if p_transport = 'cloud' and p_storage_object is null then
    raise exception 'cloud_requires_storage_object' using errcode = 'P0001';
  end if;
  if p_transport = 'p2p' and p_storage_object is not null then
    raise exception 'p2p_must_have_null_storage_object' using errcode = 'P0001';
  end if;

  if p_transport = 'cloud' and not exists (
    select 1 from storage.objects where bucket_id = 'send-payloads' and name = p_storage_object
  ) then
    update public.global_quota_state set used_bytes = greatest(0, used_bytes - v_pending.size_bytes);
    update public.user_quota_state set pending_bytes = greatest(0, pending_bytes - v_pending.size_bytes) where user_id = v_uid;
    raise exception 'storage_object_missing' using errcode = 'P0001';
  end if;

  insert into public.sends (
    sender_id, recipient_id, transport, status, size_bytes, storage_object,
    encrypted_manifest, manifest_sig, wrapped_key
  ) values (
    v_uid, p_recipient_id, p_transport, 'staged', p_size_bytes, p_storage_object,
    p_encrypted_manifest, p_manifest_sig, p_wrapped_key
  ) returning * into r;

  -- For P2P, the reservation was tracked but no real Storage was used; release.
  if p_transport = 'p2p' then
    update public.global_quota_state set used_bytes = greatest(0, used_bytes - v_pending.size_bytes);
    update public.user_quota_state set pending_bytes = greatest(0, pending_bytes - v_pending.size_bytes) where user_id = v_uid;
  end if;

  return r;
end$$;
grant execute on function public.commit_upload(uuid, uuid, text, text, bigint, bytea, bytea, bytea) to authenticated;

-- =========================================================================
-- mark_delivered: recipient confirms receipt; flip status, free quota,
-- enqueue storage deletion.
-- =========================================================================
create or replace function public.mark_delivered(p_send_id uuid)
  returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.sends%rowtype;
begin
  update public.sends set status = 'delivered', delivered_at = now()
    where id = p_send_id and recipient_id = auth.uid() and status = 'staged'
    returning * into r;
  if not found then raise exception 'not_found_or_already_delivered' using errcode = 'P0001'; end if;

  if r.transport = 'cloud' then
    update public.global_quota_state set used_bytes = greatest(0, used_bytes - r.size_bytes);
    update public.user_quota_state set pending_bytes = greatest(0, pending_bytes - r.size_bytes) where user_id = r.sender_id;
    insert into public.object_deletion_jobs (storage_object) values (r.storage_object) on conflict do nothing;
  end if;
end$$;
grant execute on function public.mark_delivered(uuid) to authenticated;

-- =========================================================================
-- revoke_send: sender cancels a staged send.
-- =========================================================================
create or replace function public.revoke_send(p_send_id uuid)
  returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.sends%rowtype;
begin
  update public.sends set status = 'revoked'
    where id = p_send_id and sender_id = auth.uid() and status = 'staged'
    returning * into r;
  if not found then raise exception 'not_found_or_not_staged' using errcode = 'P0001'; end if;

  if r.transport = 'cloud' then
    update public.global_quota_state set used_bytes = greatest(0, used_bytes - r.size_bytes);
    update public.user_quota_state set pending_bytes = greatest(0, pending_bytes - r.size_bytes) where user_id = r.sender_id;
    insert into public.object_deletion_jobs (storage_object) values (r.storage_object) on conflict do nothing;
  end if;
end$$;
grant execute on function public.revoke_send(uuid) to authenticated;
