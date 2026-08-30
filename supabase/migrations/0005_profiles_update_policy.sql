-- Allow an authenticated user to update only their own profile.
-- Enables Oshi selection (oshi_ids) and profile edits (display_name, handle, avatar_url)
-- via the authenticated Supabase client. RLS stays enabled; no service-role workaround.

alter table public.profiles enable row level security;

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
