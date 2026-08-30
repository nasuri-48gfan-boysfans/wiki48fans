-- Stable platform identifiers for live tracking.
-- Run after 0002_core_schema.sql.

alter table public.members add column if not exists showroom_room_id text;
alter table public.members add column if not exists idn_user_id text;

create unique index if not exists members_showroom_room_id_idx
  on public.members(showroom_room_id) where showroom_room_id is not null;
create unique index if not exists members_idn_user_id_idx
  on public.members(idn_user_id) where idn_user_id is not null;

comment on column public.members.showroom_room_id is 'Stable SHOWROOM room_id used by the server-side tracker';
comment on column public.members.idn_user_id is 'Stable IDN user ID used by the server-side tracker';
