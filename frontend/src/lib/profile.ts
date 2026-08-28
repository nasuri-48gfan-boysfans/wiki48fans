import { supabase } from './supabase'

export async function updateOshiIds(userId: string, oshiIds: string[]) {
  const { error } = await supabase.from('profiles').update({ oshi_ids: oshiIds }).eq('id', userId)
  if (error) throw error
}
