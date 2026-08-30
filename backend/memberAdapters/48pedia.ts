import type { MemberRecord } from '../memberTypes.js'
import type { SourceAdapter } from '../memberImporter.js'
import { jkt48Slug } from './jkt48.js'

/**
 * JKT48 member importer sourced from the 48pedia Public API
 * (https://api.48pedia.id/v1), a read-only JSON API for JKT48 catalog data.
 *
 * Endpoints used (verified against 48pedia's published OpenAPI spec):
 *   GET /members           -> MemberListItem[] (cheap: code/name/nickname/generation/photo)
 *   GET /members/{code}    -> MemberDetail (adds birth/height/blood/joined/graduated)
 *
 * Auth: Bearer token (JKT48_48PEDIA_API_KEY). Base URL https://api.48pedia.id/v1.
 *
 * The pipeline calls fetchList() once, then fetchDetail() per member, throttled
 * by its rate limiter and cached against the database (SYNC skips fresh rows).
 */

type MemberFetcher = (url: string, init?: RequestInit) => Promise<Response>

const API_BASE = 'https://api.48pedia.id/v1'
const MEMBERS_PATH = '/members'
const PER_PAGE = 100
const REQUEST_TIMEOUT_MS = 20000
const SOURCE = '48pedia'

/** MemberListItem from GET /members */
export interface FortyEightPediaMemberListItem {
  code: string
  name: string
  nickname?: string | null
  team_code?: string | null
  generation_code?: string | null
  photo?: string | null
}

/** MemberDetail from GET /members/{code} (extends the list item). */
export interface FortyEightPediaMemberDetail extends FortyEightPediaMemberListItem {
  introduction?: string | null
  birth_place?: string | null
  birth_country?: string | null
  birth_date?: string | null
  blood_type?: string | null
  height_cm?: number | null
  horoscope?: string | null
  joined_date?: string | null
  graduated_date?: string | null
  photo_1?: string | null
  photo_2?: string | null
  photo_3?: string | null
}

interface PagedEnvelope<T> {
  code: number
  message: string
  data?: T[] | null
  meta?: { as_of: string; page: number; per_page: number; total: number } | null
}

interface DetailEnvelope {
  code: number
  message: string
  data?: FortyEightPediaMemberDetail | null
}

function slug(value: string): string {
  return jkt48Slug(value) || 'member'
}

function parseGeneration(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined
  const match = String(value).match(/(\d+)/)
  if (!match) return undefined
  const number = Number(match[1])
  return number >= 1 ? number : undefined
}

function toDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10)
}

function detailUrl(code: string): string {
  return `${API_BASE}${MEMBERS_PATH}/${encodeURIComponent(code)}`
}

function listUrl(page: number): string {
  return `${API_BASE}${MEMBERS_PATH}?page=${page}&per_page=${PER_PAGE}`
}

/** Normalize a list item (cheap base data). source_url points at the list used. */
export function normalize48pediaList(item: FortyEightPediaMemberListItem, page: number): MemberRecord {
  if (!item.code || !item.name) throw new Error('48pedia member is missing code or name')
  return {
    slug: slug(item.name),
    name: item.name,
    nickname: item.nickname || undefined,
    generation: parseGeneration(item.generation_code),
    team: item.team_code || undefined,
    status: 'active', // corrected to graduated by the detail fetch if applicable
    profileImageUrl: item.photo || undefined,
    officialProfileUrl: undefined,
    sourceIdentifier: item.code,
    source: SOURCE,
    sourceUrl: listUrl(page),
  }
}

/** Enrich a list-normalized record with detail fields. Missing fields stay undefined (NULL on write). */
export function normalize48pedia(detail: FortyEightPediaMemberDetail): MemberRecord {
  if (!detail.code || !detail.name) throw new Error('48pedia member is missing code or name')
  const status = detail.graduated_date ? 'graduated' : 'active'

  return {
    slug: slug(detail.name),
    name: detail.name,
    nickname: detail.nickname || undefined,
    generation: parseGeneration(detail.generation_code),
    team: detail.team_code || undefined,
    birthDate: toDate(detail.birth_date),
    birthPlace: detail.birth_place || undefined,
    heightCm: detail.height_cm ?? undefined,
    bloodType: detail.blood_type || undefined,
    joinedDate: toDate(detail.joined_date),
    graduationDate: toDate(detail.graduated_date),
    status,
    profileImageUrl: detail.photo || detail.photo_1 || undefined,
    // 48pedia exposes no stable URL mapping to the official jkt48.com profile;
    // fabricating one would be dishonest, so it is left NULL (per importer rules).
    officialProfileUrl: undefined,
    sourceIdentifier: detail.code,
    source: SOURCE,
    sourceUrl: detailUrl(detail.code),
  }
}

async function requestJson<T>(url: string, apiKey: string, fetchImpl: MemberFetcher, timeoutMs: number): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${apiKey}`,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) 48FansWiki',
      },
    })
    if (response.status === 401) throw new Error('48pedia rejected the API key (401). Verify JKT48_48PEDIA_API_KEY.')
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('retry-after'))
      throw new Error(`48pedia rate-limited the request (429).${Number.isFinite(retryAfter) && retryAfter > 0 ? ` Retry after ${retryAfter}s.` : ''}`)
    }
    if (response.status === 403) throw new Error('48pedia blocked the request (403). The API may be behind an anti-bot challenge from this runtime.')
    if (!response.ok) throw new Error(`48pedia returned HTTP ${response.status}`)
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      throw new Error('48pedia returned a non-JSON response (likely an anti-bot challenge page).')
    }
    return await response.json() as T
  } finally {
    clearTimeout(timeout)
  }
}

/** JKT48 member import from 48pedia. Idempotent via stable `code`. */
export class FortyEightPediaAdapter implements SourceAdapter {
  readonly groupSlug = 'jkt48'
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: MemberFetcher = defaultFetch,
  ) {}
  async fetchList(): Promise<MemberRecord[]> {
    if (!this.apiKey) throw new Error('JKT48_48PEDIA_API_KEY is not set. Register at https://48pedia.id/register to import JKT48 members.')
    const pages = await this.fetchAllListItems()
    return pages.flatMap((page, index) => page.map((item) => normalize48pediaList(item, index + 1)))
  }
  async fetchDetail(base: MemberRecord): Promise<MemberRecord> {
    const envelope = await requestJson<DetailEnvelope>(
      detailUrl(base.sourceIdentifier),
      this.apiKey,
      this.fetchImpl,
      REQUEST_TIMEOUT_MS,
    )
    if (!envelope.data) throw new Error(`48pedia member detail for ${base.sourceIdentifier} is empty`)
    return normalize48pedia(envelope.data)
  }

  private async fetchAllListItems(): Promise<FortyEightPediaMemberListItem[][]> {
    const pages: FortyEightPediaMemberListItem[][] = []
    let page = 1
    let total = Number.POSITIVE_INFINITY
    while (pages.flat().length < total) {
      const envelope = await requestJson<PagedEnvelope<FortyEightPediaMemberListItem>>(
        listUrl(page),
        this.apiKey,
        this.fetchImpl,
        REQUEST_TIMEOUT_MS,
      )
      if (!Array.isArray(envelope.data)) throw new Error('48pedia list response did not contain a data array')
      const meta = envelope.meta
      if (meta?.total !== undefined) total = meta.total
      pages.push(envelope.data)
      if (envelope.data.length === 0 || (meta && page >= meta.total / (meta.per_page || PER_PAGE))) break
      page += 1
    }
    return pages
  }
}

async function defaultFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, init)
}
