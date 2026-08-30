import { EmptyState, Window } from '../components/ui'

/**
 * Messages depend on real conversations created by real users. There is no
 * conversation/messaging flow wired to live data yet, so this page shows an
 * honest empty inbox instead of fabricated chats.
 */
export default function MessagesPage() {
  return (
    <div className="feature-page">
      <div className="page-intro">
        <span className="eyebrow">One-to-one, fan-to-fan</span>
        <h2>Messages.</h2>
        <p>Keep the conversation close.</p>
      </div>

      <div className="messages-layout">
        <Window title="Inbox" eyebrow="Percakapan">
          <EmptyState title="Belum ada pesan." hint="Status ini kosong — belum ada percakapan nyata untuk ditampilkan." />
        </Window>
        <Window title="Pilih percakapan" eyebrow="Direct message">
          <EmptyState title="Tidak ada percakapan dipilih." />
        </Window>
      </div>
    </div>
  )
}
