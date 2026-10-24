import './footer.css'

function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="site-footer">
      <button type="button" className="footer-top" onClick={scrollToTop}>
        Back to top
      </button>

      <div className="footer-main">
        <div className="footer-columns">
          <div className="footer-column">
            <h3>Explore</h3>
            <a href="/">Home</a>
            <a href="/tlevel">T Levels at Amazon</a>
            <a href="/what-is-a-t-level">What is a T Level?</a>
            <a href="/information">Information</a>
            <a href="/quiz">Career quiz</a>
          </div>
          <div className="footer-column">
            <h3>Your account</h3>
            <a href="/profile">My profile</a>
            <a href="/settings">Settings</a>
            <a href="/alummi">Career journey</a>
          </div>
          <div className="footer-column">
            <h3>Community</h3>
            <a href="/about-us">About us</a>
            <a href="/alummi/coffee-chats">Coffee chats</a>
            <a href="/t-level/advice">Advice</a>
          </div>
          <div className="footer-column">
            <h3>Support</h3>
            <a href="/information">Help</a>
            <a href="/settings">Accessibility</a>
            <a href="/settings">Privacy</a>
          </div>
        </div>
      </div>

      <div className="footer-base">
        <img
          className="footer-logo"
          src="/assets/images/launchpad.svg"
          alt="Launchpad"
        />
        <p>In partnership with Amazon Emerging Talent Programs. For education purposes.</p>
      </div>
    </footer>
  )
}

export default Footer
