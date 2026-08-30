-- Extended member import fields + provenance + richer group metadata.
-- Run after 0003_live_tracking.sql.

alter table public.groups add column if not exists slug text;
alter table public.groups add column if not exists country text;
alter table public.groups add column if not exists description text not null default '';
alter table public.groups add column if not exists logo_url text;
alter table public.groups add column if not exists official_url text;

create unique index if not exists groups_slug_idx on public.groups(slug) where slug is not null;

alter table public.members add column if not exists nickname text;
alter table public.members add column if not exists generation integer;
alter table public.members add column if not exists birth_date date;
alter table public.members add column if not exists birth_place text;
alter table public.members add column if not exists height_cm integer;
alter table public.members add column if not exists blood_type text;
alter table public.members add column if not exists joined_date date;
alter table public.members add column if not exists graduation_date date;
alter table public.members add column if not exists status text not null default 'unknown'
  check (status in ('active', 'graduated', 'unknown'));
alter table public.members add column if not exists official_profile_url text;
alter table public.members add column if not exists source text;
alter table public.members add column if not exists source_url text;
alter table public.members add column if not exists source_identifier text;
alter table public.members add column if not exists last_verified_at timestamptz;

-- Stable identity for idempotent imports: one row per (group, source identifier).
create unique index if not exists members_group_source_identifier_idx
  on public.members(group_id, source_identifier)
  where source_identifier is not null;

comment on column public.members.source_identifier is 'Stable external identifier used to keep imports idempotent per group';
comment on column public.members.source is 'Provenance: which source produced this record (e.g. jkt48.com)';
comment on column public.members.source_url is 'Provenance: URL the record was imported from';
comment on column public.members.last_verified_at is 'Provenance: last time the record was verified against its source';
