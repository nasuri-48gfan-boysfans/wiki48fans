import type { MemberRecord } from '../memberTypes.js'
import type { SourceAdapter } from '../memberImporter.js'
import { jkt48Slug } from './jkt48.js'

/**
 * Community JKT48 data source. The official jkt48.com site is protected by a
 * Cloudflare anti-bot challenge, so this adapter consumes JKT48Connect — a
 * public, community-maintained mirror of JKT48 member data.
 *
 * BLOCKED: requires `JKT48_CONNECT_API_KEY`, obtainable at
 * https://www.jkt48connect.my.id/buyapi. Until a key is configured this
 * adapter throws and the importer reports the missing key honestly.
 */

type MemberFetcher = (url: string, init?: RequestInit) => Promise<Response>

const MEMBERS_ENDPOINT = 'https://v2.jkt48connect.com/api/jkt48/members'

export interface Jkt48ConnectMember {
  member_id?: number | string | null
  name?: string | null
  full_name?: string | null
  nickname?: string | null
  birthday?: string | null
  birth_place?: string | null
  blood_type?: string | null
  height?: number | string | null
  generation?: number | string | null
  generation_name?: string | null
  team?: string | null
  is_active?: boolean | null
  graduation_date?: string | null
  profile_image?: string | null
  photo_url?: string | null
  idn_user_id?: string | null
  showroom_room_id?: number | string | null
}

const SOURCE = 'jkt48connect'

/** Parse + normalize a JKT48Connect member row into a `MemberRecord`. */
export function normalizeJkt48Connect(raw: Jkt48ConnectMember): MemberRecord {
  if (!raw.member_id && !raw.name && !raw.full_name) throw new Error('JKT48Connect member is missing id and name')
  const id = String(raw.member_id ?? '')
  const name = String(raw.full_name || raw.name || '')
  if (!id && !name) throw new Error('JKT48Connect member has no usable identity')
  const identifier = id || jkt48Slug(name)

  return {
    slug: jkt48Slug(name) || identifier,
    name,
    nickname: raw.nickname || undefined,
    generation: toPositiveInt(raw.generation ?? raw.generation_name),
    birthDate: toDate(raw.birthday),
    birthPlace: raw.birth_place || undefined,
    heightCm: toHeight(raw.height),
    bloodType: raw.blood_type || undefined,
    graduationDate: toDate(raw.graduation_date),
    status: raw.is_active ? 'active' : raw.graduation_date ? 'graduated' : 'unknown',
    profileImageUrl: raw.profile_image || raw.photo_url || undefined,
    sourceIdentifier: identifier,
    source: SOURCE,
    sourceUrl: MEMBERS_ENDPOINT,
    idnUserId: raw.idn_user_id || undefined,
    showroomRoomId: raw.showroom_room_id != null ? String(raw.showroom_room_id) : undefined,
  }
}

function toPositiveInt(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined
  const number = typeof value === 'number' ? value : Number(String(value).match(/\d+/)?.[0])
  return Number.isInteger(number) && number >= 1 ? number : undefined
}

function toDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10)
}

function toHeight(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined
  const number = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.]/g, ''))
  return Number.isFinite(number) && number >= 80 && number <= 300 ? Math.round(number) : undefined
}

export class Jkt48ConnectAdapter implements SourceAdapter {
  readonly groupSlug = 'jkt48'
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: MemberFetcher = defaultFetch,
  ) {}
  async fetchList(): Promise<MemberRecord[]> {
    if (!this.apiKey) throw new Error('JKT48_CONNECT_API_KEY is not set. Register a key at https://www.jkt48connect.my.id/buyapi to import JKT48 members.')
    const url = `${MEMBERS_ENDPOINT}?apikey=${encodeURIComponent(this.apiKey)}`
    const response = await this.fetchImpl(url)
    if (!response.ok) throw new Error(`JKT48Connect returned ${response.status} for the members endpoint`)
    const payload = await response.json() as { data?: Jkt48ConnectMember[] | null; members?: Jkt48ConnectMember[] | null }
    const list = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.members) ? payload.members : []
    return list.map((raw) => normalizeJkt48Connect(raw))
  }
}

async function defaultFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(15000) })
}
