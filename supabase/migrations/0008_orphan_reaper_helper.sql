-- Helper SQL for the orphan-auth-user-reaper Edge Function.
-- Returns auth.users rows that never got a matching profiles row within
-- p_minutes — i.e. signups that crashed between auth.signUp and create_profile.

create or replace function public.find_orphan_auth_users(p_minutes int)
  returns table (user_id uuid)
  language sql security definer set search_path = public, auth, pg_temp as $$
  select u.id from auth.users u
   left join public.profiles p on p.id = u.id
  where p.id is null
    and u.created_at < now() - make_interval(mins => p_minutes);
$$;

revoke all on function public.find_orphan_auth_users(int) from public;
revoke all on function public.find_orphan_auth_users(int) from anon, authenticated;
grant execute on function public.find_orphan_auth_users(int) to service_role;
