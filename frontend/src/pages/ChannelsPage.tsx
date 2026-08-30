import { Button, EmptyState, Skeleton, Window } from '../components/ui'
import { fetchChannels } from '../lib/api/channels'
import { useAsync } from '../lib/api/useAsync'

export default function ChannelsPage() {
  const { data: channels, loading, error, reload } = useAsync(fetchChannels, [])

  return (
    <div className="feature-page">
      <div className="page-intro page-intro-row">
        <div>
          <span className="eyebrow">Fan-made spaces</span>
          <h2>Channels.</h2>
          <p>Follow the conversations that feel like home.</p>
        </div>
        <Button disabled>Create a channel +</Button>
      </div>

      {error ? (
        <div className="error-banner" role="alert">
          <strong>Channel gagal dimuat.</strong>
          <div><Button variant="outline" onClick={reload}>Coba lagi</Button></div>
        </div>
      ) : loading ? (
        <div className="skeleton-grid"><Skeleton lines={3} /><Skeleton lines={3} /><Skeleton lines={3} /></div>
      ) : (channels ?? []).length === 0 ? (
        <Window title="Channels" eyebrow="Fan-made spaces">
          <EmptyState title="Belum ada channel." hint="Channel baru akan tampil di sini setelah dibuat dan aktif." />
        </Window>
      ) : (
        <div className="channel-grid">
          {(channels ?? []).map((channel) => (
            <article className="channel-card" key={channel.id}>
              <div className="channel-card-body">
                <h3>{channel.name}</h3>
                <p>{channel.description}</p>
                <Button variant="outline" disabled>Follow +</Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Window title="How channels work" eyebrow="A note for future creators">
        <p className="window-copy">Channels are spaces made by fans for fans. Creation will require verified payment before activation. No channel is activated by a frontend payment state.</p>
      </Window>
    </div>
  )
}
