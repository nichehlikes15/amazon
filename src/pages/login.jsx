import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './auth.css'
import { useAuth } from '../modules/auth'
import { Icon } from '../modules/icons'
import { SignInLink, nextPageName, useNextPath } from '../modules/return-to'

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  // Where you were before being asked to sign in (My profile if nowhere).
  const next = useNextPath()
  const goingTo = nextPageName(next)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
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
            <h1 className="auth-title">Sign in</h1>
            <p className="auth-subtitle">
              {goingTo ? <>Sign in to carry on to <strong>{goingTo}</strong>.</> : 'Welcome back to Launchpad.'}
            </p>
          </div>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
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
                autoComplete="current-password"
                required
              />
              <p className="auth-forgot"><SignInLink to="/forgot-password">Forgot your password?</SignInLink></p>
            </div>
            <button className="primary-button auth-submit" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
              {!busy && <Icon name="arrowRight" size={15} />}
            </button>
          </form>

          <p className="auth-reassure">
            <Icon name="check" size={15} />
            Pick up where you left off with your saved opportunities.
          </p>

          <p className="auth-switch">
            New to Launchpad? <SignInLink to="/signup">Create an account</SignInLink>
          </p>
        </div>
      </main>
    </>
  )
}

export default Login
