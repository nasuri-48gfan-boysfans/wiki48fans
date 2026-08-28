import type { MemberRecord } from '../memberTypes.js'
import type { SourceAdapter } from '../memberImporter.js'

/**
 * Official JKT48 member pages render data client-side from an internal API.
 * The list/page endpoints are served behind a Cloudflare anti-bot challenge, so
 * direct programmatic access is blocked. This adapter targets the official
 * site's member pages and keeps the HTTP layer isolated so a future proxy or
 * consumed payload can be dropped in without touching normalization.
 */

type MemberFetcher = (url: string, init?: RequestInit) => Promise<Response>

const MEMBER_LIST_URL = 'https://jkt48.com/member?lang=id'

export interface Jkt48RawMember {
  id: number
  full_name?: string | null
  nickname?: string | null
  // Mirrors the official JKT48 member page fields used for normalization.
  team_name?: string | null
  generation_name?: string | null
  birthday?: string | null
  blood_type?: string | null
  height?: number | string | null
  birth_place?: string | null
  join_date?: string | null
  graduate_date?: string | null
  status?: string | null
  profile_image?: string | null
  url_key?: string | null
}

/** Shared helpers for turning JKT48 source values into normalized records. */

export function jkt48Slug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function parseGeneration(value: string | null | undefined): number | undefined {
  if (!value) return undefined
  const match = value.match(/(\d+)/)
  if (!match) return undefined
  const number = Number(match[1])
  return number >= 1 ? number : undefined
}

function parseDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString().slice(0, 10)
}

function parseHeight(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined
  const number = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(number) || number < 80 || number > 300) return undefined
  return Math.round(number)
}

function normalizeStatus(value: string | null | undefined): MemberRecord['status'] {
  const status = (value || '').toLowerCase()
  if (status.includes('graduate')) return 'graduated'
  if (status.includes('active')) return 'active'
  return 'unknown'
}

/** Parse + normalize a raw JKT48 payload into a `MemberRecord`. */
export function normalizeJkt48(raw: Jkt48RawMember, source: string): MemberRecord {
  if (raw.full_name && raw.id) {
    // Use explicit id when both name and id exist (official mobile API shape).
    return {
      slug: jkt48Slug(raw.full_name) || String(raw.id),
      name: raw.full_name,
      nickname: raw.nickname || undefined,
      generation: parseGeneration(raw.generation_name),
      birthDate: parseDate(raw.birthday),
      birthPlace: raw.birth_place || undefined,
      heightCm: parseHeight(raw.height),
      bloodType: raw.blood_type || undefined,
      joinedDate: parseDate(raw.join_date),
      graduationDate: parseDate(raw.graduate_date),
      status: normalizeStatus(raw.status),
      profileImageUrl: raw.profile_image || undefined,
      officialProfileUrl: raw.url_key ? `https://jkt48.com/member/detail/id/${raw.id}` : undefined,
      sourceIdentifier: String(raw.id),
      source,
    }
  }
  if (!raw.full_name) throw new Error('JKT48 member record is missing full_name')
  throw new Error(`JKT48 member "${raw.full_name}" is missing a stable id`)
}

/**
 * Adapter for the official JKT48 website. `status` is derived from the source,
 * `sourceIdentifier` is the official member id to keep imports idempotent.
 */
export class Jkt48Adapter implements SourceAdapter {
  readonly groupSlug = 'jkt48'
  constructor(
    private readonly fetchImpl: MemberFetcher = defaultFetch,
    private readonly source = 'jkt48.com',
  ) {}
  async fetchList(): Promise<MemberRecord[]> {
    const response = await this.fetchImpl(MEMBER_LIST_URL)
    if (!response.ok) {
      throw new Error(`JKT48 official site returned ${response.status}. The jkt48.com pages are protected by a Cloudflare anti-bot challenge and are not programmatically accessible.`)
    }
    const payload = (await response.json()) as { members?: Jkt48RawMember[] }
    const members = Array.isArray(payload.members) ? payload.members : []
    return members.map((raw) => normalizeJkt48(raw, this.source))
  }
}

async function defaultFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      accept: 'application/json',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) 48FansWiki',
      ...init?.headers,
    },
    signal: AbortSignal.timeout(15000),
  })
}
