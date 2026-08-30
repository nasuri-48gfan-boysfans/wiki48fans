import { useCallback } from 'react'
import { fetchNotifications, markNotificationsRead } from '../lib/api/notifications'
import { useAsync } from '../lib/api/useAsync'
import { Button, EmptyState, Skeleton, Window } from '../components/ui'

function timeAgo(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (minutes < 1) return 'baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  return `${Math.floor(hours / 24)} hari lalu`
}

export default function NotificationsPage() {
  const { data: notifications, loading, error, reload } = useAsync(fetchNotifications, [])
  const unread = (notifications ?? []).filter((item) => !item.read)
  const hasUnread = unread.length > 0

  const markAll = useCallback(() => {
    if (!unread.length) return
    markNotificationsRead(unread.map((item) => item.id)).then(reload).catch(() => reload())
  }, [unread, reload])

  return (
    <div className="feature-page narrow-page">
      <div className="page-intro page-intro-row">
        <div><span className="eyebrow">Stay in the loop</span><h2>Notifications.</h2></div>
        {hasUnread && <Button variant="outline" onClick={markAll}>Tandai semua dibaca</Button>}
      </div>

      {error ? (
        <div className="error-banner" role="alert"><strong>Notifikasi gagal dimuat.</strong><div><Button variant="outline" onClick={reload}>Coba lagi</Button></div></div>
      ) : loading ? (
        <Window title="Today"><Skeleton lines={3} /></Window>
      ) : (notifications ?? []).length === 0 ? (
        <Window title="Today" eyebrow="Notifications"><EmptyState title="Belum ada notifikasi." hint="Notifikasi hanya muncul dari kejadian nyata di aplikasi." /></Window>
      ) : (
        <Window title="Today" eyebrow={hasUnread ? `${unread.length} belum dibaca` : 'Semua sudah dibaca'}>
          <div className="notification-list">
            {(notifications ?? []).map((item) => (
              <div className={`notification-item ${item.read ? '' : 'unread'}`} key={item.id}>
                <span className="notification-dot" />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.body}</small>
                </span>
                <time>{timeAgo(item.createdAt)}</time>
              </div>
            ))}
          </div>
        </Window>
      )}
    </div>
  )
}
