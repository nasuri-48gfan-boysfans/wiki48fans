import { supabase } from '../supabase'
import type { FrontendGroup } from './types'

function toGroup(raw: Record<string, unknown>): FrontendGroup {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ''),
    slug: raw.slug ? String(raw.slug) : undefined,
    country: raw.country ? String(raw.country) : undefined,
    description: raw.description ? String(raw.description) : undefined,
    logoUrl: raw.logo_url ? String(raw.logo_url) : undefined,
    officialUrl: raw.official_url ? String(raw.official_url) : undefined,
    primaryColor: String(raw.primary_color ?? '#e86f61'),
    secondaryColor: String(raw.secondary_color ?? '#ffffff'),
    glowColor: String(raw.glow_color ?? 'rgba(120,120,120,.18)'),
  }
}

/** Fetch all groups (RLS: visible to authenticated). Empty -> [] */
export async function fetchGroups(): Promise<FrontendGroup[]> {
  const { data, error } = await supabase.from('groups').select('*').order('name')
  if (error) throw new Error('Gagal memuat grup')
  return (data ?? []).map(toGroup)
}

export async function fetchGroupById(id: string): Promise<FrontendGroup | null> {
  const { data, error } = await supabase.from('groups').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error('Gagal memuat grup')
  return data ? toGroup(data) : null
}
