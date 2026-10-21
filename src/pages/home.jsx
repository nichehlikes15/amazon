import './home.css'

const pathways = [
  {
    name: 'Digital',
    blurb: 'Practise real digital skills — software development, data and support — and see where a Digital T Level could take you.',
  },
  {
    name: 'Business',
    blurb: 'Explore management, operations and planning, and learn how a Business placement works day to day.',
  },
  {
    name: 'Media',
    blurb: 'Build skills in content, design and communication, and discover creative roles across the industry.',
  },
  {
    name: 'Finance',
    blurb: 'Get hands-on with budgets, analysis and reporting, and understand what a Finance pathway involves.',
  },
  {
    name: 'Engineering',
    blurb: 'Design, build and test real products. More engineering sub-pathways coming soon.',
  },
]

const benefits = [
  {
    title: 'No account needed to explore',
    text: 'Browse T Levels, placements and advice freely. Sign up only when you want to save items or register your interest.',
  },
  {
    title: 'Learn at your own pace',
    text: 'Clear information and downloadable resources you can read, save and use offline, whenever suits you.',
  },
  {
    title: 'Hear from real students',
    text: 'Connect with current T Level students and Amazonians to find out what placements are really like.',
  },
  {
    title: 'Built for everyone',
    text: 'Adjustable text size, colour-blind friendly mode and full keyboard support so everyone can take part.',
  },
]

const faqs = [
  {
    q: 'What is a T Level?',
    a: 'A T Level is a two-year qualification you can take after GCSEs, equal to three A Levels, that combines classroom study with an industry placement.',
  },
  {
    q: 'Who can apply for an Amazon placement?',
    a: 'Students studying a T Level in a relevant subject can apply. Use the career quiz to see which pathway fits you best.',
  },
  {
    q: 'How much does it cost?',
    a: 'Nothing. Exploring the site, reading resources and registering your interest are all completely free.',
  },
]

function Home() {
  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <main>
        {/* Hero promise */}
        <section className="hero" aria-labelledby="hero-heading">
          <div className="hero-content">
            <div className="hero-copy">
              <p className="eyebrow">Amazon Emerging Talent</p>
              <h1 id="hero-heading">Discover <span>T Levels</span> at your own pace, for free</h1>
              <p className="hero-description">
                Launchpad is open to any student, whatever stage you are at. Explore
                T Levels, Amazon placements and the resources you need to take your
                next step — all in one place.
              </p>
              <div className="hero-actions">
                <button className="primary-button" type="button" onClick={() => scrollToSection('pathways')}>Explore pathways</button>
                <a className="secondary-button" href="/quiz">Take the career quiz</a>
              </div>
            </div>
          </div>
        </section>

        {/* Problem framing */}
        <section className="framing">
          <div className="framing-inner">
            <h2>Not sure which path is right for you?</h2>
            <p>
              Choosing what to do after your GCSEs can feel overwhelming. Launchpad
              gives you one simple, guided place to explore your options and find the
              pathway that fits your interests and strengths.
            </p>
            <a className="primary-button" href="/quiz">Find your pathway</a>
          </div>
        </section>

        {/* Pathway module grid */}
        <section className="content-section" id="pathways" aria-labelledby="pathways-heading">
          <p className="eyebrow">Explore subjects</p>
          <h2 id="pathways-heading">Learn and practise, pathway by pathway</h2>
          <p className="section-intro">
            Each pathway shows you what the work involves, what you would study, and
            how an Amazon placement could help you get started.
          </p>
          <div className="pathway-grid">
            {pathways.map((pathway) => (
              <article className="pathway-card" key={pathway.name}>
                <h3>Getting started with {pathway.name}</h3>
                <p>{pathway.blurb}</p>
                <a href="/information" className="pathway-link">Learn more →</a>
              </article>
            ))}
          </div>
        </section>

        {/* Benefits row */}
        <section className="benefits">
          <div className="benefits-inner">
            <p className="eyebrow">Why Launchpad</p>
            <h2>Launchpad benefits</h2>
            <div className="benefit-grid">
              {benefits.map((benefit) => (
                <div className="benefit" key={benefit.title}>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Gradient marketing band */}
        <section className="gradient-band">
          <div className="gradient-band-inner">
            <h2>Your future starts with a single step</h2>
            <p>
              Join thousands of students exploring T Levels and Amazon placements.
              Take the quiz, find your pathway, and register your interest today.
            </p>
            <a className="gradient-band-button" href="/quiz">Start the career quiz</a>
          </div>
        </section>

        {/* Dual audience split */}
        <section className="content-section audience" aria-labelledby="audience-heading">
          <h2 id="audience-heading" className="sr-only">Who Launchpad is for</h2>
          <div className="audience-grid">
            <article className="audience-card">
              <p className="eyebrow">For students</p>
              <h3>Start your career journey</h3>
              <p>
                Explore pathways, save opportunities, read advice from real students
                and register your interest in an Amazon placement.
              </p>
              <a className="primary-button" href="/profile">Go to my profile</a>
            </article>
            <article className="audience-card audience-card-dark">
              <p className="eyebrow">For schools</p>
              <h3>Bring T Levels to your students</h3>
              <p>
                Find out how to set up and manage placements, download resources for
                assemblies and parents, and collaborate with Amazon on T Levels.
              </p>
              <a className="secondary-button secondary-on-dark" href="/t-level/advice">School advice</a>
            </article>
          </div>
        </section>

        {/* FAQ */}
        <section className="content-section faq" aria-labelledby="faq-heading">
          <p className="eyebrow">Questions?</p>
          <h2 id="faq-heading">Frequently asked questions</h2>
          <div className="faq-list">
            {faqs.map((faq) => (
              <details className="faq-item" key={faq.q}>
                <summary>{faq.q}</summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}

export default Home
