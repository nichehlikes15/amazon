import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import './auth.css'
import { api } from '../modules/api'
import { Icon } from '../modules/icons'

// "Forgot your password?" - ask for a reset link.
export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    setBusy(true)
    try {
      await api.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-head">
          <p className="auth-kicker">Launchpad</p>
          <h1 className="auth-title">Reset your password</h1>
          <p className="auth-subtitle">Enter your email and we'll send you a link to choose a new password.</p>
        </div>

        {sent ? (
          <div className="auth-done" role="status">
            <span className="auth-done-icon"><Icon name="check" size={22} /></span>
            <p>
              If there's an account for <strong>{email}</strong>, a reset link has been made. The link works for
              30 minutes.
            </p>
            <p className="auth-note">
              Prototype note: emails aren't sent yet, so the link appears in the window running the Launchpad
              server. A live site would email it to you.
            </p>
          </div>
        ) : (
          <>
            {error && <div className="auth-error" role="alert">{error}</div>}
            <form onSubmit={submit} noValidate>
              <div className="auth-field">
                <label htmlFor="email">Email address</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email" required />
              </div>
              <button className="primary-button auth-submit" type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Send reset link'}
                {!busy && <Icon name="arrowRight" size={15} />}
              </button>
            </form>
          </>
        )}

        <p className="auth-switch">
          Remembered it? <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </main>
  )
}

// The page the reset link opens: choose a new password.
export function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError("The passwords don't match.")
      return
    }
    setBusy(true)
    try {
      await api.resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-head">
          <p className="auth-kicker">Launchpad</p>
          <h1 className="auth-title">Choose a new password</h1>
          <p className="auth-subtitle">Use at least 8 characters.</p>
        </div>

        {!token ? (
          <div className="auth-error" role="alert">
            This link is missing its code. Please use the full link, or <Link to="/forgot-password">ask for a new one</Link>.
          </div>
        ) : done ? (
          <div className="auth-done" role="status">
            <span className="auth-done-icon"><Icon name="check" size={22} /></span>
            <p>Your password has been changed. Taking you to sign in…</p>
          </div>
        ) : (
          <>
            {error && <div className="auth-error" role="alert">{error}</div>}
            <form onSubmit={submit} noValidate>
              <div className="auth-field">
                <label htmlFor="password">New password</label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password" required />
              </div>
              <div className="auth-field">
                <label htmlFor="confirm">Confirm new password</label>
                <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password" required />
              </div>
              <button className="primary-button auth-submit" type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save new password'}
                {!busy && <Icon name="arrowRight" size={15} />}
              </button>
            </form>
          </>
        )}

        <p className="auth-switch">
          <Link to="/forgot-password">Ask for a new link</Link>
        </p>
      </div>
    </main>
  )
}
