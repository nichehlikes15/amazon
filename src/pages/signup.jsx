import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import './auth.css'
import { useAuth } from '../modules/auth'
import { Icon } from '../modules/icons'

function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!consent) {
      setError('Please tick the box to agree to the privacy notice and terms of use.')
      return
    }
    setBusy(true)
    try {
      await signup(fullName, email, password, consent)
      navigate('/profile')
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
            <p className="auth-subtitle">Save opportunities and register your interest with Amazon.</p>
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
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </main>
    </>
  )
}

export default Signup
