import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import './guide.css'
import { getGuide } from './guides-data'
import { Icon } from '../modules/icons'
import { setPageTitle } from '../modules/page-title'

// Downloadable PDF version of each guide (files live in public/guides/).
const PDFS = {
  'assessment-centre': '/guides/how-to-pass-an-assessment-centre.pdf',
  'interview-prep': '/guides/interview-preparation-tips.pdf',
  'great-application': '/guides/writing-a-great-application.pdf',
}

function Guide() {
  const { slug } = useParams()
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

  const pdf = PDFS[slug]

  return (
    <main className="guide-page">
      <header className="guide-hero">
        <div className="guide-hero-inner">
          <Link className="guide-back" to="/opportunities">
            <Icon name="arrowLeft" size={15} />
            Back to opportunities
          </Link>
          <p className="guide-kicker">Guide</p>
          <h1>{guide.title}</h1>
          <p className="guide-intro">{guide.intro}</p>
          {pdf && (
            <div className="guide-actions">
              <a className="primary-button guide-download" href={pdf} download>
                <Icon name="download" size={16} />
                Download the full guide (PDF)
              </a>
            </div>
          )}
        </div>
      </header>

      {/* Narrow reading column */}
      <div className="guide-wrap">
        {guide.sections.map((section, i) => (
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
          {pdf && (
            <a className="secondary-button guide-download" href={pdf} download>
              <Icon name="download" size={15} />
              Download PDF
            </a>
          )}
        </div>
      </section>
    </main>
  )
}

export default Guide
