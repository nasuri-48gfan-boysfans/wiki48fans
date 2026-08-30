import type { CSSProperties } from 'react'
import { useAsync } from '../lib/api/useAsync'
import { fetchGroups } from '../lib/api/groups'
import { fetchMembers } from '../lib/api/members'
import { ErrorState, MascotLoader, Window } from '../components/ui'
import type { FrontendGroup } from '../lib/api/types'

function GroupCard({ group, memberCount }: { group: FrontendGroup; memberCount: number }) {
  const style = {
    '--group-color': group.primaryColor,
    '--group-glow': group.glowColor,
  } as CSSProperties
  return (
    <article className="group-card" style={style}>
      <div className="group-card-head">
        {group.logoUrl
          ? <img className="group-logo" src={group.logoUrl} alt={`${group.name} logo`} loading="lazy" />
          : <span className="group-logo group-logo-fallback" aria-hidden="true">{group.name.slice(0, 2).toUpperCase()}</span>}
        <span className="group-live-count">{memberCount} member</span>
      </div>
      <h3>{group.name}</h3>
      {group.country && <span className="group-country">{group.country}</span>}
      {group.description && <p className="group-desc">{group.description}</p>}
      {group.officialUrl && (
        <a className="group-link" href={group.officialUrl} target="_blank" rel="noopener noreferrer">Situs resmi ↗</a>
      )}
      <a className="group-browse" href="/members">Jelajahi member →</a>
    </article>
  )
}

export default function GroupsPage() {
  const { data: groups, loading: groupsLoading, error: groupsError, reload: reloadGroups } = useAsync(fetchGroups, [])
  const { data: members, loading: membersLoading } = useAsync(() => fetchMembers(groups ?? []), [groups])

  const loading = groupsLoading || membersLoading
  const error = groupsError

  const countByGroup = (members ?? []).reduce<Record<string, number>>((acc, member) => {
    acc[member.groupId] = (acc[member.groupId] ?? 0) + 1
    return acc
  }, {})

  const hasGroups = (groups ?? []).length > 0

  return (
    <div className="feature-page">
      <div className="page-intro">
        <span className="eyebrow">The 48 family</span>
        <h2>Explore groups.</h2>
        <p>Seluruh grup 48 Group, satu tempat untuk menemukan member favoritmu.</p>
      </div>

      {error ? (
        <ErrorState title="Data grup gagal dimuat." hint="Coba lagi sebentar." onRetry={reloadGroups} />
      ) : loading ? (
        <div className="skeleton-grid"><MascotLoader label="Memuat grup..." /></div>
      ) : !hasGroups ? (
        <Window title="Groups" eyebrow="48 family"><div className="placeholder"><p>Belum ada grup yang tersedia.</p></div></Window>
      ) : (
        <div className="group-grid">
          {(groups ?? []).map((group) => <GroupCard key={group.id} group={group} memberCount={countByGroup[group.id] ?? 0} />)}
        </div>
      )}
    </div>
  )
}
