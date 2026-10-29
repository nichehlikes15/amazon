import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import './navbar.css'
import { useAuth } from './auth'
import { useAccessibility, resolvedTheme } from './accessibility'
import { Icon } from './icons'
import { readAloudSupported, startReadAloud } from './read-aloud'

const Caret = ({ className }) => (
  <span className={className} aria-hidden="true">
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6l4 4 4-4" />
    </svg>
  </span>
)

const TLEVEL_LINKS = [
  ['/tlevel', 'Overview'],
  ['/information', 'Pathways'],
  ['/t-level/advice', 'Advice'],
  ['/quiz', 'Career quiz'],
  ['/interview', 'Interview practice'],
  ['/parents', 'Parents and carers'],
]

const TEXT_SIZES = [
  ['small', 'A', 'Small text'],
  ['medium', 'A', 'Medium text'],
  ['large', 'A', 'Large text'],
]

function Switch({ checked, onChange, label, hint, icon }) {
  return (
    <label className="a11y-row">
      <span className="a11y-row-icon"><Icon name={icon} size={16} /></span>
      <span className="a11y-row-text">
        <strong>{label}</strong>
        <span>{hint}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="a11y-switch" aria-hidden="true"><span /></span>
    </label>
  )
}

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [a11y, setA11y] = useAccessibility()
  const theme = resolvedTheme(a11y)

  // Only one dropdown open at a time: 'tlevel' | 'account' | 'a11y' | 'mobile' | null
  const [open, setOpen] = useState(null)
  const barRef = useRef(null)
  const toggle = (name) => setOpen((cur) => (cur === name ? null : name))

  // Close menus on outside click, Escape, and page change.
  useEffect(() => {
    const onClick = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) setOpen(null)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(null) }
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => { setOpen(null) }, [pathname])

  // No page scrolling behind the open mobile menu.
  useEffect(() => {
    document.body.classList.toggle('nav-locked', open === 'mobile')
    return () => document.body.classList.remove('nav-locked')
  }, [open])

  const handleLogout = async () => {
    setOpen(null)
    await logout()
    navigate('/')
  }

  const firstName = user ? user.fullName.split(' ')[0] : null
  const tlevelActive = TLEVEL_LINKS.some(([to]) => pathname === to)

  return (
    <header className="site-header" ref={barRef}>
      <nav className="nav-bar" aria-label="Main navigation">
        <Link className="brand" to="/" aria-label="Launchpad home">
          <img src="/assets/images/launchpad.svg" alt="Launchpad" />
        </Link>

        {/* Desktop links */}
        <div className="nav-links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/opportunities">Opportunities</NavLink>

          <div className="nav-dropdown">
            <button
              type="button"
              className={tlevelActive ? 'nav-dropdown-toggle active' : 'nav-dropdown-toggle'}
              onClick={() => toggle('tlevel')}
              aria-expanded={open === 'tlevel'}
              aria-haspopup="true"
            >
              T Levels
              <Caret className="nav-caret" />
            </button>
            <div className={open === 'tlevel' ? 'nav-menu show' : 'nav-menu'}>
              {TLEVEL_LINKS.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}
            </div>
          </div>

          <NavLink to="/about-us">About us</NavLink>
        </div>

        <div className="nav-right">
          {/* Light / dark mode */}
          <button
            type="button"
            className="nav-icon-btn theme-btn"
            onClick={() => setA11y({ theme: theme === 'dark' ? 'light' : 'dark' })}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            <span className={theme === 'dark' ? 'theme-icons is-dark' : 'theme-icons'}>
              <Icon name="sun" size={18} />
              <Icon name="moon" size={18} />
            </span>
          </button>

          {/* Accessibility quick settings */}
          <div className="nav-a11y">
            <button
              type="button"
              className={open === 'a11y' ? 'nav-icon-btn is-open' : 'nav-icon-btn'}
              onClick={() => toggle('a11y')}
              aria-expanded={open === 'a11y'}
              aria-haspopup="dialog"
              aria-label="Accessibility settings"
              title="Accessibility"
            >
              <Icon name="access" size={19} />
            </button>
            <div className={open === 'a11y' ? 'a11y-panel show' : 'a11y-panel'} role="dialog" aria-label="Accessibility settings">
              <p className="a11y-title">Accessibility</p>

              {readAloudSupported && (
                <button
                  type="button"
                  className="a11y-read"
                  onClick={() => { setOpen(null); startReadAloud() }}
                >
                  <span className="a11y-row-icon"><Icon name="volume" size={16} /></span>
                  <span className="a11y-row-text">
                    <strong>Read this page aloud</strong>
                    <span>Pause or stop it at any time</span>
                  </span>
                  <Icon name="play" size={14} />
                </button>
              )}

              <div className="a11y-group">
                <span className="a11y-label"><Icon name="text" size={16} /> Text size</span>
                <div className="a11y-sizes" role="radiogroup" aria-label="Text size">
                  {TEXT_SIZES.map(([value, letter, label]) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={a11y.textSize === value}
                      aria-label={label}
                      className={`a11y-size a11y-size-${value}${a11y.textSize === value ? ' is-on' : ''}`}
                      onClick={() => setA11y({ textSize: value })}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </div>

              <Switch
                icon="contrast"
                label="High contrast"
                hint="Darker text, clearer edges and links"
                checked={a11y.highContrast}
                onChange={(v) => setA11y({ highContrast: v })}
              />
              <Switch
                icon="monitor"
                label="Full-size page"
                hint="Show the site at 100% instead of 75%"
                checked={a11y.zoom === 'full'}
                onChange={(v) => setA11y({ zoom: v ? 'full' : 'compact' })}
              />
              <Switch
                icon="eye"
                label="Colour-blind friendly"
                hint="Stronger, easier to tell apart colours"
                checked={a11y.colourBlind}
                onChange={(v) => setA11y({ colourBlind: v })}
              />
              <Switch
                icon="motion"
                label="Reduce motion"
                hint="Turn off animations"
                checked={a11y.reducedMotion}
                onChange={(v) => setA11y({ reducedMotion: v })}
              />

              <Link className="a11y-more" to="/accessibility">
                More about accessibility <Icon name="arrowRight" size={14} />
              </Link>
            </div>
          </div>

          {user ? (
            <div className="nav-profile">
              <button
                className="nav-profile-button"
                type="button"
                onClick={() => toggle('account')}
                aria-label={`Account menu for ${firstName}`}
                title="Your account"
                aria-haspopup="true"
                aria-expanded={open === 'account'}
              >
                <img className="profile-picture" src="/assets/images/defaultprofile.svg" alt="" />
                <span className="profile-first-name">{firstName}</span>
              </button>

              <div className={open === 'account' ? 'profile-dropdown show' : 'profile-dropdown'}>
                <p className="profile-dropdown-name">
                  <strong>{user.fullName}</strong>
                  <span>{user.email}</span>
                </p>
                <Link to="/profile">My Profile</Link>
                <Link to="/logbook">My logbook</Link>
                <Link to="/settings">Settings</Link>
                <Link to="/alumni">Career Journey</Link>
                {user.isAdmin && <Link to="/admin">Admin</Link>}
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

          {/* Phone / small tablet menu */}
          <button
            type="button"
            className={open === 'mobile' ? 'nav-icon-btn nav-burger is-open' : 'nav-icon-btn nav-burger'}
            onClick={() => toggle('mobile')}
            aria-expanded={open === 'mobile'}
            aria-controls="mobile-menu"
            aria-label={open === 'mobile' ? 'Close menu' : 'Open menu'}
          >
            <Icon name={open === 'mobile' ? 'close' : 'menu'} size={20} />
          </button>
        </div>
      </nav>

      <div id="mobile-menu" className={open === 'mobile' ? 'mobile-menu show' : 'mobile-menu'} aria-hidden={open !== 'mobile'}>
        <div className="mobile-menu-inner">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/opportunities">Opportunities</NavLink>
          <p className="mobile-menu-label">T Levels</p>
          {TLEVEL_LINKS.map(([to, label]) => <NavLink key={to} to={to} className="mobile-sub">{label}</NavLink>)}
          <NavLink to="/about-us">About us</NavLink>
          <NavLink to="/alumni/coffee-chats">Coffee chats</NavLink>
          {!user && (
            <div className="mobile-menu-auth">
              <Link className="secondary-button" to="/login">Sign in</Link>
              <Link className="primary-button" to="/signup">Create account</Link>
            </div>
          )}
        </div>
      </div>
      <div className={open === 'mobile' ? 'mobile-scrim show' : 'mobile-scrim'} onClick={() => setOpen(null)} aria-hidden="true" />
    </header>
  )
}

export default Navbar
