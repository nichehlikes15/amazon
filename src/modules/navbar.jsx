import './navbar.css'

function Navbar() {
  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
  }

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

        <div className="nav-profile">
          <img
            className="profile-picture"
            src="/assets/images/defaultprofile.svg"
            alt="Profile picture"
          />
          <span className="profile-name">Bob Bobby</span>
        </div>

      </nav>
    </header>
  )
}

export default Navbar
