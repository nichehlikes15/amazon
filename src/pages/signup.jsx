import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import './auth.css'
import { useAuth } from '../modules/auth'
import { Icon } from '../modules/icons'
import { SignInLink, nextPageName, useNextPath } from '../modules/return-to'
import { RoleChoice } from '../modules/role'
import { getLocalRole } from '../modules/role-store'
import { EMAIL_ERROR, isValidEmail } from '../modules/email-check'

function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  // Where you were before being asked to sign in (My profile if nowhere).
  const next = useNextPath()
  const goingTo = nextPageName(next)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  // Filled in if they already picked on the homepage.
  const [role, setRole] = useState(() => getLocalRole() || '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!isValidEmail(email)) {
      setError(EMAIL_ERROR)
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!role) {
      setError('Please choose whether you are a student, teacher or parent.')
      return
    }
    if (!consent) {
      setError('Please tick the box to agree to the privacy notice and terms of use.')
      return
    }
    setBusy(true)
    try {
      await signup(fullName, email, password, consent, role)
      navigate(next, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-head">
            <p className="auth-kicker">Launchpad</p>
            <h1 className="auth-title">Create your account</h1>
            <p className="auth-subtitle">
              {goingTo
                ? <>Create a free account to carry on to <strong>{goingTo}</strong>.</>
                : 'Save opportunities and register your interest with Amazon.'}
            </p>
          </div>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                aria-describedby="password-hint"
                required
              />
              <p className="auth-hint" id="password-hint">At least 8 characters.</p>
            </div>
            <div className="auth-field">
              <p className="auth-role-label">I am a…</p>
              <RoleChoice value={role} onChange={setRole} compact name="signup-role" />
            </div>
            <label className="auth-consent">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span className="auth-check" aria-hidden="true"><Icon name="check" size={12} /></span>
              <span>
                I've read the <Link to="/privacy">privacy notice</Link> and agree to the{' '}
                <Link to="/terms">terms of use</Link>. If I'm under 18, a parent or carer knows I'm using Launchpad.
              </span>
            </label>
            <button className="primary-button auth-submit" type="submit" disabled={busy}>
              {busy ? 'Creating account…' : 'Create account'}
              {!busy && <Icon name="arrowRight" size={15} />}
            </button>
          </form>

          <p className="auth-reassure">
            <Icon name="check" size={15} />
            You can download your data or delete your account at any time.
          </p>

          <p className="auth-switch">
            Already have an account? <SignInLink to="/login">Sign in</SignInLink>
          </p>
        </div>
      </main>
    </>
  )
}

export default Signup
