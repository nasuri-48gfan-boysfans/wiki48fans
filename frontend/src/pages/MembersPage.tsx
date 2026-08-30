import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { fetchGroups } from '../lib/api/groups'
import { fetchMembers } from '../lib/api/members'
import { useAsync } from '../lib/api/useAsync'
import { updateOshiIds } from '../lib/profile'
import { Button, PhotoAvatar, Skeleton, Window } from '../components/ui'
import type { Profile } from '../types/auth'

function MemberCard({
  member,
  selected,
  onToggle,
  onOpen,
}: {
  member: { id: string; name: string; nickname?: string; photoUrl?: string; groupName: string; primaryColor: string }
  selected: boolean
  onToggle: (id: string) => void
  onOpen: (id: string) => void
}) {
  const style = { '--group-color': member.primaryColor } as CSSProperties
  const displayName = member.nickname || member.name
  return (
    <button
      className={`member-card ${selected ? 'selected' : ''}`}
      style={style}
      aria-pressed={selected}
      onClick={() => onOpen(member.id)}
      data-testid="member-card"
    >
      <div className="member-card-media"><PhotoAvatar name={member.name} src={member.photoUrl} size="large" /></div>
      <strong>{displayName}</strong>
      <small>{member.groupName}</small>
      {selected && <span className="member-card-check">✓</span>}
      <span className="member-card-add" role="button" aria-label={selected ? 'Hapus dari Oshi' : 'Jadikan Oshi'} onClick={(event) => { event.stopPropagation(); onToggle(member.id) }}>
        {selected ? '★' : '+'}
      </span>
    </button>
  )
}

export default function MembersPage({ profile }: { profile: Profile }) {
  const { data: groups, loading: groupsLoading } = useAsync(fetchGroups, [])
  const { data: members, loading: membersLoading, error, reload } = useAsync(() => fetchMembers(groups ?? []), [groups])
  const [query, setQuery] = useState('')
  const [groupId, setGroupId] = useState<string>('all')
  const [selected, setSelected] = useState<string[]>(profile.oshiIds)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  const filtered = useMemo(() => {
    if (!members) return []
    const q = query.trim().toLowerCase()
    return members.filter((member) => {
      const matchGroup = groupId === 'all' || member.groupId === groupId
      const matchQuery = !q || member.name.toLowerCase().includes(q) || (member.nickname?.toLowerCase().includes(q) ?? false)
      return matchGroup && matchQuery
    })
  }, [members, query, groupId])

  const loading = groupsLoading || membersLoading

  const toggle = (id: string) => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))

  const save = () => {
    setSaving(true); setSaveError(''); setSaved(false)
    updateOshiIds(profile.id, selected)
      .then(() => setSaved(true))
      .catch((requestError: Error) => setSaveError(requestError.message))
      .finally(() => setSaving(false))
  }

  return (
    <div className="members-page">
      <div className="page-intro">
        <span className="eyebrow">Make it personal</span>
        <h2>Choose your Oshi.</h2>
        <p>Pick one or more members to bring closer to your daily orbit.</p>
      </div>

      <div className="search-box">
        <span aria-hidden="true">⌕</span>
        <input aria-label="Cari member" placeholder="Cari nama atau nickname..." value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>

      <div className="filter-row">
        <span className="filter-label">Filter:</span>
        <select className="group-filter" aria-label="Filter grup" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
          <option value="all">Semua grup</option>
          {(groups ?? []).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
      </div>

      {saveError && <p className="form-error" role="alert">{saveError}</p>}

      {error ? (
        <div className="error-banner" role="alert">
          <strong>Data member gagal dimuat.</strong>
          <div><Button variant="outline" onClick={reload}>Coba lagi</Button></div>
        </div>
      ) : loading ? (
        <div className="skeleton-grid"><Skeleton lines={3} /><Skeleton lines={3} /><Skeleton lines={3} /></div>
      ) : filtered.length === 0 ? (
        <Window title="Member" eyebrow="Cari Oshi"><div className="placeholder"><span aria-hidden="true">✦</span><p>{members?.length ? 'Tidak ada member yang cocok.' : 'Belum ada member yang tersedia.'}</p></div></Window>
      ) : (
        <div className="member-grid">
          {filtered.map((member) => <MemberCard key={member.id} member={member} selected={selected.includes(member.id)} onToggle={toggle} onOpen={(id) => { window.location.assign(`/members/${id}`) }} />)}
        </div>
      )}

      <div className="members-actions">
        <span>{selected.length} dipilih</span>
        <Button onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : saved ? 'Tersimpan ✓' : 'Simpan Oshi →'}</Button>
      </div>
    </div>
  )
}
