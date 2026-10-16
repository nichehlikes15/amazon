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
              <span className="profile-greeting">Hello, Bob</span>
              <span className="profile-name">Account &amp; Lists</span>
            </span>

            <span className="profile-arrow">⌄</span>
          </button>

          <div className="profile-dropdown" id="profile-dropdown">
            <a href="/profile">My Profile</a>
            <a href="/settings">Settings</a>
            <a href="/alummi">Career Journey</a>
          </div>
        </div>

      </nav>
    </header>
  )
}

export default Navbar
