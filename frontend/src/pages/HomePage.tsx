import { useEffect, useState } from 'react'
import { Mascot } from '../components/Mascot'
import { Avatar, Badge, EmptyState, Skeleton, Window } from '../components/ui'
import { fetchGroups } from '../lib/api/groups'
import { fetchMembers } from '../lib/api/members'
import { fetchLiveSessions } from '../lib/api/live'
import { useAsync } from '../lib/api/useAsync'
import type { Profile } from '../types/auth'
import type { LiveSession } from '../lib/api/types'

export default function HomePage({ profile }: { profile: Profile }) {
  const { data: groups } = useAsync(fetchGroups, [])
  const { data: members } = useAsync(() => fetchMembers(groups ?? []), [groups])
  const [live, setLive] = useState<LiveSession[]>([])
  const [liveLoading, setLiveLoading] = useState(true)
  const [liveError, setLiveError] = useState('')

  useEffect(() => {
    if (!members) return
    let cancelled = false
    fetchLiveSessions(members)
      .then((result) => { if (!cancelled) { setLive(result); setLiveLoading(false) } })
      .catch((requestError: Error) => { if (!cancelled) { setLiveError(requestError.message); setLiveLoading(false) } })
    return () => { cancelled = true }
  }, [members])

  return (
    <div className="home-grid">
      <section className="welcome-banner">
        <div><span className="eyebrow">Your daily orbit</span><h2>There is always<br /><em>something happening.</em></h2><p>Catch up on the latest from your Oshi and the community.</p><a href="/live" className="button button-primary">Explore live now ↗</a></div>
        <Mascot compact />
      </section>

      <Window title="Live right now" eyebrow="Don't miss a moment" className="live-window">
        <a className="text-link" href="/live">See all live →</a>
        {liveError ? (
          <EmptyState title="Data live tidak dapat dimuat." />
        ) : liveLoading ? (
          <Skeleton lines={3} />
        ) : live.length === 0 ? (
          <EmptyState title="Tidak ada live saat ini." hint="Data dari tracker backend, tanpa tayangan palsu." />
        ) : (
          <div className="live-list">
            {live.slice(0, 4).map((session, index) => (
              <div className={`live-row ${index === 0 ? 'priority' : ''}`} key={`${session.memberId}-${session.platform}`}>
                <Avatar name={session.memberName} />
                <div className="member-meta"><strong>{index === 0 && <span className="star" aria-hidden="true">★ </span>}{session.memberName}</strong><small>{session.groupName ?? '48 Group'} · {session.platform}</small></div>
                <Badge tone="live">LIVE</Badge>
                <span className="viewer-count">◉ {typeof session.viewerCount === 'number' ? session.viewerCount.toLocaleString('id-ID') : '—'}</span>
              </div>
            ))}
          </div>
        )}
      </Window>

      <Window title="Your quick links" eyebrow="Make it yours">
        <div className="quick-links">
          <a href="/members"><span aria-hidden="true">✦</span><strong>Choose your Oshi</strong><small>Personalize your feed</small></a>
          <a href="/live"><span aria-hidden="true">◉</span><strong>See who is live</strong><small>SHOWROOM & IDN, real time</small></a>
          <a href="/community"><span aria-hidden="true">◌</span><strong>Join the conversation</strong><small>See what fans are saying</small></a>
        </div>
      </Window>

      <Window title="Your activity" eyebrow="A little recap">
        <div className="activity-empty">
          <span className="activity-mark">✺</span>
          <p>{profile.displayName}, your activity will appear here as you explore.</p>
          <a href="/members" className="text-link">Choose an Oshi →</a>
        </div>
      </Window>
    </div>
  )
}
