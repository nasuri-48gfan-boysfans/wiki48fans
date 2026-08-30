import { useEffect, useState } from 'react'
import { Mascot } from '../components/Mascot'
import { Icon } from '../components/icons'
import { Avatar, Badge, EmptyState, MascotLoader, Window } from '../components/ui'
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

  const oshiIds = new Set(profile.oshiIds)
  const oshiLive = live.filter((session) => session.memberId && oshiIds.has(session.memberId))
  const hasOshi = oshiIds.size > 0

  return (
    <div className="home-grid">
      <section className="welcome-banner">
        <div className="welcome-copy">
          <span className="eyebrow">Selamat datang di 48FansWiki</span>
          <h2>Ada yang selalu<br /><em>terjadi di komunitas.</em></h2>
          <p>Temukan member favoritmu, pilih Oshi, dan pantau live mereka secara langsung.</p>
          <div className="welcome-actions">
            <a href="/live" className="button button-primary">Lihat live sekarang ↗</a>
            <a href="/members" className="button button-ghost">Pilih Oshi →</a>
          </div>
        </div>
        <Mascot />
      </section>

      <Window title="Sedang Live" eyebrow="Jangan lewatkan momen" className="live-window">
        <a className="text-link" href="/live">Lihat semua live →</a>
        {liveError ? (
          <EmptyState title="Data live tidak dapat dimuat." hint="Periksa kembali nanti." />
        ) : liveLoading ? (
          <MascotLoader label="Memeriksa live..." />
        ) : live.length === 0 ? (
          <EmptyState title="Tidak ada live saat ini." hint="Data dari tracker backend, tanpa tayangan palsu." />
        ) : (
          <div className="live-list">
            {live.slice(0, 5).map((session, index) => (
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

      <Window title={hasOshi ? 'Oshi Kamu' : 'Pilih Oshi Kamu'} eyebrow={hasOshi ? 'Prioritas informasi' : 'Personalize feed kamu'}>
        {hasOshi ? (
          oshiLive.length > 0 ? (
            <div className="oshi-now">
              <div className="oshi-now-list">
                {oshiLive.map((session, index) => (
                  <div className={`live-row ${index === 0 ? 'priority' : ''}`} key={`${session.memberId}-${session.platform}`}>
                    <Avatar name={session.memberName} />
                    <div className="member-meta"><strong><span className="star" aria-hidden="true">★ </span>{session.memberName}</strong><small>{session.groupName ?? '48 Group'} · {session.platform}</small></div>
                    <Badge tone="live">LIVE</Badge>
                  </div>
                ))}
              </div>
              <p className="empty-hint">Oshimu sedang live!</p>
            </div>
          ) : (
            <EmptyState title="Oshimu belum live." hint="Kami beri tahu saat ada yang mulai tayang." />
          )
        ) : (
          <EmptyState title="Belum ada Oshi dipilih." hint="Temukan member favoritmu dan dapatkan prioritas saat mereka live." />
        )}
        <a className="text-link oshi-edit-link" href="/members">{hasOshi ? 'Kelola Oshi →' : 'Pilih Oshi sekarang →'}</a>
      </Window>

      <Window title="Jelajahi Member" eyebrow="Keluarga 48" className="discover-window">
        <a className="text-link" href="/members">Lihat semua member →</a>
        {live.length === 0 && !liveLoading && !liveError ? (
          <EmptyState title={`${members?.length ?? 0} member siap dijumpai.`} hint="Dari berbagai grup 48 Group." />
        ) : (
          <div className="member-count-strip">
            <div className="stat-chip"><strong>{members?.length ?? 0}</strong><small>Member</small></div>
            <div className="stat-chip"><strong>{groups?.length ?? 0}</strong><small>Grup</small></div>
            <div className="stat-chip"><strong>{live.length}</strong><small>Live sekarang</small></div>
          </div>
        )}
      </Window>

      <Window title="Komunitas" eyebrow="Suara para fans" className="discover-window">
        <a className="text-link" href="/community">Gabung komunitas →</a>
        <p className="community-teaser">Temukan cerita, diskusi, dan momen dari fans di seluruh dunia.</p>
        <div className="community-chips">
          <a href="/community" className="chip"><Icon name="community" size={16} />Komunitas</a>
          <a href="/messages" className="chip"><Icon name="messages" size={16} />Pesan</a>
          <a href="/channels" className="chip"><Icon name="channels" size={16} />Channels</a>
        </div>
      </Window>
    </div>
  )
}
