import { Link } from 'react-router-dom'
import './about-us.css'

const values = [
  {
    title: 'Customer obsession',
    text: 'We start with students and work backwards, building everything around what they need to take their next step.',
  },
  {
    title: 'Open to everyone',
    text: 'Launchpad is for any student, whatever stage they are at, with accessibility built in from the start.',
  },
  {
    title: 'Learn and be curious',
    text: 'We help students explore pathways, try new things, and discover where their interests could take them.',
  },
]

const stats = [
  { number: '27,446', label: 'T Level learners in England in 2025-26' },
  { number: '21', label: 'T Level pathways available nationally' },
  { number: '5', label: 'subject areas offered through Amazon' },
]

function AboutUs() {
  return (
    <main className="au">
      {/* Hero */}
      <header className="au-hero">
        <div className="au-hero-inner">
          <h1>Helping students <span>launch</span> their careers</h1>
          <p className="au-lead">
            Launchpad is built with the Amazon Emerging Talent Programs team to help
            students discover T Levels, find placements, and connect with the people
            who can help them get started.
          </p>
        </div>
      </header>

      {/* Mission */}
      <section className="au-section">
        <h2 className="au-h2">Making the path into tech and business simpler</h2>
        <p className="au-body">
          Choosing what to do after GCSEs is a big decision. We bring clear information,
          honest advice and real connections together in one place, so every student can
          make a confident choice about their future.
        </p>
      </section>

      {/* Values - open rows, no boxes */}
      <section className="au-section">
        <h2 className="au-h2">Our values</h2>
        <div className="au-values">
          {values.map((value, i) => (
            <div className="au-value" key={value.title}>
              <span className="au-value-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>{value.title}</h3>
                <p>{value.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats - open figures on hairlines */}
      <section className="au-stats">
        {stats.map((stat) => (
          <div className="au-stat" key={stat.label}>
            <span className="au-stat-num">{stat.number}</span>
            <span className="au-stat-label">{stat.label}</span>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="au-cta">
        <h2>Explore what's on offer</h2>
        <p>See the five pathways and find the one that fits you.</p>
        <Link className="au-cta-btn" to="/information">Explore pathways</Link>
      </section>
    </main>
  )
}

export default AboutUs
