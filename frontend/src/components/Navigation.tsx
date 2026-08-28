import { NavLink } from 'react-router-dom'
import type { Profile } from '../types/auth'
import { Avatar, Button } from './ui'

const links = [['/', '⌂', 'Home'], ['/wiki', '▤', 'Wiki'], ['/members', '✦', 'Members'], ['/live', '●', 'Live'], ['/community', '◌', 'Community'], ['/messages', '□', 'Messages'], ['/channels', '◈', 'Channels'], ['/notifications', '♧', 'Notifications'], ['/settings', '⚙', 'Settings']]

export function Navigation({ profile, onSignOut }: { profile: Profile; onSignOut: () => void }) { return <aside className="navigation"><div className="brand-mark"><span className="brand-bird">✦</span><span>48Fans<span className="brand-muted">Wiki</span></span></div><div className="nav-label">Your space</div><nav aria-label="Main navigation">{links.map(([to, icon, label]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><span className="nav-icon">{icon}</span>{label}</NavLink>)}</nav><div className="navigation-footer"><NavLink to="/profile" className="profile-link"><Avatar name={profile.displayName} size="small" /><span><strong>{profile.displayName}</strong><small>@{profile.handle}</small></span></NavLink><Button variant="quiet" onClick={onSignOut}>Sign out</Button></div></aside> }
