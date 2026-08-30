import { Button, EmptyState, Window } from '../components/ui'

/**
 * Community feeds and people suggestions aren't wired to a live data source yet.
 * Honest empty states only — no fake posts, likes, or people to meet.
 */
export default function CommunityPage() {
  return (
    <div className="feature-page">
      <div className="page-intro page-intro-row">
        <div>
          <span className="eyebrow">The fan floor</span>
          <h2>Community.</h2>
          <p>A little place to share, discuss, and find your people.</p>
        </div>
        <Button disabled>Start a discussion +</Button>
      </div>

      <div className="community-layout">
        <Window title="Latest from fans" eyebrow="Your conversations">
          <EmptyState title="Belum ada diskusi." hint="Tidak ada utas palsu — hanya diskusi nyata yang ditampilkan." />
        </Window>
        <Window title="People to meet" eyebrow="Find your circle">
          <EmptyState title="Belum ada saran orang." />
        </Window>
      </div>
    </div>
  )
}
