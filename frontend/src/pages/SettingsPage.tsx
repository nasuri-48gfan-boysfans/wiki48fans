import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Window } from '../components/ui'
import { getSession } from '../lib/auth'
import { updateProfile } from '../lib/profile'
import type { Profile } from '../types/auth'

export default function SettingsPage({ profile, onSaved }: { profile: Profile; onSaved?: () => void }) {
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [handle, setHandle] = useState(profile.handle)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError(''); setSaved(false)
    const cleanHandle = handle.trim().replace(/^@/, '')
    setSaving(true)
    updateProfile(profile.id, { displayName: displayName.trim(), handle: cleanHandle })
      .then(async () => {
        setSaved(true)
        const fresh = await getSession()
        if (fresh) onSaved?.()
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setSaving(false))
  }

  return (
    <div className="feature-page narrow-page">
      <div className="page-intro">
        <span className="eyebrow">Make 48FansWiki yours</span>
        <h2>Settings.</h2>
        <p>Manage your profile and the moments you want to hear about.</p>
      </div>

      <Window title="Profile details" eyebrow="Visible to the community">
        <form className="settings-form" onSubmit={submit}>
          <label>Display name
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
          </label>
          <label>Handle
            <input value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="you" required />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {saved && <p className="form-success" role="status">Tersimpan.</p>}
          <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan perubahan'}</Button>
        </form>
      </Window>

      <Window title="Notifications" eyebrow="Choose what reaches you">
        <p className="window-copy">Preferensi notifikasi akan tersedia di fase berikutnya. Oshi dan live kamu tetap tampil tanpa perlu pengaturan tambahan.</p>
      </Window>
    </div>
  )
}
