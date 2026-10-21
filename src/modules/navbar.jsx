import { useNavigate } from 'react-router-dom'
import './navbar.css'
import { useAuth } from './auth'

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleLogout = async () => {
    await logout()
    document.getElementById('profile-dropdown')?.classList.remove('show')
    navigate('/')
  }

  const firstName = user ? user.fullName.split(' ')[0] : null

  return (
    <header className="site-header">
      <nav className="nav-bar" aria-label="Main navigation">
        <a className="brand" href="/" aria-label="Launchpad home">
          <img src="/assets/images/launchpad.svg" alt="Launchpad" />
        </a>

        <span className="nav-divider" aria-hidden="true" />

        <div className="nav-links">
          <a className="active" href="/">Home</a>
          <button type="button" onClick={() => scrollToSection('about')}>About us</button>
          <button type="button" onClick={() => scrollToSection('community')}>Community</button>
        </div>

        {user ? (
          <div className="nav-profile">
            <button
              className="nav-profile-button"
              type="button"
              onClick={() =>
                document
                  .getElementById('profile-dropdown')
                  ?.classList.toggle('show')
              }
              aria-label="Open account menu"
              aria-haspopup="true"
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

              <span className="profile-arrow">&#8964;</span>
            </button>

            <div className="profile-dropdown" id="profile-dropdown">
              <a href="/profile">My Profile</a>
              <a href="/settings">Settings</a>
              <a href="/alummi">Career Journey</a>
              {user.isAdmin && <a href="/admin">Admin</a>}
              <button type="button" className="dropdown-signout" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <div className="nav-auth">
            <a className="nav-signin" href="/login">Sign in</a>
            <a className="primary-button nav-signup" href="/signup">Create account</a>
          </div>
        )}
      </nav>
    </header>
  )
}

export default Navbar
