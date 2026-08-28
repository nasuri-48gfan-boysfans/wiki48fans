import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { AuthSession, Profile, UserRole } from '../types/auth'

async function toProfile(user: User): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('id, display_name, handle, avatar_url, role, oshi_ids').eq('id', user.id).maybeSingle()
  if (error) throw new Error(`Gagal membaca profile: ${error.message}`)
  if (data) return { id: data.id, displayName: data.display_name || '48Fans member', handle: data.handle || data.id.slice(0, 8), email: user.email || '', role: data.role as UserRole, avatarUrl: data.avatar_url || undefined, oshiIds: data.oshi_ids || [] }

  const displayName = user.user_metadata.display_name || user.email?.split('@')[0] || '48Fans member'
  const { data: createdProfile, error: createError } = await supabase.from('profiles').insert({ id: user.id, display_name: displayName, handle: displayName.toLowerCase().replace(/\s+/g, '.') }).select('id, display_name, handle, avatar_url, role, oshi_ids').single()
  if (createError || !createdProfile) throw new Error(`Profile belum tersedia. Pastikan trigger dan policy INSERT profiles aktif: ${createError?.message || 'unknown error'}`)
  return { id: createdProfile.id, displayName: createdProfile.display_name || displayName, handle: createdProfile.handle || createdProfile.id.slice(0, 8), email: user.email || '', role: createdProfile.role as UserRole, avatarUrl: createdProfile.avatar_url || undefined, oshiIds: createdProfile.oshi_ids || [] }
}

async function toAuthSession(session: Session): Promise<AuthSession> { return { accessToken: session.access_token, profile: await toProfile(session.user) } }
export async function getSession(): Promise<AuthSession | null> { const { data } = await supabase.auth.getSession(); return data.session ? toAuthSession(data.session) : null }
export async function signIn(email: string, password: string): Promise<AuthSession> { const { data, error } = await supabase.auth.signInWithPassword({ email, password }); if (error || !data.session) throw error || new Error('Unable to create a session'); return toAuthSession(data.session) }
export async function signUp(email: string, password: string): Promise<AuthSession | null> { const { data, error } = await supabase.auth.signUp({ email, password }); if (error) throw error; return data.session ? toAuthSession(data.session) : null }
export async function signOut() { const { error } = await supabase.auth.signOut(); if (error) throw error }
export async function resetPassword(email: string) { const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` }); if (error) throw error }
export function onAuthStateChange(callback: (session: AuthSession | null, event: AuthChangeEvent) => void) { return supabase.auth.onAuthStateChange((event, session) => { if (session) void toAuthSession(session).then((nextSession) => callback(nextSession, event)); else callback(null, event) }) }
