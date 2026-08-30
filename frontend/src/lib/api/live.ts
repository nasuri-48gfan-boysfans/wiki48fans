import type { FrontendMember, LivePlatform, LiveSession } from './types'

const API_URL = import.meta.env.VITE_API_URL as string | undefined

export interface BackendLiveDoc {
  memberId?: string
  platform?: 'showroom' | 'idn'
  title?: string
  url?: string
  viewerCount?: number
  startedAt?: string
}

function displayStart(startedAt?: string): string | undefined {
  if (!startedAt) return undefined
  const date = new Date(startedAt)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

/**
 * Fetch live sessions from the backend live tracker and join member identity.
 * Returns [] when the backend isn't configured (honest empty state, no fake data).
 */
export async function fetchLiveSessions(members: FrontendMember[]): Promise<LiveSession[]> {
  if (!API_URL) return []
  let response: Response
  try {
    response = await fetch(`${API_URL}/api/live`, { headers: { accept: 'application/json' } })
  } catch {
    throw new Error('Live service tidak dapat dijangkau')
  }
  if (!response.ok) throw new Error('Live service tidak tersedia')
  const payload = (await response.json()) as { sessions?: BackendLiveDoc[] }
  const byId = new Map(members.map((member) => [member.id, member]))
  return (payload.sessions ?? []).map((doc): LiveSession => {
    const member = doc.memberId ? byId.get(doc.memberId) : undefined
    const platform = (doc.platform === 'idn' ? 'IDN' : 'SHOWROOM') as LivePlatform
    return {
      memberId: doc.memberId,
      memberName: member?.name ?? '48 Group member',
      memberSlug: member?.slug,
      groupName: member?.groupName,
      platform,
      liveTitle: doc.title,
      viewerCount: typeof doc.viewerCount === 'number' ? doc.viewerCount : undefined,
      liveUrl: doc.url,
      startedAt: displayStart(doc.startedAt),
    }
  })
}
