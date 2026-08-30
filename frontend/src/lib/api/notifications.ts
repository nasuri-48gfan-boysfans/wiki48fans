import { supabase } from '../supabase'

export interface AppNotification {
  id: string
  category: 'oshi' | 'following' | 'other_members' | 'community' | 'messages' | 'channels' | 'wiki' | 'system'
  title: string
  body: string
  targetUrl?: string
  read: boolean
  createdAt: string
}

function toNotification(raw: Record<string, unknown>): AppNotification {
  return {
    id: String(raw.id),
    category: (raw.category as AppNotification['category']) ?? 'system',
    title: String(raw.title ?? ''),
    body: String(raw.body ?? ''),
    targetUrl: raw.target_url ? String(raw.target_url) : undefined,
    read: Boolean(raw.read_at),
    createdAt: String(raw.created_at ?? ''),
  }
}

/** Notifications belong to the signed-in user (RLS on notifications). Empty -> [] */
export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false })
  if (error) throw new Error('Gagal memuat notifikasi')
  return (data ?? []).map(toNotification)
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids).is('read_at', null)
  if (error) throw new Error('Gagal menandai notifikasi')
}
