import type { LivePlatform, NormalizedLiveSession, PlatformMemberMapping } from './liveTracker.js'

export interface LivePlatformAdapter {
  readonly platform: LivePlatform
  getLiveSessions(platformMemberIds?: string[]): Promise<NormalizedLiveSession[]>
  getMemberLiveStatus(mapping: PlatformMemberMapping): Promise<NormalizedLiveSession | null>
}

interface ShowroomRoom {
  id: number
  name: string
  url_key: string
  is_live: boolean
}

interface ShowroomOnlive {
  room_id: number
  room_url_key: string
  telop?: string
  live_id?: number
  view_num?: number
  started_at?: number
  streaming_url_list?: unknown
}

async function requestJson<T>(url: string, timeoutMs: number, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, headers: { accept: 'application/json', ...init?.headers } })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json() as T
  } finally { clearTimeout(timeout) }
}

function showroomUrl(roomKey: string) { return `https://www.showroom-live.com/r/${encodeURIComponent(roomKey)}` }

export class ShowroomAdapter implements LivePlatformAdapter {
  readonly platform = 'showroom' as const
  constructor(private readonly timeoutMs = 10000) {}
  async getLiveSessions() {
    const [rooms, onlives] = await Promise.all([
      requestJson<ShowroomRoom[]>('https://campaign.showroom-live.com/akb48_sr/data/room_status_list.json', this.timeoutMs),
      requestJson<{ onlives?: Array<{ lives?: ShowroomOnlive[] }> }>('https://www.showroom-live.com/api/live/onlives', this.timeoutMs),
    ])
    const mappedRooms = new Map(rooms.map((room) => [String(room.id), room]))
    return (onlives.onlives || []).flatMap((genre) => genre.lives || []).filter((live) => mappedRooms.has(String(live.room_id))).map((live) => this.normalize(live, mappedRooms.get(String(live.room_id))))
  }
  async getMemberLiveStatus(mapping: PlatformMemberMapping) {
    const sessions = await this.getLiveSessions()
    return sessions.find((session) => session.memberPlatformId === mapping.platformMemberId) || null
  }
  private normalize(live: ShowroomOnlive, room?: ShowroomRoom): NormalizedLiveSession {
    if (!live.room_id || !live.live_id || typeof live.started_at !== 'number') throw new Error('SHOWROOM live payload is missing room_id, live_id, or started_at')
    const roomKey = live.room_url_key || room?.url_key
    if (!roomKey) throw new Error(`SHOWROOM live ${live.live_id} is missing room_url_key`)
    return { memberPlatformId: String(live.room_id), platform: this.platform, liveId: String(live.live_id), status: 'live', title: live.telop || room?.name || 'SHOWROOM live', url: showroomUrl(roomKey), viewerCount: typeof live.view_num === 'number' ? live.view_num : undefined, startedAt: new Date(live.started_at * 1000), metadata: { roomId: live.room_id, roomUrlKey: roomKey, streamingUrlList: live.streaming_url_list } }
  }
}

interface IdnLivestream {
  slug?: string | null
  title?: string | null
  status?: string | null
  view_count?: number | null
  live_at?: string | null
  playback_url?: string | null
  image_url?: string | null
}

interface IdnGraphqlResponse {
  data?: Record<string, IdnLivestream[] | undefined>
  errors?: Array<{ message?: string }>
}

const IDN_ENDPOINT = 'https://api.idn.app/graphql'
const IDN_BATCH_SIZE = 30

export class IdnAdapter implements LivePlatformAdapter {
  readonly platform = 'idn' as const
  constructor(private readonly timeoutMs = 10000) {}

  async getLiveSessions(platformMemberIds?: string[]) {
    const streamerIds = Array.from(new Set((platformMemberIds || []).filter((id) => id && id.length > 0 && id !== 'null')))
    if (streamerIds.length === 0) return []
    const sessions: NormalizedLiveSession[] = []
    for (let index = 0; index < streamerIds.length; index += IDN_BATCH_SIZE) {
      const batch = streamerIds.slice(index, index + IDN_BATCH_SIZE)
      sessions.push(...await this.fetchBatch(batch))
    }
    return sessions
  }

  async getMemberLiveStatus(mapping: PlatformMemberMapping) {
    if (!mapping.platformMemberId) return null
    const sessions = await this.getLiveSessions([mapping.platformMemberId])
    return sessions.find((session) => session.memberPlatformId === mapping.platformMemberId) || null
  }

  private async fetchBatch(streamerIds: string[]): Promise<NormalizedLiveSession[]> {
    const aliased = streamerIds.map((id, aliasIndex) => `  ch_${aliasIndex}: getLivestreams(streamerID: "${id}") { slug title status view_count live_at playback_url image_url }`).join('\n')
    const query = `query FetchIdnLives {\n${aliased}\n}`
    const payload = await requestJson<IdnGraphqlResponse>(IDN_ENDPOINT, this.timeoutMs, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', origin: 'https://www.idn.app', referer: 'https://www.idn.app/' },
      body: JSON.stringify({ query }),
    })
    if (payload.errors?.length) {
      // Skip invalid aliases instead of failing the whole batch: the remaining
      // aliases are still resolved inside `data`.
      console.warn(`[IdnAdapter] GraphQL warnings: ${payload.errors.map((item) => item.message).join('; ')}`)
    }
    const data = payload.data || {}
    const sessions: NormalizedLiveSession[] = []
    streamerIds.forEach((id, aliasIndex) => {
      const liveList = data[`ch_${aliasIndex}`] || []
      const live = liveList.find((entry) => (entry?.status || '').toLowerCase() === 'live' && Boolean(entry.playback_url))
      const normalized = live ? this.normalize(live, id) : null
      if (normalized) sessions.push(normalized)
    })
    return sessions
  }

  private normalize(live: IdnLivestream, streamerId: string): NormalizedLiveSession {
    const slug = String(live.slug || '')
    const url = String(live.playback_url || '')
    if (!slug || !url) throw new Error(`IDN live for streamer ${streamerId} is missing slug or playback_url`)
    return {
      memberPlatformId: streamerId,
      platform: this.platform,
      liveId: slug,
      status: 'live',
      title: String(live.title || 'IDN live'),
      url,
      viewerCount: typeof live.view_count === 'number' ? live.view_count : undefined,
      startedAt: live.live_at ? new Date(live.live_at) : undefined,
      metadata: { slug, streamerId, imageUrl: live.image_url ?? undefined },
    }
  }
}
