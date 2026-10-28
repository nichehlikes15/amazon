import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import './settings.css'
import { api } from '../modules/api'
import { useAuth } from '../modules/auth'
import { loadSettings, saveSettings } from '../modules/accessibility'

const SECTIONS = [
  { id: 'account', label: 'Account' },
  { id: 'password', label: 'Password' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'privacy', label: 'Privacy' },
]

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={checked ? 'st-toggle on' : 'st-toggle'}
      onClick={() => onChange(!checked)}
    >
      <span className="st-toggle-knob" />
    </button>
  )
}

function Settings() {
  const { user, setUser, loading } = useAuth()
  const navigate = useNavigate()

  // Account (saved to the backend)
  const [form, setForm] = useState({ fullName: '', email: '', school: '', emailUpdates: true })
  const [accountMsg, setAccountMsg] = useState(null)
  const [savingAccount, setSavingAccount] = useState(false)

  // Password (saved to the backend)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState(null)

  // Accessibility (saved in this browser)
  const initial = loadSettings()
  const [a11y, setA11y] = useState(initial)

  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName || '',
        email: user.email || '',
        school: user.school || '',
        emailUpdates: user.emailUpdates !== false,
      })
    }
  }, [user])

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const saveAccount = async (e) => {
    e.preventDefault()
    setAccountMsg(null)
    setSavingAccount(true)
    try {
      const data = await api.updateMe(form)
      setUser(data.user)
      setAccountMsg({ ok: true, text: 'Your details have been saved.' })
    } catch (err) {
      setAccountMsg({ ok: false, text: err.message })
    } finally {
      setSavingAccount(false)
    }
  }

  const savePassword = async (e) => {
    e.preventDefault()
    setPwMsg(null)
    if (pw.next !== pw.confirm) {
      setPwMsg({ ok: false, text: 'The new passwords do not match.' })
      return
    }
    try {
      await api.changePassword(pw.current, pw.next)
      setPw({ current: '', next: '', confirm: '' })
      setPwMsg({ ok: true, text: 'Your password has been changed.' })
    } catch (err) {
      setPwMsg({ ok: false, text: err.message })
    }
  }

  const updateA11y = (patch) => {
    const next = { ...a11y, ...patch }
    setA11y(next)
    saveSettings(next)
  }

  // Downloads everything the site stores about you (account, saved items,
  // progress, files list, CV review, interest forms, coffee chats).
  const downloadData = async () => {
    let everything = { account: user }
    try {
      everything = await api.exportMe()
    } catch (err) {
      setAccountMsg({ ok: false, text: `Could not download your full data: ${err.message}` })
      return
    }
    const blob = new Blob([JSON.stringify({ ...everything, accessibility: a11y }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'launchpad-my-data.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const deleteAccount = async () => {
    try {
      await api.deleteMe()
      setUser(null)
      navigate('/')
    } catch (err) {
      setAccountMsg({ ok: false, text: err.message })
    }
  }

  return (
    <main className="st">
      <header className="st-hero">
        <div className="st-hero-inner">
          <h1><span>Settings</span></h1>
          <p className="st-lead">Manage your details, password, accessibility and privacy.</p>
        </div>
      </header>

      <div className="st-body">
        <aside className="st-rail" aria-label="Settings sections">
          <ol>
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>
                  <span className="st-rail-n">{String(i + 1).padStart(2, '0')}</span>
                  {s.label}
                </a>
              </li>
            ))}
          </ol>
        </aside>

        <div className="st-sections">
          {/* Account */}
          <section className="st-row" id="account">
            <h2>Account</h2>
            <p className="st-intro">These details are saved to your Launchpad account.</p>
            <form onSubmit={saveAccount} noValidate>
              <div className="st-grid">
                <label className="st-field">
                  <span>Full name</span>
                  <input type="text" value={form.fullName} onChange={update('fullName')} autoComplete="name" />
                </label>
                <label className="st-field">
                  <span>Email address</span>
                  <input type="email" value={form.email} onChange={update('email')} autoComplete="email" />
                </label>
                <label className="st-field st-field-wide">
                  <span>School or college</span>
                  <input type="text" value={form.school} onChange={update('school')} placeholder="Enter your school" />
                </label>
              </div>

              <div className="st-line">
                <div>
                  <h3>Email updates</h3>
                  <p>Get new opportunities and reminders by email.</p>
                </div>
                <Toggle
                  label="Email updates"
                  checked={form.emailUpdates}
                  onChange={(v) => setForm({ ...form, emailUpdates: v })}
                />
              </div>

              {accountMsg && (
                <p className={accountMsg.ok ? 'st-msg ok' : 'st-msg err'} role="status">{accountMsg.text}</p>
              )}
              <button className="st-save" type="submit" disabled={savingAccount}>
                {savingAccount ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </section>

          {/* Password */}
          <section className="st-row" id="password">
            <h2>Password</h2>
            <p className="st-intro">Use at least 8 characters.</p>
            <form onSubmit={savePassword} noValidate>
              <div className="st-grid">
                <label className="st-field st-field-wide">
                  <span>Current password</span>
                  <input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
                </label>
                <label className="st-field">
                  <span>New password</span>
                  <input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" />
                </label>
                <label className="st-field">
                  <span>Confirm new password</span>
                  <input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" />
                </label>
              </div>
              {pwMsg && <p className={pwMsg.ok ? 'st-msg ok' : 'st-msg err'} role="status">{pwMsg.text}</p>}
              <button className="st-save" type="submit">Change password</button>
            </form>
          </section>

          {/* Accessibility */}
          <section className="st-row" id="accessibility">
            <h2>Accessibility</h2>
            <p className="st-intro">Saved on this device and applied straight away.</p>

            <div className="st-line">
              <div>
                <h3>Text size</h3>
                <p>Choose a comfortable reading size.</p>
              </div>
              <div className="st-choice" role="group" aria-label="Text size">
                {['small', 'medium', 'large'].map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={a11y.textSize === size ? 'is-active' : ''}
                    aria-pressed={a11y.textSize === size}
                    onClick={() => updateA11y({ textSize: size })}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="st-line">
              <div>
                <h3>Colour-blind friendly mode</h3>
                <p>Use a higher-contrast, colour-blind safe palette.</p>
              </div>
              <Toggle label="Colour-blind friendly mode" checked={a11y.colourBlind} onChange={(v) => updateA11y({ colourBlind: v })} />
            </div>

            <div className="st-line">
              <div>
                <h3>Reduce motion</h3>
                <p>Turn off animations and smooth scrolling.</p>
              </div>
              <Toggle label="Reduce motion" checked={a11y.reducedMotion} onChange={(v) => updateA11y({ reducedMotion: v })} />
            </div>
          </section>

          {/* Privacy */}
          <section className="st-row" id="privacy">
            <h2>Privacy</h2>
            <p className="st-intro">
              Your data is handled in line with UK GDPR. You can download it or delete your account at any time.
            </p>
            <div className="st-links">
              <button type="button" className="st-link" onClick={downloadData}>Download my data</button>
              {!confirmDelete ? (
                <button type="button" className="st-link st-danger" onClick={() => setConfirmDelete(true)}>
                  Delete my account
                </button>
              ) : (
                <span className="st-confirm">
                  This removes your account, saved items and uploads for good.
                  <button type="button" className="st-link st-danger" onClick={deleteAccount}>Yes, delete it</button>
                  <button type="button" className="st-link" onClick={() => setConfirmDelete(false)}>Cancel</button>
                </span>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

export default Settings
