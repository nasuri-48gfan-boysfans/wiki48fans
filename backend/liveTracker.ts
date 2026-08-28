import { liveDatabase } from './mongodb.js'

export type LivePlatform = 'SHOWROOM' | 'IDN'

export interface LiveSession {
  externalId: string
  memberId?: string
  memberName: string
  groupName?: string
  platform: LivePlatform
  url?: string
  viewerCount?: number
  startedAt?: Date
  metadata?: Record<string, unknown>
}

interface TrackerSource {
  platform: LivePlatform
  endpoint?: string
  headers?: Record<string, string>
}

const liveSessions = liveDatabase.collection<LiveSession & { status: 'live' | 'ended'; lastSeenAt: Date }>('live_sessions')
const trackingLogs = liveDatabase.collection<{ platform: LivePlatform; checkedAt: Date; found: number; error?: string }>('tracking_logs')

async function fetchSource(source: TrackerSource): Promise<LiveSession[]> {
  if (!source.endpoint) return []
  const response = await fetch(source.endpoint, { headers: source.headers })
  if (!response.ok) throw new Error(`${source.platform} returned HTTP ${response.status}`)
  const payload: unknown = await response.json()
  if (!Array.isArray(payload)) throw new Error(`${source.platform} response must be a JSON array of live sessions`)
  return payload.map((item) => normalizeSession(item, source.platform))
}

function normalizeSession(value: unknown, platform: LivePlatform): LiveSession {
  if (!value || typeof value !== 'object') throw new Error(`${platform} returned an invalid session item`)
  const item = value as Record<string, unknown>
  const externalId = String(item.externalId ?? item.id ?? '')
  const memberName = String(item.memberName ?? item.name ?? '')
  if (!externalId || !memberName) throw new Error(`${platform} session is missing id or memberName`)
  return { externalId, memberId: typeof item.memberId === 'string' ? item.memberId : undefined, memberName, groupName: typeof item.groupName === 'string' ? item.groupName : undefined, platform, url: typeof item.url === 'string' ? item.url : undefined, viewerCount: typeof item.viewerCount === 'number' ? item.viewerCount : undefined, startedAt: typeof item.startedAt === 'string' ? new Date(item.startedAt) : undefined, metadata: item }
}

export async function trackLiveSources(sources: TrackerSource[]) {
  for (const source of sources) {
    const checkedAt = new Date()
    try {
      const sessions = await fetchSource(source)
      await Promise.all(sessions.map((session) => liveSessions.updateOne({ externalId: session.externalId, platform: session.platform }, { $set: { ...session, status: 'live', lastSeenAt: checkedAt }, $setOnInsert: { startedAt: session.startedAt ?? checkedAt } }, { upsert: true })))
      await liveSessions.updateMany({ platform: source.platform, status: 'live', lastSeenAt: { $lt: checkedAt } }, { $set: { status: 'ended', endedAt: checkedAt } })
      await trackingLogs.insertOne({ platform: source.platform, checkedAt, found: sessions.length })
      console.log(`[tracker] ${source.platform}: ${sessions.length} live session(s)`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await trackingLogs.insertOne({ platform: source.platform, checkedAt, found: 0, error: message })
      console.error(`[tracker] ${source.platform}: ${message}`)
    }
  }
}

export async function getLiveSessions() { return liveSessions.find({ status: 'live' }).sort({ viewerCount: -1, startedAt: 1 }).toArray() }

export function startLiveTracker(sources: TrackerSource[], intervalMs: number) {
  const run = () => void trackLiveSources(sources)
  run()
  return setInterval(run, intervalMs)
}
