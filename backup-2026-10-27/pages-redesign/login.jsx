import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import './auth.css'
import { useAuth } from '../modules/auth'

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
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
          <h1 className="auth-title">Sign in</h1>
          <p className="auth-subtitle">Welcome back to Launchpad.</p>

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
            </div>
            <button className="primary-button auth-submit" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="auth-switch">
            New to Launchpad? <Link to="/signup">Create an account</Link>
          </p>
        </div>
      </main>
    </>
  )
}

export default Login
