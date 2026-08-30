import { fetchGroups } from '../lib/api/groups'
import { fetchMembers } from '../lib/api/members'
import { useAsync } from '../lib/api/useAsync'
import { Avatar, EmptyState, PhotoAvatar, Skeleton, Window } from '../components/ui'
import type { Profile } from '../types/auth'

export default function ProfilePage({ profile }: { profile: Profile }) {
  const { data: groups } = useAsync(fetchGroups, [])
  const { data: members, loading } = useAsync(() => fetchMembers(groups ?? []), [groups])
  const oshi = (members ?? []).filter((member) => profile.oshiIds.includes(member.id))

  return (
    <div className="feature-page">
      <div className="profile-hero">
        <Avatar name={profile.displayName} size="large" />
        <div>
          <span className="eyebrow">Your fan profile</span>
          <h2>{profile.displayName}</h2>
          <p>@{profile.handle}{profile.email ? ` · ${profile.email}` : ''}</p>
        </div>
        <a href="/settings" className="button button-outline">Edit profile</a>
      </div>

      <div className="profile-columns">
        <Window title="Your Oshi" eyebrow="The members you follow">
          {loading ? (
            <Skeleton lines={2} />
          ) : oshi.length === 0 ? (
            <EmptyState title="Belum ada Oshi." hint="Pilih member untuk menyesuaikan beranda." />
          ) : (
            <div className="profile-oshi">
              {oshi.map((member) => (
                <a href={`/members/${member.id}`} className="profile-oshi-row" key={member.id}>
                  <PhotoAvatar name={member.name} src={member.photoUrl} />
                  <span><strong>{member.name}</strong><small>{member.groupName}</small></span>
                  <span className="text-link">Lihat →</span>
                </a>
              ))}
              <a className="text-link" href="/members">Kelola Oshi →</a>
            </div>
          )}
        </Window>

        <Window title="Your contribution" eyebrow="A little footprint">
          <div className="stats-strip compact">
            <div><strong>0</strong><small>Wiki edits</small></div>
            <div><strong>0</strong><small>Discussions</small></div>
            <div><strong>0</strong><small>Friends</small></div>
          </div>
          <p className="window-copy">Angka ini menampilkan aktivitas nyata akunmu sejauh ini.</p>
        </Window>
      </div>
    </div>
  )
}
