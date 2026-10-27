import { useParams, Link } from 'react-router-dom'
import './guide.css'
import { getGuide } from './guides-data'

// Downloadable PDF version of each guide (files live in public/guides/).
const PDFS = {
  'assessment-centre': '/guides/how-to-pass-an-assessment-centre.pdf',
  'interview-prep': '/guides/interview-preparation-tips.pdf',
  'great-application': '/guides/writing-a-great-application.pdf',
}

function Guide() {
  const { slug } = useParams()
  const guide = getGuide(slug)

  if (!guide) {
    return (
      <main className="guide-page">
        <div className="guide-wrap">
          <p className="guide-status">Guide not found.</p>
          <Link className="guide-back" to="/opportunities">← Back to opportunities</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="guide-page">
      <header className="guide-hero">
        <div className="guide-hero-inner">
          <Link className="guide-back" to="/opportunities">← Back to opportunities</Link>
          <h1>{guide.title}</h1>
          <p className="guide-intro">{guide.intro}</p>
          {PDFS[slug] && (
            <a className="primary-button guide-download" href={PDFS[slug]} download>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M6 11l6 6 6-6M5 21h14" /></svg>
              Download the full guide (PDF)
            </a>
          )}
        </div>
      </header>

      <div className="guide-wrap">
        {guide.sections.map((section) => (
          <section className="guide-section" key={section.heading}>
            <h2>{section.heading}</h2>
            <ul>
              {section.body.map((point, i) => <li key={i}>{point}</li>)}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}

export default Guide
