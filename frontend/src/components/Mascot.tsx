/**
 * 48FansWiki kawaii bird mascot.
 *
 * Rendered as an inline SVG (no raster/vector asset required to display it).
 * The near wing (`wing-front`) and far wing (`wing-back`) are separate <g>
 * groups so CSS can flap them; the eye blinks; the whole bird gently floats.
 * A `flying` variant puts the wings up for the page-transition flight.
 */
export function Mascot({
  compact = false,
  flying = false,
  label = '48FansWiki kawaii bird mascot',
}: { compact?: boolean; flying?: boolean; label?: string }) {
  const wing = flying ? 'wing up' : 'wing'
  return (
    <div
      className={compact ? 'mascot mascot-compact' : 'mascot'}
      data-flying={flying || undefined}
      role="img"
      aria-label={label}
    >
      <svg viewBox="0 0 120 110" aria-hidden="true">
        {/* tail */}
        <path d="M20 74 Q8 78 6 70 Q12 66 22 68 Z" fill="#e8a53c" />
        <path d="M24 80 Q10 88 6 80 Q12 76 20 78 Z" fill="#e6b94d" />

        {/* body */}
        <ellipse cx="62" cy="62" rx="48" ry="42" fill="#f4c95d" stroke="#e6b94d" strokeWidth="3" />

        {/* belly */}
        <ellipse cx="66" cy="78" rx="26" ry="20" fill="#fff9e9" opacity="0.95" />

        {/* far wing (flaps) */}
        <g className={`${wing} wing-back`} transform="rotate(-14 44 54)">
          <path d="M40 50 Q20 34 16 52 Q30 56 44 58 Z" fill="#e88755" />
        </g>

        {/* near wing (flaps) */}
        <g className={`${wing} wing-front`} transform="rotate(8 92 50)">
          <path d="M88 48 Q112 30 116 50 Q104 60 92 58 Z" fill="#e88755" stroke="#d96f43" strokeWidth="2" />
        </g>

        {/* rosy cheek */}
        <ellipse cx="86" cy="70" rx="8" ry="5.5" fill="#f6a8a0" opacity="0.8" />

        {/* beak */}
        <path d="M96 60 Q112 62 98 68 Q94 64 96 60 Z" fill="#ff9a5a" stroke="#ef8a44" strokeWidth="1.5" />

        {/* eye (blinks) */}
        <g className="mascot-eye">
          <circle cx="80" cy="56" r="7.5" fill="#46372c" />
          <circle cx="82.5" cy="53.5" r="2.6" fill="#fff" />
          <circle cx="78" cy="58.5" r="1.2" fill="#fff" opacity="0.7" />
        </g>

        {/* crest feather */}
        <path d="M60 20 Q58 8 64 6 Q66 12 66 22 Z" fill="#f4c95d" stroke="#e6b94d" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

/**
 * Compact bird used as the brand mark / logo (nav + auth). Colored version.
 */
export function BirdLogo({ size = 28 }: { size?: number }) {
  return (
    <svg
      className="bird-logo"
      width={size}
      height={size}
      viewBox="0 0 120 110"
      aria-hidden="true"
    >
      <ellipse cx="62" cy="62" rx="48" ry="42" fill="#f4c95d" stroke="#e6b94d" strokeWidth="3" />
      <path d="M88 48 Q112 30 116 50 Q104 60 92 58 Z" fill="#e88755" stroke="#d96f43" strokeWidth="2" />
      <ellipse cx="86" cy="70" rx="8" ry="5.5" fill="#f6a8a0" opacity="0.8" />
      <path d="M96 60 Q112 62 98 68 Q94 64 96 60 Z" fill="#ff9a5a" stroke="#ef8a44" strokeWidth="1.5" />
      <circle cx="80" cy="56" r="7.5" fill="#46372c" />
      <circle cx="82.5" cy="53.5" r="2.6" fill="#fff" />
      <circle cx="78" cy="58.5" r="1.2" fill="#fff" opacity="0.7" />
      <path d="M60 20 Q58 8 64 6 Q66 12 66 22 Z" fill="#f4c95d" stroke="#e6b94d" strokeWidth="1.5" />
    </svg>
  )
}
