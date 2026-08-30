import { supabase } from './supabase'

export async function updateOshiIds(userId: string, oshiIds: string[]) {
  const { error } = await supabase.from('profiles').update({ oshi_ids: oshiIds }).eq('id', userId)
  if (error) throw error
}

export async function updateProfile(userId: string, fields: { displayName?: string; handle?: string }) {
  const patch: Record<string, string> = {}
  if (fields.displayName !== undefined) patch.display_name = fields.displayName
  if (fields.handle !== undefined) patch.handle = fields.handle
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
  if (error) throw error
}
