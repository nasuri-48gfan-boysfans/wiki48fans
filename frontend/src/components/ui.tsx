import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Mascot } from './Mascot'

export function Button({ children, variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'quiet' | 'outline'; children: ReactNode }) { return <button className={`button button-${variant}`} {...props}>{children}</button> }
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'live' | 'accent' }) { return <span className={`badge badge-${tone}`}>{children}</span> }
export function Avatar({ name, size = 'medium' }: { name: string; size?: 'small' | 'medium' | 'large' }) { const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(); return <span className={`avatar avatar-${size}`} aria-label={name}>{initials}</span> }
/** Avatar that shows a member photo when available, else falls back to initials. */
export function PhotoAvatar({ name, src, size = 'medium' }: { name: string; src?: string; size?: 'small' | 'medium' | 'large' }) {
  if (src) return <span className={`avatar avatar-${size}`} aria-label={name}><img className="avatar-img" src={src} alt={name} loading="lazy" /></span>
  return <Avatar name={name} size={size} />
}
export function Window({ title, eyebrow, children, className = '' }: { title: string; eyebrow?: string; children: ReactNode; className?: string }) { return <section className={`window ${className}`}><div className="window-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div><span className="window-dots" aria-hidden="true">•••</span></div>{children}</section> }

/** Consistent empty state, using the 48FansWiki mascot. */
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="placeholder">
      <Mascot compact />
      <p>{title}</p>
      {hint && <small className="empty-hint">{hint}</small>}
    </div>
  )
}

/** Loading state — the mascot bobs gently while a section/screen loads. */
export function MascotLoader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="placeholder mascot-loader">
      <Mascot compact />
      <p>{label}</p>
    </div>
  )
}

/** Consistent friendly error state (never shows a raw stack trace). */
export function ErrorState({ title, hint, onRetry }: { title: string; hint?: string; onRetry?: () => void }) {
  return (
    <div className="placeholder">
      <Mascot compact />
      <p>{title}</p>
      {hint && <small className="empty-hint">{hint}</small>}
      {onRetry && <Button variant="outline" onClick={onRetry}>Coba lagi</Button>}
    </div>
  )
}

/** Minimal skeleton placeholder while an API-driven section loads. */
export function Skeleton({ lines = 3 }: { lines?: number }) {
  return <div className="skeleton" aria-hidden="true">{Array.from({ length: lines }).map((_, index) => <span className="skeleton-line" key={index} />)}</div>
}
