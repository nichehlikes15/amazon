import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import './settings.css'
import { api } from '../modules/api'
import { useAuth } from '../modules/auth'
import { useAccessibility } from '../modules/accessibility'
import { Icon } from '../modules/icons'
import { SignInRedirect } from '../modules/return-to'
import { RoleChoice } from '../modules/role'
import { EMAIL_ERROR, isValidEmail } from '../modules/email-check'

/*
  Settings - one section at a time, picked from the side menu.
  The section is kept in the web address (#account, #password,
  #accessibility, #privacy) so other pages can link straight to it.
*/
const TABS = [
  { id: 'account', label: 'Profile', desc: 'Name, email and school', icon: 'user' },
  { id: 'password', label: 'Password & security', desc: 'Change your password', icon: 'lock' },
  { id: 'accessibility', label: 'Display & accessibility', desc: 'Theme, text size and motion', icon: 'access' },
  { id: 'privacy', label: 'Privacy & data', desc: 'Download or delete your data', icon: 'shield' },
]
const ALIASES = { profile: 'account', security: 'password', display: 'accessibility', appearance: 'accessibility', data: 'privacy' }

function tabFromHash(hash) {
  const raw = (hash || '').replace('#', '')
  const id = ALIASES[raw] || raw
  return TABS.some((t) => t.id === id) ? id : 'account'
}

const THEMES = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: null, label: 'Match my device' },
]
const SIZES = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
]

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={checked ? 'st-switch is-on' : 'st-switch'}
      onClick={() => onChange(!checked)}
    >
      <span className="st-switch-knob" />
    </button>
  )
}

// A setting row: title + description on the left, the control on the right.
function Row({ title, children, control, icon }) {
  return (
    <div className="st-row">
      {icon && <span className="st-row-icon"><Icon name={icon} size={18} /></span>}
      <div className="st-row-text">
        <h4>{title}</h4>
        {children && <p>{children}</p>}
      </div>
      <div className="st-row-control">{control}</div>
    </div>
  )
}

function PasswordField({ label, value, onChange, autoComplete, id }) {
  const [show, setShow] = useState(false)
  return (
    <div className="st-field">
      <label htmlFor={id}>{label}</label>
      <div className="st-pw">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="st-pw-eye"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={show}
        >
          <Icon name={show ? 'eyeOff' : 'eye'} size={17} />
        </button>
      </div>
    </div>
  )
}

function passwordStrength(pw) {
  if (!pw) return { level: -1, label: '' }
  if (pw.length < 8) return { level: 0, label: 'Too short' }
  const extra = [/\d/.test(pw), /[a-z]/.test(pw) && /[A-Z]/.test(pw), /[^A-Za-z0-9]/.test(pw), pw.length >= 12]
    .filter(Boolean).length
  const level = Math.min(3, 1 + Math.floor(extra * 0.75))
  return { level, label: ['Too short', 'Okay', 'Good', 'Strong'][level] }
}

