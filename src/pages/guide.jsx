import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import './guide.css'
import { getGuide } from './guides-data'
import { Icon } from '../modules/icons'
import { setPageTitle } from '../modules/page-title'
import { useAuth } from '../modules/auth'
import { api } from '../modules/api'
import { SignInLink } from '../modules/return-to'

// PDF version of each guide. The files are kept on the server and only
// signed-in users can download them (members-only content from the brief).
const PDFS = {
  'assessment-centre': 'how-to-pass-an-assessment-centre.pdf',
  'interview-prep': 'interview-preparation-tips.pdf',
  'great-application': 'writing-a-great-application.pdf',
}

// How many sections anyone can read before signing in.
const FREE_SECTIONS = 1

function Guide() {
  const { slug } = useParams()
  const { user, loading } = useAuth()
  const guide = getGuide(slug)

  // Show the guide's name in the browser tab.
  useEffect(() => {
    if (guide) setPageTitle(guide.title)
  }, [guide])

  if (!guide) {
    return (
      <main className="guide-page">
        <header className="guide-hero">
          <div className="guide-hero-inner">
            <p className="guide-kicker">Guide</p>
            <h1>Guide not found</h1>
            <p className="guide-intro">We could not find this guide.</p>
            <div className="guide-actions">
              <Link className="secondary-button guide-back-btn" to="/opportunities">
                <Icon name="arrowLeft" size={15} />
                Back to opportunities
              </Link>
            </div>
          </div>
        </header>
      </main>
    )
  }

  const signedIn = Boolean(user)
  const pdf = PDFS[slug] ? api.guidePdfUrl(PDFS[slug]) : null
  const sections = signedIn ? guide.sections : guide.sections.slice(0, FREE_SECTIONS)
  const locked = !signedIn && guide.sections.length > FREE_SECTIONS

  const download = (className) => (
    signedIn ? (
      <a className={className} href={pdf} download>
        <Icon name="download" size={16} />
        Download the full guide (PDF)
      </a>
    ) : (
      <SignInLink className={className}>
        <Icon name="lock" size={16} />
        Sign in to download the PDF
      </SignInLink>
    )
  )

  return (
    <main className="guide-page">
      <header className="guide-hero">
        <div className="guide-hero-inner">
          <Link className="guide-back" to="/opportunities">
            <Icon name="arrowLeft" size={15} />
            Back to opportunities
          </Link>
          <p className="guide-kicker">Guide{!signedIn && !loading ? ' · Members get the full guide' : ''}</p>
          <h1>{guide.title}</h1>
          <p className="guide-intro">{guide.intro}</p>
          {pdf && <div className="guide-actions">{download('primary-button guide-download')}</div>}
        </div>
      </header>

      {/* Narrow reading column */}
      <div className="guide-wrap">
        {sections.map((section, i) => (
          <section className="guide-section" key={section.heading}>
            <div className="guide-section-head">
              <span className="guide-section-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <h2>{section.heading}</h2>
            </div>
            <ul>
              {section.body.map((point, j) => <li key={j}>{point}</li>)}
            </ul>
          </section>
        ))}

        {locked && (
          <section className="guide-locked" aria-labelledby="guide-locked-title">
            {/* A faded peek at what comes next */}
            <div className="guide-locked-peek" aria-hidden="true">
              {guide.sections.slice(FREE_SECTIONS, FREE_SECTIONS + 2).map((s) => (
                <p key={s.heading}><strong>{s.heading}</strong> {s.body[0]}</p>
              ))}
            </div>
            <div className="guide-locked-card">
              <span className="guide-locked-icon"><Icon name="lock" size={20} /></span>
              <h2 id="guide-locked-title">Read the full guide for free</h2>
              <p>
                Create a free account or sign in to read the other {guide.sections.length - FREE_SECTIONS}{' '}
                {guide.sections.length - FREE_SECTIONS === 1 ? 'section' : 'sections'} and download the PDF.
              </p>
              <div className="guide-actions">
                <SignInLink className="primary-button" to="/signup">
                  Create a free account <Icon name="arrowRight" size={15} />
                </SignInLink>
                <SignInLink className="secondary-button">Sign in</SignInLink>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Closing links */}
      <section className="guide-end">
        <p className="guide-kicker">Next step</p>
        <h2>Put it into practice</h2>
        <p>Find an opportunity to apply for and use what you have read.</p>
        <div className="guide-actions">
          <Link className="primary-button" to="/opportunities">
            See opportunities <Icon name="arrowRight" size={15} />
          </Link>
          {pdf && download('secondary-button guide-download')}
        </div>
      </section>
    </main>
  )
}

export default Guide
