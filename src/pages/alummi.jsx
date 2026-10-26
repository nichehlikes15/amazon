import { Link } from 'react-router-dom'
import './alummi.css'

const stories = [
  { name: 'Amara', pathway: 'Digital', quote: 'My placement showed me what software development is really like. I learned more in a month than I expected to all year.' },
  { name: 'Jay', pathway: 'Business', quote: 'I worked alongside a real team and left with the confidence to apply for an apprenticeship.' },
  { name: 'Priya', pathway: 'Finance', quote: 'Seeing how a big company handles its numbers made my classroom work finally click.' },
]

const steps = [
  { title: 'Explore', text: 'Discover the pathways and find where your interests fit.' },
  { title: 'Experience', text: 'Complete a placement and build real, practical skills.' },
  { title: 'Progress', text: 'Move on to skilled work, an apprenticeship, or further study.' },
]

function Alummi() {
  return (
    <main className="al">
      {/* Hero */}
      <header className="al-hero">
        <div className="al-hero-inner">
          <h1>Where Launchpad can <span>take you</span></h1>
          <p className="al-lead">
            Hear from students who have completed their placements, and see how your own
            journey could unfold.
          </p>
          <Link className="al-link" to="/alummi/coffee-chats">
            Book a coffee chat
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
          </Link>
        </div>
      </header>

      {/* Journey - open numbered steps */}
      <section className="al-section">
        <h2 className="al-h2">Three steps to launch</h2>
        <div className="al-steps">
          {steps.map((item, i) => (
            <div className="al-step" key={item.title}>
              <span className="al-step-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stories - open quotes separated by hairlines */}
      <section className="al-section al-stories">
        <h2 className="al-h2">Hear from real students</h2>
        <div className="al-story-list">
          {stories.map((story) => (
            <figure className="al-story" key={story.name}>
              <blockquote>&ldquo;{story.quote}&rdquo;</blockquote>
              <figcaption>
                <span className="al-story-name">{story.name}</span>
                <span className="al-story-path">{story.pathway} pathway</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="al-cta">
        <h2>Ready to talk to someone?</h2>
        <p>Book an informal coffee chat with a student, alum or Amazon buddy.</p>
        <Link className="al-cta-btn" to="/alummi/coffee-chats">Book a coffee chat</Link>
      </section>
    </main>
  )
}

export default Alummi
