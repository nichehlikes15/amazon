import { Link } from 'react-router-dom'
import './footer.css'
import { Icon } from './icons'
import { AMAZON_LINKS } from './amazon-links'

// <Link> instead of <a> so footer links use the smooth page transition
// rather than reloading the whole site.
const COLUMNS = [
  {
    title: 'Explore',
    links: [
      ['/', 'Home'],
      ['/opportunities', 'Opportunities'],
      ['/tlevel', 'T Levels'],
      ['/information', 'Pathways'],
      ['/quiz', 'Career quiz'],
      ['/interview', 'Interview practice'],
    ],
  },
  {
    title: 'Your account',
    links: [
      ['/profile', 'My profile'],
      ['/logbook', 'My logbook'],
      ['/settings', 'Settings'],
      ['/alumni', 'Career journey'],
    ],
  },
  {
    title: 'Community',
    links: [
      ['/about-us', 'About us'],
      ['/parents', 'Parents and carers'],
      ['/alumni/coffee-chats', 'Coffee chats'],
      ['/community', 'Question board'],
      ['/t-level/advice', 'Advice'],
    ],
  },
  {
    title: 'Support',
    links: [
      ['/help', 'Help'],
      ['/safeguarding', 'Staying safe'],
      ['/accessibility', 'Accessibility'],
      ['/privacy', 'Privacy'],
      ['/terms', 'Terms of use'],
    ],
  },
]

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-columns">
          {COLUMNS.map((col) => (
            <div className="footer-column" key={col.title}>
              <h3>{col.title}</h3>
              {col.links.map(([to, label]) => (
                <Link key={to} to={to}>{label}</Link>
              ))}
            </div>
          ))}
          {/* Official Amazon pages from the project brief */}
          <div className="footer-column">
            <h3>From Amazon</h3>
            {[AMAZON_LINKS.tLevels, AMAZON_LINKS.stepUp, AMAZON_LINKS.apprenticeships].map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="footer-ext">
                {l.label} <Icon name="external" size={12} />
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            ))}
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
