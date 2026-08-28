-- Core relational schema for 48FansWiki.
-- Run after 0001_foundation.sql.

create table if not exists public.permissions (
  name text primary key,
  description text not null default ''
);

insert into public.permissions (name, description) values
  ('profile:read', 'Read profile data'),
  ('wiki:contribute', 'Create and edit Wiki content'),
  ('wiki:moderate', 'Review and revert Wiki revisions'),
  ('community:moderate', 'Moderate community content'),
  ('admin:manage', 'Manage application resources'),
  ('system:manage', 'Manage system configuration')
on conflict (name) do nothing;

create table if not exists public.role_permissions (
  role_name text not null references public.roles(name) on delete cascade,
  permission_name text not null references public.permissions(name) on delete cascade,
  primary key (role_name, permission_name)
);

insert into public.role_permissions (role_name, permission_name) values
  ('user', 'profile:read'),
  ('contributor', 'profile:read'), ('contributor', 'wiki:contribute'),
  ('moderator', 'profile:read'), ('moderator', 'wiki:contribute'), ('moderator', 'wiki:moderate'), ('moderator', 'community:moderate'),
  ('admin', 'profile:read'), ('admin', 'wiki:contribute'), ('admin', 'wiki:moderate'), ('admin', 'community:moderate'), ('admin', 'admin:manage'),
  ('super_admin', 'profile:read'), ('super_admin', 'wiki:contribute'), ('super_admin', 'wiki:moderate'), ('super_admin', 'community:moderate'), ('super_admin', 'admin:manage'), ('super_admin', 'system:manage')
on conflict do nothing;

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_name text not null references public.roles(name) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (user_id, role_name)
);

create table if not exists public.member_follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, member_id)
);

create table if not exists public.group_follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, group_id)
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  oshi boolean not null default true,
  following boolean not null default true,
  other_members boolean not null default false,
  community boolean not null default true,
  messages boolean not null default true,
  channels boolean not null default true,
  wiki boolean not null default true,
  system boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.wiki_entries (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null check (entry_type in ('group', 'member', 'song', 'event', 'history')),
  title text not null,
  slug text not null unique,
  summary text not null default '',
  body text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wiki_revisions (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.wiki_entries(id) on delete cascade,
  revision_number integer not null,
  title text not null,
  body text not null default '',
  change_summary text not null default '',
  status text not null default 'published' check (status in ('pending', 'published', 'rejected', 'reverted')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (entry_id, revision_number)
);

create table if not exists public.discussions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid references public.wiki_entries(id) on delete cascade,
  title text not null,
  body text not null,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.discussion_replies (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.friendships (
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  name text not null,
  slug text not null unique,
  description text not null default '',
  status text not null default 'pending_payment' check (status in ('pending_payment', 'active', 'suspended', 'archived')),
  payment_reference text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.channel_members (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'moderator', 'owner')),
  joined_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('oshi', 'following', 'other_members', 'community', 'messages', 'channels', 'wiki', 'system')),
  priority integer not null default 50 check (priority between 0 and 100),
  title text not null,
  body text not null default '',
  target_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null,
  target_id uuid,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at desc);
create index if not exists wiki_revisions_entry_created_idx on public.wiki_revisions(entry_id, created_at desc);
create index if not exists reports_status_created_idx on public.reports(status, created_at desc);

alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.member_follows enable row level security;
alter table public.group_follows enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.wiki_entries enable row level security;
alter table public.wiki_revisions enable row level security;
alter table public.discussions enable row level security;
alter table public.discussion_replies enable row level security;
alter table public.friendships enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.channels enable row level security;
alter table public.channel_members enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;

create or replace function public.is_conversation_member(target_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.conversation_members where conversation_id = target_conversation_id and user_id = auth.uid()); $$;

create or replace function public.has_permission(required_permission text)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles ur join public.role_permissions rp on rp.role_name = ur.role_name where ur.user_id = auth.uid() and rp.permission_name = required_permission); $$;

drop policy if exists "Users can view own role assignments" on public.user_roles;
drop policy if exists "Users can manage own member follows" on public.member_follows;
drop policy if exists "Users can manage own group follows" on public.group_follows;
drop policy if exists "Users can manage own notification preferences" on public.notification_preferences;
drop policy if exists "Authenticated users can view published Wiki" on public.wiki_entries;
drop policy if exists "Authenticated users can view revisions" on public.wiki_revisions;
drop policy if exists "Contributors can create revisions" on public.wiki_revisions;
drop policy if exists "Users can view own notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;
drop policy if exists "Users can view own friendships" on public.friendships;
drop policy if exists "Users can create friend requests" on public.friendships;
drop policy if exists "Users can respond to friend requests" on public.friendships;
drop policy if exists "Conversation members can view conversations" on public.conversation_members;
drop policy if exists "Conversation members can view messages" on public.messages;
drop policy if exists "Conversation members can send messages" on public.messages;
drop policy if exists "Users can view active channels" on public.channels;
drop policy if exists "Users can view channel membership" on public.channel_members;
drop policy if exists "Users can follow active channels" on public.channel_members;

create policy "Users can view own role assignments" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "Users can manage own member follows" on public.member_follows for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can manage own group follows" on public.group_follows for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can manage own notification preferences" on public.notification_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Authenticated users can view published Wiki" on public.wiki_entries for select to authenticated using (true);
create policy "Authenticated users can view revisions" on public.wiki_revisions for select to authenticated using (status = 'published' or created_by = auth.uid());
create policy "Contributors can create revisions" on public.wiki_revisions for insert to authenticated with check (created_by = auth.uid() and public.has_permission('wiki:contribute'));
create policy "Users can view own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "Users can update own notifications" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users can view own friendships" on public.friendships for select to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "Users can create friend requests" on public.friendships for insert to authenticated with check (requester_id = auth.uid());
create policy "Users can respond to friend requests" on public.friendships for update to authenticated using (addressee_id = auth.uid() or requester_id = auth.uid()) with check (addressee_id = auth.uid() or requester_id = auth.uid());
create policy "Conversation members can view conversations" on public.conversation_members for select to authenticated using (user_id = auth.uid());
create policy "Conversation members can view messages" on public.messages for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "Conversation members can send messages" on public.messages for insert to authenticated with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id));
create policy "Users can view active channels" on public.channels for select to authenticated using (status = 'active' or owner_id = auth.uid());
create policy "Users can view channel membership" on public.channel_members for select to authenticated using (user_id = auth.uid() or exists (select 1 from public.channels where id = channel_id and owner_id = auth.uid()));
create policy "Users can follow active channels" on public.channel_members for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.channels where id = channel_id and status = 'active'));

-- New registrations receive the default role and notification preferences.
create or replace function public.handle_new_user_core()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role_name) values (new.id, 'user') on conflict do nothing;
  insert into public.notification_preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_core on auth.users;
create trigger on_auth_user_created_core after insert on auth.users for each row execute function public.handle_new_user_core();
