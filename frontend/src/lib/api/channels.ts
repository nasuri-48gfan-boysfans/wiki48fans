import { supabase } from '../supabase'

export interface Channel {
  id: string
  name: string
  description: string
  memberCount?: number
}

/** Fetch visible channels (RLS: authenticated sees active channels). Empty -> [] */
export async function fetchChannels(): Promise<Channel[]> {
  const { data, error } = await supabase.from('channels').select('*').order('name')
  if (error) throw new Error('Gagal memuat channel')
  return (data ?? []).map((raw) => ({
    id: String(raw.id),
    name: String(raw.name ?? ''),
    description: String(raw.description ?? ''),
  }))
}
