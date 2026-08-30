import type { CSSProperties } from 'react'
import { fetchGroups } from '../lib/api/groups'
import { fetchMembers } from '../lib/api/members'
import { useAsync } from '../lib/api/useAsync'
import { Badge, Button, EmptyState, PhotoAvatar, Skeleton, Window } from '../components/ui'
import type { FrontendMember } from '../lib/api/types'

function fmtDate(value?: string): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || String(value).trim() === '') return null
  return <div className="member-meta-item"><small>{label}</small><strong>{String(value)}</strong></div>
}

export default function MemberDetailPage({ memberId }: { memberId: string }) {
  const { data: groups } = useAsync(fetchGroups, [])
  const { data: members, loading, error, reload } = useAsync(() => fetchMembers(groups ?? []), [groups])
  const member: FrontendMember | undefined = members?.find((item) => item.id === memberId)

  if (error) {
    return <div className="feature-page"><div className="error-banner" role="alert"><strong>Data member gagal dimuat.</strong><div><Button variant="outline" onClick={reload}>Coba lagi</Button></div></div></div>
  }
  if (loading) {
    return <div className="feature-page"><Skeleton lines={6} /></div>
  }
  if (!member) {
    return <div className="feature-page"><Window title="Member" eyebrow="Tidak ditemukan"><EmptyState title="Member tidak ditemukan." hint="Member mungkin tidak aktif atau telah dihapus." /></Window></div>
  }

  const style = { '--member-color': member.primaryColor } as CSSProperties

  return (
    <div className="feature-page" style={style}>
      <div className="member-detail-top">
        <PhotoAvatar name={member.name} src={member.photoUrl} size="large" />
        <div>
          <span className="eyebrow">{member.groupName}{member.generation ? ` · Generasi ${member.generation}` : ''}</span>
          <h2>{member.name}</h2>
          {member.nickname && <p className="member-nick">dikenal sebagai “{member.nickname}”</p>}
          <div className="member-badges">
            <Badge tone={member.status === 'active' ? 'accent' : 'neutral'}>{member.status === 'active' ? 'Aktif' : member.status === 'graduated' ? 'Lulus' : 'Unknown'}</Badge>
            {member.bloodType && <Badge>Gol. darah {member.bloodType}</Badge>}
            {member.heightCm && <Badge>{member.heightCm} cm</Badge>}
          </div>
          <div className="page-actions">
            {member.officialProfileUrl && <Button variant="outline" onClick={() => window.open(member.officialProfileUrl, '_blank', 'noopener')}>Profil resmi ↗</Button>}
            <a className="text-link" href="/members">← Semua member</a>
          </div>
        </div>
      </div>

      {member.bio && <p className="member-bio">{member.bio}</p>}

      <div className="member-meta-list">
        <Row label="Tanggal lahir" value={fmtDate(member.birthDate)} />
        <Row label="Tempat lahir" value={member.birthPlace} />
        <Row label="Tinggi" value={member.heightCm ? `${member.heightCm} cm` : undefined} />
        <Row label="Golongan darah" value={member.bloodType} />
        <Row label="Generasi" value={member.generation} />
        <Row label="Tanggal bergabung" value={fmtDate(member.joinedDate)} />
        <Row label="Tanggal lulus" value={fmtDate(member.graduationDate)} />
        <Row label="Status" value={member.status === 'active' ? 'Aktif' : member.status === 'graduated' ? 'Lulus' : 'Unknown'} />
      </div>
    </div>
  )
}
