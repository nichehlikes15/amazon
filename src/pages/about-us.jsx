import { Link } from 'react-router-dom'
import './about-us.css'
import { Icon, PathwayIcon } from '../modules/icons'

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

// What you can do on the site - each links to a real page.
const offers = [
  { icon: 'layers', title: 'Explore pathways', text: 'See the five Amazon pathways and what each one could lead to.', to: '/information' },
  { icon: 'search', title: 'Find opportunities', text: 'Browse live apprenticeships, save the ones you like and apply.', to: '/opportunities' },
  { icon: 'check', title: 'Take the career quiz', text: 'Answer a few quick questions to find the pathway that fits you.', to: '/quiz' },
  { icon: 'clock', title: 'Book a coffee chat', text: 'Talk to a student, alum or Amazon buddy about their experience.', to: '/alumni/coffee-chats' },
]

const pathways = ['Digital', 'Business', 'Media', 'Finance', 'Engineering']

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
          <div className="au-hero-actions">
            <Link className="primary-button" to="/information">
              Explore pathways <Icon name="arrowRight" size={15} />
            </Link>
            <Link className="secondary-button" to="/alumni/coffee-chats">Book a coffee chat</Link>
          </div>
        </div>
      </header>

      {/* Mission - one centred statement */}
      <section className="au-mission">
        <p className="au-kicker">Our mission</p>
        <h2 className="au-statement">Making the path into tech and business simpler</h2>
        <p className="au-body">
          Choosing what to do after GCSEs is a big decision. We bring clear information,
          honest advice and real connections together in one place, so every student can
          make a confident choice about their future.
        </p>
        <ul className="au-pathways" aria-label="Pathways on Launchpad">
          {pathways.map((p) => (
            <li key={p}>
              <Link to={`/information#${p.toLowerCase()}`}>
                <PathwayIcon pathway={p} size={16} />
                {p}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Stats band */}
      <section className="au-stats-band" aria-label="T Levels in numbers">
        <div className="au-stats">
          {stats.map((stat) => (
            <div className="au-stat" key={stat.label}>
              <span className="au-stat-num">{stat.number}</span>
              <span className="au-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Values - three open columns */}
      <section className="au-section">
        <div className="au-head">
          <p className="au-kicker">What guides us</p>
          <h2 className="au-h2">Our values</h2>
        </div>
        <div className="au-values">
          {values.map((value, i) => (
            <div className="au-value" key={value.title}>
              <span className="au-value-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <h3>{value.title}</h3>
              <p>{value.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you can do */}
      <section className="au-section">
        <div className="au-head">
          <p className="au-kicker">On Launchpad</p>
          <h2 className="au-h2">Everything in one place</h2>
        </div>
        <div className="au-offers">
          {offers.map((o) => (
            <Link className="au-offer" to={o.to} key={o.title}>
              <span className="au-offer-icon"><Icon name={o.icon} size={22} /></span>
              <h3>{o.title}</h3>
              <p>{o.text}</p>
              <span className="au-offer-go">
                Go <Icon name="arrowRight" size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="au-cta">
        <h2>Explore what's on offer</h2>
        <p>See the five pathways and find the one that fits you.</p>
        <div className="au-hero-actions">
          <Link className="primary-button" to="/information">
            Explore pathways <Icon name="arrowRight" size={15} />
          </Link>
          <Link className="secondary-button" to="/quiz">Take the quiz</Link>
        </div>
      </section>
    </main>
  )
}

export default AboutUs
