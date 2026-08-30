import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import type { Profile } from '../types/auth'
import { Avatar, Button } from './ui'
import { Icon, type IconName } from './icons'
import { BirdLogo } from './Mascot'

const links: Array<[string, IconName, string]> = [
  ['/', 'home', 'Home'],
  ['/wiki', 'wiki', 'Wiki'],
  ['/members', 'users', 'Members'],
  ['/groups', 'grid', 'Groups'],
  ['/live', 'radio', 'Live'],
  ['/community', 'community', 'Community'],
  ['/messages', 'messages', 'Messages'],
  ['/channels', 'channels', 'Channels'],
  ['/notifications', 'bell', 'Notifications'],
  ['/profile', 'user', 'Profile'],
  ['/settings', 'settings', 'Settings'],
]

export function Navigation({ profile, onSignOut }: { profile: Profile; onSignOut: () => void }) {
  const [open, setOpen] = useState(false)
  const navigationRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    const closeOnOutsideClick = (event: MouseEvent) => { if (open && navigationRef.current && !navigationRef.current.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => { document.removeEventListener('keydown', closeOnEscape); document.removeEventListener('mousedown', closeOnOutsideClick) }
  }, [open])

  return (
    <header className="navigation" ref={navigationRef}>
      <div className="navigation-bar">
        <NavLink to="/" className="brand-mark">
          <span className="brand-bird"><BirdLogo size={22} /></span>
          <span>48Fans<span className="brand-muted">Wiki</span></span>
        </NavLink>
        <div className="navigation-search">
          <Icon name="search" size={16} />
          <span>Search the 48 universe...</span>
        </div>
        <div className="navigation-actions">
          <button className="nav-trigger" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="navigation-window" onClick={() => setOpen((value) => !value)}>{open ? '×' : '☰'}</button>
          <NavLink to="/notifications" className="nav-notification" aria-label="Notifications"><Icon name="bell" size={20} /><span className="notification-dot" /></NavLink>
          <NavLink to="/profile" aria-label="Profile"><Avatar name={profile.displayName} size="small" /></NavLink>
        </div>
      </div>

      {open && (
        <div className="navigation-window" id="navigation-window">
          <div className="navigation-window-heading">
            <span className="eyebrow">Your space</span>
            <span className="window-dots" aria-hidden="true">•••</span>
          </div>
          <nav aria-label="Main navigation">
            {links.map(([to, icon, label]) => (
              <NavLink onClick={() => setOpen(false)} key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                <span className="nav-icon"><Icon name={icon} size={17} /></span>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="navigation-window-footer">
            <NavLink to="/profile" className="profile-link" onClick={() => setOpen(false)}>
              <Avatar name={profile.displayName} size="small" />
              <span><strong>{profile.displayName}</strong><small>@{profile.handle}</small></span>
            </NavLink>
            <Button variant="quiet" onClick={onSignOut}>Sign out</Button>
          </div>
        </div>
      )}
    </header>
  )
}
