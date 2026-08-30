-- Add team-level grouping so members can be filtered per team (e.g. JKT48
-- Team KIII / Team J / Team T). Run after 0005_profiles_update_policy.sql.

alter table public.members add column if not exists team text;

create index if not exists members_team_idx on public.members(team);

comment on column public.members.team is 'Team the member belongs to within their group (e.g. KIII, J, T). Populated by the 48pedia/JKT48 adapters.';
