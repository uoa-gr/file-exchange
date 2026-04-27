-- Dedicated schema for Postgres extensions per Supabase advisor 0014.
create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;

create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Identity directory. Public columns are world-readable for typeahead +
-- key wrapping; recovery_blob is owner-only.
create table public.profiles (
  id                       uuid       primary key references auth.users(id) on delete cascade,
  username                 extensions.citext  unique not null,
  display_name             text,
  ed25519_public_key       bytea      not null check (octet_length(ed25519_public_key) = 32),
  recovery_blob            bytea      not null,
  recovery_kdf_params      jsonb      not null,
  created_at               timestamptz not null default now(),
  check (username::text ~ '^[a-z0-9_]{3,20}$')
);

create index profiles_username_trgm on public.profiles
  using gin (username extensions.gin_trgm_ops);

-- Public-readable view that strips recovery_blob + recovery_kdf_params.
-- security_invoker = true ensures RLS policies of the QUERYING user apply,
-- not the view owner's (advisor 0010).
create view public.profiles_public
  with (security_invoker = true) as
  select id, username, display_name, ed25519_public_key, created_at
  from public.profiles;

grant select on public.profiles_public to anon, authenticated;

-- RLS on profiles itself.
-- profiles_public_read makes the public columns world-readable via the view
-- (typeahead + key wrapping). profiles_self_update lets only the row owner
-- update their own row. INSERT is gated by the create_profile RPC.
-- auth.uid() is wrapped in (select ...) so it's evaluated once per query
-- rather than once per row (advisor 0003).
alter table public.profiles enable row level security;

create policy "profiles_public_read" on public.profiles
  for select to anon, authenticated
  using (true);

create policy "profiles_self_update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- INSERT happens only via the create_profile RPC (Migration 0004), so no
-- direct INSERT policy is granted to clients.

comment on table public.profiles is
  'User identity. Public-readable columns: id, username, display_name, ed25519_public_key, created_at (via profiles_public view). recovery_blob is owner-only and never exposed via the view.';
