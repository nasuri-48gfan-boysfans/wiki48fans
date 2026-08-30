import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { Mascot } from './components/Mascot'
import { Navigation } from './components/Navigation'
import { Avatar, Button, Window } from './components/ui'
import { getSession, onAuthStateChange, resetPassword, signIn, signOut, signUp } from './lib/auth'
import type { AuthSession, Profile } from './types/auth'

import HomePage from './pages/HomePage'
import MembersPage from './pages/MembersPage'
import MemberDetailPage from './pages/MemberDetailPage'
import LivePage from './pages/LivePage'
import NotificationsPage from './pages/NotificationsPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import WikiPage from './pages/WikiPage'
import CommunityPage from './pages/CommunityPage'
import MessagesPage from './pages/MessagesPage'
import ChannelsPage from './pages/ChannelsPage'

import './App.css'

function AuthLayout({ mode }: { mode: 'login' | 'register' }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const request = mode === 'register' ? signUp(email, password) : signIn(email, password)
    request
      .then((session) => {
        if (mode === 'register' || !session) navigate('/verify-email')
        else window.location.assign('/')
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setSubmitting(false))
  }

  const brand = (
    <div className="brand-mark">
      <span className="brand-bird">✦</span>
      <span>48Fans<span className="brand-muted">Wiki</span></span>
    </div>
  )

  return (
    <main className="auth-page">
      <div className="auth-art">
        {brand}
        <div className="auth-art-copy">
          <Mascot />
          <span className="eyebrow">A home for every fan</span>
          <h1>Keep the moments<br /><em>that matter</em> close.</h1>
          <p>Follow your favorites, discover the story behind every member, and never miss a live.</p>
        </div>
        <div className="art-footer">
          <span>Built by fans, for fans</span>
          <span>01 / 48</span>
        </div>
      </div>

      <section className="auth-form">
        <div className="auth-form-inner">
          <div className="mobile-brand">{brand}</div>
          <span className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Start your journey'}</span>
          <h2>{mode === 'login' ? 'Sign in to your space' : 'Create your fan account'}</h2>
          <p className="form-intro">
            {mode === 'login'
              ? 'Your corner of the 48 Group community is waiting.'
              : 'A few details, then we will get you set up.'}
          </p>
          <form onSubmit={submit}>
            <label>
              Email address
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} required />
            </label>
            {mode === 'login' && <a className="form-link" href="/forgot-password">Forgot password?</a>}
            {error && <p className="form-error" role="alert">{error}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Connecting...' : mode === 'login' ? 'Continue to 48FansWiki  →' : 'Create account  →'}
            </Button>
          </form>
          <p className="form-switch">
            {mode === 'login' ? 'New here?' : 'Already have an account?'}{' '}
            <a href={mode === 'login' ? '/register' : '/login'}>{mode === 'login' ? 'Create an account' : 'Sign in'}</a>
          </p>
          <small className="legal-copy">By continuing you agree to the 48FansWiki terms and privacy policy. Real-time member and live data is loaded from live sources — no fabricated content.</small>
        </div>
      </section>
    </main>
  )
}

function VerifyPage() {
  return (
    <main className="center-page">
      <Mascot />
      <span className="eyebrow">One more step</span>
      <h1>Check your inbox.</h1>
      <p>We sent a verification link to your new account. Once verified, you can choose your Oshi and interests.</p>
      <Button onClick={() => window.location.assign('/')}>I have verified my email  →</Button>
      <a href="/login" className="form-link">Return to sign in</a>
    </main>
  )
}

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    resetPassword(email).then(() => setSent(true)).catch((requestError: Error) => setError(requestError.message))
  }
  return (
    <main className="center-page">
      {sent ? (
        <>
          <Mascot />
          <span className="eyebrow">Check your inbox</span>
          <h1>Reset link sent.</h1>
          <p>If an account exists for {email}, Supabase has sent instructions to reset the password.</p>
          <a href="/login" className="form-link">Return to sign in</a>
        </>
      ) : (
        <>
          <span className="eyebrow">Account recovery</span>
          <h1>Forgot password?</h1>
          <p>Enter your email and we will send a secure reset link.</p>
          <form onSubmit={submit} className="recovery-form">
            <label>
              Email address
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <Button type="submit">Send reset link  →</Button>
          </form>
          <a href="/login" className="form-link">Return to sign in</a>
        </>
      )}
    </main>
  )
}

function NotFoundPage() {
  return (
    <Window title="Halaman tidak ditemukan" eyebrow="404">
      <div className="placeholder"><span aria-hidden="true">✦</span><p>Halaman ini tidak ada, atau datanya belum tersedia.</p></div>
    </Window>
  )
}

function MemberDetailRoute() {
  const { id = '' } = useParams()
  return <MemberDetailPage memberId={id} />
}

function dayInfo(): { weekday: string; date: string; greeting: string } {
  const now = new Date()
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' })
  const date = now.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return { weekday, date, greeting }
}

function ProtectedLayout({ profile, onSignOut, onProfileUpdated }: { profile: Profile; onSignOut: () => void; onProfileUpdated: () => void }) {
  const today = dayInfo()
  return (
    <div className="app-shell">
      <Navigation profile={profile} onSignOut={onSignOut} />
      <main className="content">
        <header className="topbar">
          <div>
            <span className="eyebrow">{today.weekday}, {today.date}</span>
            <h1>{today.greeting}, {profile.displayName.split(' ')[0]} <span className="wave">✦</span></h1>
          </div>
          <div className="top-actions">
            <a href="/notifications" className="icon-button" aria-label="Notifications">♧<span className="notification-dot" /></a>
            <Avatar name={profile.displayName} />
          </div>
        </header>
        <Routes>
          <Route path="/" element={<HomePage profile={profile} />} />
          <Route path="/wiki" element={<WikiPage />} />
          <Route path="/members" element={<MembersPage profile={profile} />} />
          <Route path="/members/:id" element={<MemberDetailRoute />} />
          <Route path="/live" element={<LivePage profile={profile} />} />
          <Route path="/profile" element={<ProfilePage profile={profile} />} />
          <Route path="/settings" element={<SettingsPage profile={profile} onSaved={onProfileUpdated} />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/channels" element={<ChannelsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSession().then(setSession).finally(() => setLoading(false))
    const { data } = onAuthStateChange((nextSession) => setSession(nextSession))
    return () => data.subscription.unsubscribe()
  }, [])

  const handleSignOut = () => { signOut().then(() => setSession(null)) }
  const refreshProfile = () => { getSession().then(setSession) }

  if (loading) return <main className="center-page"><Mascot /><p>Loading your space...</p></main>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <AuthLayout mode="login" />} />
        <Route path="/register" element={session ? <Navigate to="/" replace /> : <AuthLayout mode="register" />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify-email" element={<VerifyPage />} />
        <Route
          path="*"
          element={session
            ? <ProtectedLayout profile={session.profile} onSignOut={handleSignOut} onProfileUpdated={refreshProfile} />
            : <Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
