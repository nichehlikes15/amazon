import { Link } from 'react-router-dom'
import './info-page.css'
import { Icon } from '../modules/icons'

const LINKS = [
  { to: '/opportunities', icon: 'search', title: 'Opportunities', text: 'Browse apprenticeships' },
  { to: '/information', icon: 'layers', title: 'Pathways', text: 'Explore the five pathways' },
  { to: '/quiz', icon: 'check', title: 'Career quiz', text: 'Find your best fit' },
  { to: '/help', icon: 'book', title: 'Help', text: 'Answers to common questions' },
]

function NotFound() {
  return (
    <main className="ip">
      <header className="ip-hero">
        <div className="ip-hero-inner">
          <span className="nf-code" aria-hidden="true">404</span>
          <h1>We couldn't find <span>that page</span></h1>
          <p className="ip-lead">
            The link may be old, or the address may have a typo. Try one of these instead.
          </p>
          <div className="ip-actions">
            <Link className="primary-button" to="/">
              Back to home <Icon name="arrowRight" size={15} />
            </Link>
            <Link className="secondary-button" to="/opportunities">See opportunities</Link>
          </div>
        </div>
      </header>

      <nav className="nf-links" aria-label="Popular pages">
        {LINKS.map((l) => (
          <Link className="nf-link" to={l.to} key={l.to}>
            <span className="nf-link-icon"><Icon name={l.icon} size={22} /></span>
            <strong>{l.title}</strong>
            <span>{l.text}</span>
          </Link>
        ))}
      </nav>
    </main>
  )
}

export default NotFound