function Settings() {
  const { user, setUser, loading, logout } = useAuth()
  const navigate = useNavigate()
  const { hash } = useLocation()
  const [a11y, setA11y] = useAccessibility()

  // ---- Which section is showing (with a fade between them) ----
  const [active, setActive] = useState(() => tabFromHash(hash))
  const [shown, setShown] = useState(active)
  const [leaving, setLeaving] = useState(false)
  const swapTimer = useRef(null)

  const reduceMotion = () =>
    document.documentElement.getAttribute('data-reduced-motion') === 'on' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const swapTo = (id) => {
    setActive(id)
    clearTimeout(swapTimer.current)
    if (reduceMotion()) { setShown(id); return }
    setLeaving(true)
    swapTimer.current = setTimeout(() => { setShown(id); setLeaving(false) }, 180)
  }

  useEffect(() => () => clearTimeout(swapTimer.current), [])

  useEffect(() => {
    const id = tabFromHash(hash)
    if (id !== active) swapTo(id)
  }, [hash]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectTab = (id) => {
    if (id === active) return
    swapTo(id)
    navigate({ hash: id }, { replace: true })
  }

  const onTabKey = (e) => {
    if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) return
    e.preventDefault()
    const i = TABS.findIndex((t) => t.id === active)
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : TABS.length - 1
    const next = TABS[(i + step) % TABS.length].id
    selectTab(next)
    document.getElementById(`st-tab-${next}`)?.focus()
  }

  // ---- Little "saved" message in the corner ----
  const [toast, setToast] = useState({ text: '', tone: 'ok', shown: false })
  const toastTimer = useRef(null)
  const notify = (text, tone = 'ok') => {
    clearTimeout(toastTimer.current)
    setToast({ text, tone, shown: true })
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, shown: false })), 2600)
  }
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  // ---- Profile ----
  const [form, setForm] = useState({ fullName: '', email: '', school: '', emailUpdates: true, role: '' })
  const [ready, setReady] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')

  const baseline = user
    ? { fullName: user.fullName || '', email: user.email || '', school: user.school || '', emailUpdates: user.emailUpdates !== false, role: user.role || '' }
    : null

  useEffect(() => {
    if (!user) return
    setForm({
      fullName: user.fullName || '',
      email: user.email || '',
      school: user.school || '',
      emailUpdates: user.emailUpdates !== false,
      role: user.role || '',
    })
    setReady(true)
  }, [user])

  const dirty = Boolean(ready && baseline && Object.keys(baseline).some((k) => form[k] !== baseline[k]))

  const saveProfile = async (e) => {
    e?.preventDefault()
    setProfileError('')
    if (!form.fullName.trim() || !form.email.trim()) {
      setProfileError('Please add your name and email.')
      return
    }
    if (!isValidEmail(form.email)) {
      setProfileError(EMAIL_ERROR)
      return
    }
    setSavingProfile(true)
    try {
      const data = await api.updateMe(form)
      setUser(data.user)
      notify('Your details have been saved')
    } catch (err) {
      setProfileError(err.message)
    } finally {
      setSavingProfile(false)
    }
  }

  const discardProfile = () => {
    if (baseline) setForm(baseline)
    setProfileError('')
  }

  // ---- Password ----
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const strength = passwordStrength(pw.next)
  const matches = pw.confirm.length > 0 && pw.next === pw.confirm
  const canSavePw = pw.current.length > 0 && pw.next.length >= 8 && matches && !savingPw

  const savePassword = async (e) => {
    e.preventDefault()
    setPwError('')
    if (!canSavePw) return
    setSavingPw(true)
    try {
      await api.changePassword(pw.current, pw.next)
      setPw({ current: '', next: '', confirm: '' })
      notify('Your password has been changed')
    } catch (err) {
      setPwError(err.message)
    } finally {
      setSavingPw(false)
    }
  }

  const signOut = async () => {
    await logout()
    navigate('/')
  }

  // ---- Display & accessibility (saved in this browser) ----
  const setDisplay = (patch, message = 'Saved on this device') => {
    setA11y(patch)
    notify(message)
  }
  const sizeIndex = Math.max(0, SIZES.findIndex((s) => s.id === a11y.textSize))

  // ---- Privacy & data ----
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [privacyError, setPrivacyError] = useState('')

  const downloadData = async () => {
    setPrivacyError('')
    try {
      const everything = await api.exportMe()
      const blob = new Blob([JSON.stringify({ ...everything, accessibility: a11y }, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'launchpad-my-data.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      notify('Your data is downloading')
    } catch (err) {
      setPrivacyError(`We couldn't download your data: ${err.message}`)
    }
  }

  const deleteAccount = async () => {
    if (deleteText !== 'DELETE') return
    setDeleting(true)
    setPrivacyError('')
    try {
      await api.deleteMe()
      setUser(null)
      navigate('/')
    } catch (err) {
      setPrivacyError(err.message)
      setDeleting(false)
    }
  }

  if (loading) return null
  if (!user) return <SignInRedirect />

  const tab = TABS.find((t) => t.id === shown)

  return (
    <main className="st">
      <header className="st-hero">
        <div className="st-hero-inner">
          <p className="st-kicker">Settings</p>
          <h1>Make Launchpad <span>yours</span></h1>
          <div className="st-id">
            <span className="st-avatar" aria-hidden="true"><img src="/assets/images/defaultprofile.svg" alt="" /></span>
            <span className="st-id-text">
              <strong>{user.fullName}</strong>
              <span>{user.email}{user.school ? ` · ${user.school}` : ''}</span>
            </span>
          </div>
        </div>
      </header>

      <div className="st-body">
        {/* Side menu */}
        <nav className="st-nav" aria-label="Settings sections">
          <div className="st-tabs" role="tablist" aria-orientation="vertical" onKeyDown={onTabKey}>
            {TABS.map((t) => (
              <button
                key={t.id}
                id={`st-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={active === t.id}
                aria-controls="st-panel"
                tabIndex={active === t.id ? 0 : -1}
                className={active === t.id ? 'st-tab is-active' : 'st-tab'}
                onClick={() => selectTab(t.id)}
              >
                <span className="st-tab-icon"><Icon name={t.icon} size={18} /></span>
                <span className="st-tab-text">
                  <strong>{t.label}</strong>
                  <span>{t.desc}</span>
                </span>
              </button>
            ))}
          </div>
          <button type="button" className="st-signout" onClick={signOut}>
            <Icon name="logout" size={16} /> Sign out
          </button>
        </nav>

        {/* Selected section */}
        <section
          id="st-panel"
          role="tabpanel"
          aria-labelledby={`st-tab-${shown}`}
          className={leaving ? 'st-panel is-leaving' : 'st-panel'}
          key={shown}
        >
          <div className="st-panel-head">
            <h2>{tab.label}</h2>
            <p>{tab.desc}</p>
          </div>

          {/* ---------- Profile ---------- */}
          {shown === 'account' && (
            <form onSubmit={saveProfile} noValidate>
              <div className="st-group">
                <h3>Your details</h3>
                <div className="st-card st-card-pad">
                  <div className="st-fields">
                    <div className="st-field">
                      <label htmlFor="st-name">Full name</label>
                      <input id="st-name" type="text" value={form.fullName} autoComplete="name"
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                    </div>
                    <div className="st-field">
                      <label htmlFor="st-email">Email address</label>
                      <input id="st-email" type="email" value={form.email} autoComplete="email"
                        onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div className="st-field st-field-wide">
                      <label htmlFor="st-school">School or college</label>
                      <input id="st-school" type="text" value={form.school} placeholder="For example, Riverside College"
                        onChange={(e) => setForm({ ...form, school: e.target.value })} />
                      <span className="st-hint">Shown on your profile.</span>
                    </div>
                    <div className="st-field st-field-wide">
                      <span className="st-role-label">I am a…</span>
                      <RoleChoice value={form.role} onChange={(r) => setForm({ ...form, role: r })} compact name="settings-role" />
                      <span className="st-hint">We hide links you don&apos;t need from the menu. You can still open every page.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="st-group">
                <h3>Emails</h3>
                <div className="st-card">
                  <Row
                    icon="mail"
                    title="Email updates"
                    control={<Switch label="Email updates" checked={form.emailUpdates}
                      onChange={(v) => setForm({ ...form, emailUpdates: v })} />}
                  >
                    Get new opportunities and reminders by email.
                  </Row>
                </div>
              </div>

              {profileError && <p className="st-error" role="alert">{profileError}</p>}

              {/* Appears when something has changed */}
              <div className={dirty ? 'st-savebar is-shown' : 'st-savebar'} aria-hidden={!dirty}>
                <span><Icon name="check" size={15} /> You have unsaved changes</span>
                <div>
                  <button type="button" className="st-btn-ghost" onClick={discardProfile} tabIndex={dirty ? 0 : -1}>
                    Discard
                  </button>
                  <button type="submit" className="primary-button" disabled={savingProfile} tabIndex={dirty ? 0 : -1}>
                    {savingProfile ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ---------- Password & security ---------- */}
          {shown === 'password' && (
            <>
              <form className="st-group" onSubmit={savePassword} noValidate>
                <h3>Change password</h3>
                <div className="st-card st-card-pad">
                  <PasswordField id="st-pw-current" label="Current password" value={pw.current}
                    onChange={(v) => setPw({ ...pw, current: v })} autoComplete="current-password" />

                  <PasswordField id="st-pw-new" label="New password" value={pw.next}
                    onChange={(v) => setPw({ ...pw, next: v })} autoComplete="new-password" />

                  <div className="st-strength" aria-live="polite">
                    <div className={`st-strength-bars is-${strength.level}`} aria-hidden="true">
                      <span /><span /><span /><span />
                    </div>
                    <span className="st-strength-label">{strength.label}</span>
                  </div>
                  <ul className="st-reqs">
                    <li className={pw.next.length >= 8 ? 'is-met' : ''}>
                      <Icon name="check" size={13} /> At least 8 characters <em>(needed)</em>
                    </li>
                    <li className={/\d/.test(pw.next) ? 'is-met' : ''}>
                      <Icon name="check" size={13} /> A number
                    </li>
                    <li className={/[a-z]/.test(pw.next) && /[A-Z]/.test(pw.next) ? 'is-met' : ''}>
                      <Icon name="check" size={13} /> Capital and lower case letters
                    </li>
                    <li className={/[^A-Za-z0-9]/.test(pw.next) ? 'is-met' : ''}>
                      <Icon name="check" size={13} /> A symbol, like ! or ?
                    </li>
                  </ul>

                  <PasswordField id="st-pw-confirm" label="Confirm new password" value={pw.confirm}
                    onChange={(v) => setPw({ ...pw, confirm: v })} autoComplete="new-password" />
                  {pw.confirm && (
                    <p className={matches ? 'st-match is-ok' : 'st-match'}>
                      <Icon name={matches ? 'check' : 'close'} size={14} />
                      {matches ? 'Passwords match' : "Passwords don't match yet"}
                    </p>
                  )}

                  {pwError && <p className="st-error" role="alert">{pwError}</p>}

                  <div className="st-card-actions">
                    <button type="submit" className="primary-button" disabled={!canSavePw}>
                      {savingPw ? 'Updating…' : 'Update password'}
                    </button>
                  </div>
                </div>
              </form>

              <div className="st-group">
                <h3>This browser</h3>
                <div className="st-card">
                  <Row
                    icon="monitor"
                    title="Signed in"
                    control={
                      <button type="button" className="secondary-button st-btn-sm" onClick={signOut}>
                        <Icon name="logout" size={15} /> Sign out
                      </button>
                    }
                  >
                    You're signed in as {user.email}.
                  </Row>
                </div>
              </div>
            </>
          )}

          {/* ---------- Display & accessibility ---------- */}
          {shown === 'accessibility' && (
            <>
              <div className="st-group">
                <h3>Theme</h3>
                <div className="st-themes" role="radiogroup" aria-label="Theme">
                  {THEMES.map((t) => {
                    const on = (a11y.theme || null) === t.id
                    return (
                      <button
                        key={t.label}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        className={on ? 'st-theme is-on' : 'st-theme'}
                        onClick={() => setDisplay({ theme: t.id }, t.id ? `${t.label} mode on` : 'Following your device')}
                      >
                        <span className={`st-mini st-mini-${t.id || 'auto'}`} aria-hidden="true">
                          <span className="st-mini-page">
                            <span className="st-mini-bar" />
                            <span className="st-mini-line" />
                            <span className="st-mini-line st-mini-short" />
                            <span className="st-mini-btn" />
                          </span>
                        </span>
                        <span className="st-theme-label">
                          <span className="st-radio" aria-hidden="true" />
                          {t.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="st-group">
                <h3>Text size</h3>
                <div className="st-card st-card-pad">
                  <div className="st-seg" role="radiogroup" aria-label="Text size" style={{ '--i': sizeIndex }}>
                    <span className="st-seg-thumb" aria-hidden="true" />
                    {SIZES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        role="radio"
                        aria-checked={a11y.textSize === s.id}
                        className={`st-seg-btn st-seg-${s.id}${a11y.textSize === s.id ? ' is-on' : ''}`}
                        onClick={() => setDisplay({ textSize: s.id }, `${s.label} text`)}
                      >
                        <span aria-hidden="true">A</span> {s.label}
                      </button>
                    ))}
                  </div>
                  <p className="st-preview">
                    This is how text looks across Launchpad. Pick the size that is most comfortable to read.
                  </p>
                </div>
              </div>

              <div className="st-group">
                <h3>Accessibility</h3>
                <div className="st-card">
                  <Row
                    icon="contrast"
                    title="High contrast"
                    control={<Switch label="High contrast" checked={a11y.highContrast}
                      onChange={(v) => setDisplay({ highContrast: v })} />}
                  >
                    Darker text, clearer edges and underlined links. Helpful for low vision.
                  </Row>
                  <Row
                    icon="eye"
                    title="Colour-blind friendly"
                    control={<Switch label="Colour-blind friendly" checked={a11y.colourBlind}
                      onChange={(v) => setDisplay({ colourBlind: v })} />}
                  >
                    Stronger colours that are easier to tell apart.
                  </Row>
                  <Row
                    icon="motion"
                    title="Reduce motion"
                    control={<Switch label="Reduce motion" checked={a11y.reducedMotion}
                      onChange={(v) => setDisplay({ reducedMotion: v })} />}
                  >
                    Turn off animations and smooth scrolling.
                  </Row>
                </div>
                <p className="st-foot">
                  These are saved on this device. They're also in the accessibility menu at the top of every page,
                  which can also read any page aloud.{' '}
                  <Link to="/accessibility">More about accessibility</Link>
                </p>
              </div>
            </>
          )}

          {/* ---------- Privacy & data ---------- */}
          {shown === 'privacy' && (
            <>
              <div className="st-group">
                <h3>Your data</h3>
                <div className="st-card">
                  <Row
                    icon="download"
                    title="Download my data"
                    control={
                      <button type="button" className="secondary-button st-btn-sm" onClick={downloadData}>
                        <Icon name="download" size={15} /> Download
                      </button>
                    }
                  >
                    Get a file with everything saved to your account.
                  </Row>
                  <Row
                    icon="file"
                    title="What we store"
                    control={
                      <Link className="secondary-button st-btn-sm" to="/privacy">
                        Read more <Icon name="arrowRight" size={14} />
                      </Link>
                    }
                  >
                    See what Launchpad keeps about you, and why.
                  </Row>
                </div>
              </div>

              {privacyError && <p className="st-error" role="alert">{privacyError}</p>}

              <div className="st-group">
                <h3>Delete account</h3>
                <div className="st-card st-card-danger">
                  <Row
                    icon="trash"
                    title="Delete my account"
                    control={!confirmDelete && (
                      <button type="button" className="st-btn-danger" onClick={() => setConfirmDelete(true)}>
                        Delete account
                      </button>
                    )}
                  >
                    This removes your account, saved opportunities, application tracking and files, your CV,
                    your coffee chat requests and your interview practice scores. It can't be undone.
                  </Row>

                  {confirmDelete && (
                    <div className="st-delete">
                      <label htmlFor="st-delete-input">
                        Type <strong>DELETE</strong> to confirm
                      </label>
                      <input
                        id="st-delete-input"
                        type="text"
                        value={deleteText}
                        onChange={(e) => setDeleteText(e.target.value)}
                        autoComplete="off"
                        spellCheck="false"
                      />
                      <div className="st-delete-actions">
                        <button type="button" className="st-btn-ghost"
                          onClick={() => { setConfirmDelete(false); setDeleteText('') }}>
                          Cancel
                        </button>
                        <button type="button" className="st-btn-danger is-solid"
                          disabled={deleteText !== 'DELETE' || deleting} onClick={deleteAccount}>
                          {deleting ? 'Deleting…' : 'Delete my account for good'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <div className={toast.shown ? `st-toast is-shown is-${toast.tone}` : `st-toast is-${toast.tone}`} role="status" aria-live="polite">
        <Icon name="check" size={16} />
        {toast.text}
      </div>
    </main>
  )
}

export default Settings
