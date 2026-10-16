import './home.css'

function Home() {
  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <main>
        <section className="hero" aria-labelledby="hero-heading">
          <div className="hero-content">
            <div className="hero-copy">
              <p className="eyebrow">Your next step starts here</p>
              <h1 id="hero-heading"><span>Launchpad</span> your career</h1>
              <p className="hero-description">
                Explore career opportunities, discover T Levels, and find the
                resources you need to take your next step.
              </p>
              <div className="hero-actions">
                <button className="primary-button" type="button" onClick={() => scrollToSection('t-levels')}>Explore T Levels</button>
                <button className="secondary-button" type="button" onClick={() => scrollToSection('community')}>Join the community</button>
              </div>
            </div>
          </div>
        </section>

        <section className="content-section" id="about" aria-labelledby="about-heading">
          <div>
            <p className="eyebrow">Start with confidence</p>
            <h2 id="about-heading">Find the right path for you</h2>
          </div>
          <p className="section-intro">
            Whether you are starting out or planning your next move, Launchpad
            gives you practical information to help you make progress.
          </p>
          <div className="feature-grid">
            <article className="feature-card">
              <span className="feature-icon">01</span>
              <h3>Explore opportunities</h3>
              <p>See where your interests and skills could take you.</p>
            </article>
            <article className="feature-card" id="t-levels">
              <span className="feature-icon">02</span>
              <h3>Build your skills</h3>
              <p>Learn about T Levels and practical ways to grow.</p>
            </article>
            <article className="feature-card" id="community">
              <span className="feature-icon">03</span>
              <h3>Connect with others</h3>
              <p>Meet a community of people working towards their future.</p>
            </article>
          </div>
        </section>
      </main>
    </>
  )
}

export default Home
