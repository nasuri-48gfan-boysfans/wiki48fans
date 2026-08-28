create table if not exists public.roles (
  name text primary key check (name in ('user', 'contributor', 'moderator', 'admin', 'super_admin')),
  description text not null default ''
);

insert into public.roles (name, description) values
  ('user', 'Standard community access'),
  ('contributor', 'Can contribute to the Wiki'),
  ('moderator', 'Can moderate community content'),
  ('admin', 'Can manage the application'),
  ('super_admin', 'Full system control')
on conflict (name) do nothing;

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  primary_color text not null,
  secondary_color text not null,
  glow_color text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete restrict,
  name text not null,
  slug text not null unique,
  photo_url text,
  bio text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  handle text unique,
  avatar_url text,
  role text not null default 'user' references public.roles(name),
  oshi_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.groups enable row level security;
alter table public.members enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Authenticated users can view groups" on public.groups;
create policy "Authenticated users can view groups"
  on public.groups for select to authenticated using (true);
drop policy if exists "Authenticated users can view active members" on public.members;
create policy "Authenticated users can view active members"
  on public.members for select to authenticated using (is_active = true);
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, handle)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, ''), '@', 1)),
    lower(regexp_replace(coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, ''), '@', 1)), '[^a-zA-Z0-9]+', '.', 'g'))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
