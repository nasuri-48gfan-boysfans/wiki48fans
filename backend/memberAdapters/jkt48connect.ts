import type { MemberRecord } from '../memberTypes.js'
import type { SourceAdapter } from '../memberImporter.js'
import { jkt48Slug } from './jkt48.js'

/**
 * Community JKT48 data source. The official jkt48.com site is protected by a
 * Cloudflare anti-bot challenge, so this adapter consumes JKT48Connect — a
 * community-maintained mirror of JKT48 member data — via its current v1 API.
 *
 * Requires `JKT48_CONNECT_API_KEY` (a `jk48c_...` API key). Authentication is
 * the `x-api-key` header on `https://jkt48connect.com/api/v1/members` (the v1
 * endpoint explicitly answers "Missing or invalid API key. Set header x-api-key").
 * Note: the legacy `v2.jkt48connect.com` endpoint that used an `apikey=` query
 * param no longer resolves, which is why the adapter targets the v1 surface.
 * Until a valid key is configured this adapter throws and the importer reports
 * the failure honestly.
 */

type MemberFetcher = (url: string, init?: RequestInit) => Promise<Response>

const MEMBERS_ENDPOINT = 'https://jkt48connect.com/api/v1/members'
const API_KEY_HEADER = 'x-api-key'

export interface Jkt48ConnectMember {
  _id?: string | null
  name?: string | null
  img?: string | null
  url?: string | null
  url_key?: string | null
  group?: string | null
  room_id?: number | string | null
  sr_exists?: boolean | null
  is_graduate?: boolean | null
  generation?: string | null
  idn_username?: string | null
  jkt48_id?: string | null
  team?: string | null
  nicknames?: string[] | null
  socials?: Array<{ title?: string | null; url?: string | null }> | null
}

const SOURCE = 'jkt48connect'

const IDN_UUID_RE = /profile\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/

/** Extract the stable IDN profile UUID from the IDN social deep-link, if present. */
function idnUserIdFromSocials(socials?: Array<{ title?: string | null; url?: string | null }> | null): string | undefined {
  if (!Array.isArray(socials)) return undefined
  for (const social of socials) {
    if (!social.url) continue
    const match = social.url.match(IDN_UUID_RE)
    if (match) return match[1]
  }
  return undefined
}

/** Parse + normalize a JKT48Connect v1 member row into a `MemberRecord`. */
export function normalizeJkt48Connect(raw: Jkt48ConnectMember): MemberRecord {
  const id = String(raw._id ?? '')
  const name = String(raw.name || '')
  if (!id && !name) throw new Error('JKT48Connect member has no usable identity')
  if (!name) throw new Error(`JKT48Connect member ${id} has no name`)
  // _id uses the same UPPERCASE_UNDERSCORE codes as 48pedia, so using it as the
  // sourceIdentifier makes the importer match existing 48pedia rows in place.
  const identifier = id || jkt48Slug(name)

  return {
    slug: jkt48Slug(name) || identifier,
    name,
    nickname: raw.nicknames && raw.nicknames[0] ? raw.nicknames[0] : undefined,
    generation: toPositiveInt(raw.generation),
    status: raw.is_graduate ? 'graduated' : 'active',
    profileImageUrl: raw.img || undefined,
    sourceIdentifier: identifier,
    source: SOURCE,
    sourceUrl: MEMBERS_ENDPOINT,
    idnUserId: idnUserIdFromSocials(raw.socials),
    showroomRoomId: raw.room_id != null && Number(raw.room_id) > 0 ? String(raw.room_id) : undefined,
  }
}

function toPositiveInt(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined
  const number = typeof value === 'number' ? value : Number(String(value).match(/\d+/)?.[0])
  return Number.isInteger(number) && number >= 1 ? number : undefined
}

export class Jkt48ConnectAdapter implements SourceAdapter {
  readonly groupSlug = 'jkt48'
  readonly enrichOnly = true
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: MemberFetcher = defaultFetch,
  ) {}
  async fetchList(): Promise<MemberRecord[]> {
    if (!this.apiKey) throw new Error('JKT48_CONNECT_API_KEY is not set. Set a valid JKT48Connect API key to import JKT48 members.')
    const response = await this.fetchImpl(MEMBERS_ENDPOINT, { headers: { [API_KEY_HEADER]: this.apiKey, accept: 'application/json' } })
    if (!response.ok) throw new Error(`JKT48Connect returned ${response.status} for the members endpoint`)
    const payload = await response.json() as { data?: Jkt48ConnectMember[] | null; members?: Jkt48ConnectMember[] | null }
    const list = Array.isArray(payload.data) ? payload.data : Array.isArray(payload.members) ? payload.members : []
    return list.map((raw) => normalizeJkt48Connect(raw))
  }
}

async function defaultFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(15000) })
}
