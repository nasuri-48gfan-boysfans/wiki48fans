import { useEffect, useState } from 'react'
import { fetchGroups } from '../lib/api/groups'
import { fetchMembers } from '../lib/api/members'
import { fetchLiveSessions } from '../lib/api/live'
import { useAsync } from '../lib/api/useAsync'
import { Badge, Button, EmptyState, Skeleton, Window } from '../components/ui'
import type { Profile } from '../types/auth'
import type { LiveSession } from '../lib/api/types'

function formatDuration(startedAt?: string): string {
  if (!startedAt) return '—'
  const start = new Date(startedAt).getTime()
  if (Number.isNaN(start)) return '—'
  const elapsed = Math.max(0, Date.now() - start)
  const minutes = Math.floor(elapsed / 60000)
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`
}

function LiveCard({ session, priority = false }: { session: LiveSession; priority?: boolean }) {
  return (
    <article className={`live-card ${priority ? 'priority' : ''}`}>
      <div className="live-card-main">
        <div className="live-card-title"><strong>{priority && <span className="star" aria-hidden="true">★ </span>}{session.memberName}</strong><Badge tone="live">LIVE</Badge></div>
        {session.groupName && <small>{session.groupName} · {session.platform}</small>}
        {session.liveTitle && <small>{session.liveTitle}</small>}
        <div className="live-card-meta">
          <span>◉ {typeof session.viewerCount === 'number' ? session.viewerCount.toLocaleString('id-ID') : '—'} menonton</span>
          <span>◷ {session.startedAt ? formatDuration(session.startedAt) : '—'}</span>
        </div>
      </div>
      {session.liveUrl && <Button variant="outline" onClick={() => window.open(session.liveUrl, '_blank', 'noopener')}>Tonton ↗</Button>}
    </article>
  )
}

export default function LivePage({ profile }: { profile: Profile }) {
  const { data: groups } = useAsync(fetchGroups, [])
  const { data: members, error: memberError } = useAsync(() => fetchMembers(groups ?? []), [groups])
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!members) return
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | undefined
    const refresh = () => {
      fetchLiveSessions(members)
        .then((result) => { if (!cancelled) { setSessions(result); setLoading(false) } })
        .catch((requestError: Error) => { if (!cancelled) { setError(requestError.message); setLoading(false) } })
    }
    refresh()
    timer = setInterval(refresh, 60_000)
    return () => { cancelled = true; if (timer) clearInterval(timer) }
  }, [members])

  const oshiIds = new Set(profile.oshiIds)
  const oshi = sessions.filter((session) => session.memberId && oshiIds.has(session.memberId))
  const others = sessions.filter((session) => !session.memberId || !oshiIds.has(session.memberId))

  const totalViewers = sessions.reduce((sum, session) => sum + (typeof session.viewerCount === 'number' ? session.viewerCount : 0), 0)
  const hasViewerData = sessions.some((session) => typeof session.viewerCount === 'number')

  const topRef = `● ${loading ? 'Memeriksa live...' : `${sessions.length} member live`}`

  return (
    <div className="feature-page">
      <div className="page-intro page-intro-row">
        <div><span className="eyebrow">Activity across the groups</span><h2>Live now.</h2><p>Follow the moments as they happen.</p></div>
        <Badge tone="live">{topRef}</Badge>
      </div>

      {memberError && <p className="form-error" role="alert">{memberError}. Menampilkan live tanpa identitas member.</p>}
      {error && <div className="error-banner" role="alert"><strong>{error}</strong></div>}

      {loading ? (
        <div className="live-sections"><Window title="Live"><Skeleton lines={3} /></Window></div>
      ) : sessions.length === 0 ? (
        <Window title="Live" eyebrow="SHOWROOM & IDN"><EmptyState title="Tidak ada sesi live saat ini." hint="Tidak ada tayangan live palsu — data diambil dari tracker backend." /></Window>
      ) : (
        <div className="live-sections">
          {oshi.length > 0 && (
            <Window title="Oshi kamu" eyebrow="Prioritas pribadi">
              <div className="live-cards">{oshi.map((session) => <LiveCard key={`${session.memberId}-${session.platform}`} session={session} priority />)}</div>
            </Window>
          )}
          <Window title="Semua live" eyebrow="Across SHOWROOM & IDN">
            <div className="live-cards">{others.map((session, index) => <LiveCard key={`${session.memberId}-${session.platform}-${index}`} session={session} />)}</div>
          </Window>
        </div>
      )}

      <Window title="Aktivitas live" eyebrow="Angka nyata dari tracker">
        <div className="stats-strip">
          <div><strong>{sessions.length}</strong><small>Sesi sekarang</small></div>
          <div><strong>{hasViewerData ? totalViewers.toLocaleString('id-ID') : '—'}</strong><small>{hasViewerData ? 'Penonton sekarang' : 'Data penonton tak tersedia'}</small></div>
        </div>
      </Window>
    </div>
  )
}
