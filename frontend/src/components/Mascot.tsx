/**
 * 48FansWiki bird mascot.
 *
 * The mascot is drawn from characters (wing + body + beak) — no raster/vector
 * image asset exists in the repo, so this component IS the mascot. It is used
 * across the brand: welcome banner, auth screen, empty states, loading and error
 * states. Animations are light and respect `prefers-reduced-motion`.
 */
export function Mascot({ compact = false, label = '48FansWiki bird mascot' }: { compact?: boolean; label?: string }) {
  return (
    <div className={compact ? 'mascot mascot-compact' : 'mascot'} role="img" aria-label={label}>
      <span className="mascot-feather mascot-feather-one" aria-hidden="true" />
      <span className="mascot-wing" aria-hidden="true">⌁</span>
      <span className="mascot-body" aria-hidden="true"><span className="mascot-eye" /></span>
      <span className="mascot-beak" aria-hidden="true">›</span>
      <span className="mascot-feather mascot-feather-two" aria-hidden="true" />
    </div>
  )
}
