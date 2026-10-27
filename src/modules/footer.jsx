import { Link } from 'react-router-dom'
import './footer.css'

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
      ['/settings', 'Settings'],
      ['/alumni', 'Career journey'],
    ],
  },
  {
    title: 'Community',
    links: [
      ['/about-us', 'About us'],
      ['/alumni/coffee-chats', 'Coffee chats'],
      ['/t-level/advice', 'Advice'],
    ],
  },
  {
    title: 'Support',
    links: [
      ['/help', 'Help'],
      ['/accessibility', 'Accessibility'],
      ['/privacy', 'Privacy'],
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
