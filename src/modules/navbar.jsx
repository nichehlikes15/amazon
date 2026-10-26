import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './navbar.css'
import { useAuth } from './auth'

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [tlevelOpen, setTlevelOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const tlevelRef = useRef(null)
  const accountRef = useRef(null)

  // Close any open dropdown when clicking outside it.
  useEffect(() => {
    const onClick = (e) => {
      if (tlevelRef.current && !tlevelRef.current.contains(e.target)) setTlevelOpen(false)
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  const handleLogout = async () => {
    setAccountOpen(false)
    await logout()
    navigate('/')
  }

  const firstName = user ? user.fullName.split(' ')[0] : null

  return (
    <header className="site-header">
      <nav className="nav-bar" aria-label="Main navigation">
        <Link className="brand" to="/" aria-label="Launchpad home">
          <img src="/assets/images/launchpad.svg" alt="Launchpad" />
        </Link>

        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/opportunities">Opportunities</Link>

          {/* T Levels dropdown */}
          <div className="nav-dropdown" ref={tlevelRef}>
            <button
              type="button"
              className="nav-dropdown-toggle"
              onClick={() => setTlevelOpen((o) => !o)}
              aria-expanded={tlevelOpen}
              aria-haspopup="true"
            >
              T Levels
              <span className="nav-caret" aria-hidden="true">&#8964;</span>
            </button>
            <div className={tlevelOpen ? 'nav-menu show' : 'nav-menu'}>
              <Link to="/tlevel" onClick={() => setTlevelOpen(false)}>Overview</Link>
              <Link to="/information" onClick={() => setTlevelOpen(false)}>Pathways</Link>
              <Link to="/t-level/advice" onClick={() => setTlevelOpen(false)}>Advice</Link>
              <Link to="/quiz" onClick={() => setTlevelOpen(false)}>Career quiz</Link>
            </div>
          </div>

          <Link to="/about-us">About us</Link>
        </div>

        {user ? (
          <div className="nav-profile" ref={accountRef}>
            <button
              className="nav-profile-button"
              type="button"
              onClick={() => setAccountOpen((o) => !o)}
              aria-label="Open account menu"
              aria-haspopup="true"
              aria-expanded={accountOpen}
            >
              <img
                className="profile-picture"
                src="/assets/images/defaultprofile.svg"
                alt=""
              />
              <span className="nav-profile-text">
                <span className="profile-greeting">Hello, {firstName}</span>
                <span className="profile-name">Account &amp; Lists</span>
              </span>
              <span className="profile-arrow" aria-hidden="true">&#8964;</span>
            </button>

            <div className={accountOpen ? 'profile-dropdown show' : 'profile-dropdown'}>
              <Link to="/profile" onClick={() => setAccountOpen(false)}>My Profile</Link>
              <Link to="/settings" onClick={() => setAccountOpen(false)}>Settings</Link>
              <Link to="/alummi" onClick={() => setAccountOpen(false)}>Career Journey</Link>
              {user.isAdmin && <Link to="/admin" onClick={() => setAccountOpen(false)}>Admin</Link>}
              <button type="button" className="dropdown-signout" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <div className="nav-auth">
            <Link className="nav-signin" to="/login">Sign in</Link>
            <Link className="nav-signup" to="/signup">Create account</Link>
          </div>
        )}
      </nav>
    </header>
  )
}

export default Navbar
