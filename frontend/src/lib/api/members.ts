import { supabase } from '../supabase'
import type { FrontendGroup, FrontendMember, MemberStatus } from './types'

function toStatus(raw: string | null | undefined): MemberStatus {
  if (raw === 'active' || raw === 'graduated') return raw
  return 'unknown'
}

function toMember(raw: Record<string, unknown>, groups: Map<string, FrontendGroup>): FrontendMember {
  const groupId = String(raw.group_id ?? '')
  const group = groups.get(groupId)
  const name = String(raw.name ?? '')
  return {
    id: String(raw.id),
    name,
    nickname: raw.nickname ? String(raw.nickname) : undefined,
    slug: String(raw.slug ?? ''),
    photoUrl: raw.photo_url ? String(raw.photo_url) : undefined,
    bio: raw.bio ? String(raw.bio) : undefined,
    generation: typeof raw.generation === 'number' ? raw.generation : undefined,
    team: raw.team ? String(raw.team) : undefined,
    status: toStatus(raw.status as string | null | undefined),
    isActive: Boolean((raw.is_active as boolean | null) ?? true),
    birthDate: raw.birth_date ? String(raw.birth_date) : undefined,
    birthPlace: raw.birth_place ? String(raw.birth_place) : undefined,
    heightCm: typeof raw.height_cm === 'number' ? raw.height_cm : undefined,
    bloodType: raw.blood_type ? String(raw.blood_type) : undefined,
    joinedDate: raw.joined_date ? String(raw.joined_date) : undefined,
    graduationDate: raw.graduation_date ? String(raw.graduation_date) : undefined,
    officialProfileUrl: raw.official_profile_url ? String(raw.official_profile_url) : undefined,
    source: raw.source ? String(raw.source) : undefined,
    groupId,
    groupName: group?.name ?? 'Unknown',
    primaryColor: group?.primaryColor ?? '#e86f61',
    secondaryColor: group?.secondaryColor ?? '#ffffff',
    glowColor: group?.glowColor ?? 'rgba(120,120,120,.18)',
  }
}

/** Fetch all members (RLS: authenticated may read active members). Empty -> [] */
export async function fetchMembers(groups: FrontendGroup[]): Promise<FrontendMember[]> {
  const groupMap = new Map(groups.map((group) => [group.id, group]))
  const { data, error } = await supabase.from('members').select('*').order('name')
  if (error) throw new Error('Gagal memuat member')
  return (data ?? []).map((row) => toMember(row, groupMap))
}

export async function fetchMemberBySlug(slug: string, groups: FrontendGroup[]): Promise<FrontendMember | null> {
  const groupMap = new Map(groups.map((group) => [group.id, group]))
  const { data, error } = await supabase.from('members').select('*').eq('slug', slug).maybeSingle()
  if (error) throw new Error('Gagal memuat member')
  return data ? toMember(data, groupMap) : null
}
