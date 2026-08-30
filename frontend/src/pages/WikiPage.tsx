import { Badge, Button, EmptyState, Window } from '../components/ui'

/**
 * Wiki content isn't seeded/produced yet. This page is intentionally empty —
 * no fake entries, no fabricated revisions. Filter UI is kept for structure.
 */
export default function WikiPage() {
  return (
    <div className="feature-page">
      <div className="page-intro">
        <span className="eyebrow">The living archive</span>
        <h2>Explore the Wiki.</h2>
        <p>Stories, people, and moments from across the 48 Group universe.</p>
      </div>

      <div className="search-box">
        <span aria-hidden="true">⌕</span>
        <input aria-label="Search the Wiki" placeholder="Search members, groups, songs, events..." />
      </div>

      <div className="filter-row">
        <Badge tone="accent">All entries</Badge>
        <span>Groups</span>
        <span>Members</span>
        <span>Songs</span>
        <span>Events</span>
      </div>

      <Window title="Entries" eyebrow="Hasil pencarian">
        <EmptyState title="Belum ada konten Wiki." hint="Entry akan muncul saat konten Wiki benar-benar diterbitkan." />
      </Window>

      <Window title="Recently updated" eyebrow="From the community">
        <EmptyState title="Belum ada revisi." hint="Tidak ada revisi palsu — riwayat hanya menampilkan perubahan nyata." />
      </Window>

      <div className="page-actions">
        <Button disabled>Buat entry (belum tersedia)</Button>
      </div>
    </div>
  )
}
