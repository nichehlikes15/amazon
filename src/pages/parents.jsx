import { Link } from 'react-router-dom'
import './info-page.css'
import { Icon } from '../modules/icons'
import { AMAZON_LINKS } from '../modules/amazon-links'

/*
  For parents and carers ("people around students" in the brief).
  Every fact on this page comes from Amazon's own pages, linked under each
  section. Check them again before going live, as programmes change.
*/

const T_LEVEL_FACTS = [
  'A two-year technical course for 16 to 19 year olds in England, taken after GCSEs.',
  'Launched by the UK government in 2020 as a technical choice alongside A Levels and apprenticeships.',
  'Each T Level includes an industry placement, so students spend real time working with an employer.',
]

const AMAZON_FACTS = [
  'For T Level students aged 16 to 18.',
  'Students spend nine weeks with Amazon, placed in a team where they work on their own project, plus a small group project.',
  'They are supported by buddies, mentors and placement managers.',
  'They get access to the AWS Educate Skills Hub, where they can work towards the AWS Cloud Practitioner certificate.',
  'Placements are offered in London and Manchester.',
  'Applications open once a year. Students answer some written questions and send a CV, then take part in an assessment centre.',
]

const WAYS_TO_HELP = [
  {
    icon: 'check',
    title: 'Find out what they enjoy',
    text: 'Take the two-minute career quiz together and talk about the pathway it suggests.',
    to: '/quiz',
    link: 'Take the quiz',
  },
  {
    icon: 'file',
    title: 'Help with their CV',
    text: 'Once they have an account, they can upload a CV on their profile and get tips to improve it.',
    to: '/profile#cv',
    link: 'Go to CV check',
  },
  {
    icon: 'video',
    title: 'Practise for interviews',
    text: 'Practise answering out loud with the virtual interviewer, using the STAR method.',
    to: '/interview',
    link: 'Try interview practice',
  },
  {
    icon: 'users',
    title: 'Encourage them to ask questions',
    text: 'A short coffee chat with a student or Amazon buddy is a good way to find out what a placement is really like.',
    to: '/alumni/coffee-chats',
    link: 'See coffee chats',
  },
]

function Source({ href, label }) {
  return (
    <p className="ip-source">
      Source: <a href={href} target="_blank" rel="noopener noreferrer">{label} <Icon name="external" size={12} /></a>
    </p>
  )
}

function Parents() {
  return (
    <main className="ip">
      <header className="ip-hero">
        <div className="ip-hero-inner">
          <p className="ip-kicker">For parents and carers</p>
          <h1>Helping your child take their <span>next step</span></h1>
          <p className="ip-lead">
            A plain guide to T Levels, Amazon T Level placements, and how you can help your child
            decide what's right for them.
          </p>
          <div className="ip-actions">
            <Link className="primary-button" to="/information">
              Explore the pathways together <Icon name="arrowRight" size={15} />
            </Link>
            <Link className="secondary-button" to="/register-interest?role=parent">Register your interest</Link>
            <Link className="secondary-button" to="/safeguarding">
              <Icon name="shield" size={15} /> How we keep students safe
            </Link>
          </div>
          <ul className="ip-jump">
            <li><a href="#t-levels">What is a T Level?</a></li>
            <li><a href="#amazon">Placements at Amazon</a></li>
            <li><a href="#help">How you can help</a></li>
            <li><a href="#step-up">Younger children</a></li>
          </ul>
        </div>
      </header>

      <div className="ip-body">
        <section className="ip-section" id="t-levels">
          <h2>What is a T Level?</h2>
          <ul className="ip-facts">
            {T_LEVEL_FACTS.map((f) => (
              <li key={f}><Icon name="check" size={16} /> {f}</li>
            ))}
          </ul>
          <Source href={AMAZON_LINKS.stepUp.url} label="aboutamazon.co.uk" />
        </section>

        <section className="ip-section" id="amazon">
          <h2>T Level placements at Amazon</h2>
          <ul className="ip-facts">
            {AMAZON_FACTS.map((f) => (
              <li key={f}><Icon name="check" size={16} /> {f}</li>
            ))}
          </ul>
          <p>
            Read more on Amazon's own page, or see <Link to="/tlevel">how T Levels work on Launchpad</Link>.
          </p>
          <div className="ip-actions ip-actions-left">
            <a className="secondary-button" href={AMAZON_LINKS.tLevels.url} target="_blank" rel="noopener noreferrer">
              Amazon T Level placements <Icon name="external" size={14} />
            </a>
          </div>
          <p className="ip-source">
            Sources:{' '}
            <a href={AMAZON_LINKS.tLevels.url} target="_blank" rel="noopener noreferrer">Amazon T Level placements <Icon name="external" size={12} /></a>
            {' and '}
            <a href={AMAZON_LINKS.stepUp.url} target="_blank" rel="noopener noreferrer">Amazon work experience: Step Up <Icon name="external" size={12} /></a>
          </p>
        </section>

        <section className="ip-section" id="help">
          <h2>How you can help</h2>
          <p>You don't need to know about the industry to help. These are good places to start:</p>
          <ul className="ip-help">
            {WAYS_TO_HELP.map((w) => (
              <li key={w.title}>
                <span className="ip-feature-icon"><Icon name={w.icon} size={18} /></span>
                <div>
                  <strong>{w.title}</strong>
                  <span>{w.text}</span>
                  <Link className="ip-inline-link" to={w.to}>
                    {w.link} <Icon name="arrowRight" size={13} />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="ip-section">
          <h2>Keeping your child safe</h2>
          <p>
            Most people using Launchpad are aged 16 to 18. Our <Link to="/safeguarding">staying safe page</Link> explains
            how coffee chats work, what students should never share online, and who to contact if something
            worries you or your child.
          </p>
        </section>

        <section className="ip-section" id="step-up">
          <h2>Younger children: Step Up work experience</h2>
          <p>
            Amazon also runs Step Up, a separate week of work experience. Step Up For Schools is for Year 10
            students (aged 14 to 15), mainly from underserved communities, and applications go through
            their school. Step Up + Partner is for 16 to 24 year olds who are not in education, employment or
            training, through Amazon's charity partners.
          </p>
          <div className="ip-actions ip-actions-left">
            <a className="secondary-button" href={AMAZON_LINKS.stepUp.url} target="_blank" rel="noopener noreferrer">
              Read about Step Up <Icon name="external" size={14} />
            </a>
          </div>
          <Source href={AMAZON_LINKS.stepUp.url} label="aboutamazon.co.uk" />
        </section>
      </div>
    </main>
  )
}

export default Parents
