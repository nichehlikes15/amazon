import { useParams, Link } from 'react-router-dom'
import './guide.css'
import { getGuide } from './guides-data'

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
