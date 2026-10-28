import { useState } from 'react'
import { Link } from 'react-router-dom'
import './alummi.css'
import { Icon, PathwayIcon } from '../modules/icons'
import { MENTORS } from '../modules/mentors'

const stories = [
  { name: 'Amara', pathway: 'Digital', quote: 'My placement showed me what software development is really like. I learned more in a month than I expected to all year.' },
  { name: 'Jay', pathway: 'Business', quote: 'I worked alongside a real team and left with the confidence to apply for an apprenticeship.' },
  { name: 'Priya', pathway: 'Finance', quote: 'Seeing how a big company handles its numbers made my classroom work finally click.' },
]

const steps = [
  { title: 'Explore', text: 'Discover the pathways and find where your interests fit.', to: '/information', link: 'See the pathways' },
  { title: 'Experience', text: 'Complete a placement and build real, practical skills.', to: '/tlevel#students', link: 'How placements work' },
  { title: 'Progress', text: 'Move on to skilled work, an apprenticeship, or further study.', to: '/opportunities', link: 'Browse apprenticeships' },
]

function Alummi() {
  const [current, setCurrent] = useState(0)
  const story = stories[current]

  const scrollToStories = () => {
    document.getElementById('stories')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
          <div className="al-hero-actions">
            <Link className="primary-button" to="/alumni/coffee-chats">
              Book a coffee chat <Icon name="arrowRight" size={15} />
            </Link>
            <button type="button" className="secondary-button" onClick={scrollToStories}>
              Read their stories
            </button>
          </div>
        </div>
      </header>

      {/* Journey - connected timeline */}
      <section className="al-section">
        <div className="al-head">
          <p className="al-kicker">Your journey</p>
          <h2 className="al-h2">Three steps to launch</h2>
        </div>
        <ol className="al-timeline">
          {steps.map((item, i) => (
            <li className="al-step" key={item.title}>
              <span className="al-step-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <Link className="al-step-link" to={item.to}>
                {item.link} <Icon name="arrowRight" size={14} />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* Stories - one featured quote, pick a person to switch */}
      <section className="al-stories" id="stories" aria-labelledby="stories-heading">
        <div className="al-stories-inner">
          <div className="al-head">
            <p className="al-kicker">In their words</p>
            <h2 className="al-h2" id="stories-heading">Hear from real students</h2>
          </div>

          <figure className="al-feature" key={story.name} aria-live="polite">
            <span className="al-quote-mark" aria-hidden="true">&ldquo;</span>
            <blockquote>{story.quote}</blockquote>
            <figcaption>
              <span className="al-story-name">{story.name}</span>
              <span className="al-story-path">
                <PathwayIcon pathway={story.pathway} size={14} />
                {story.pathway} pathway
              </span>
            </figcaption>
          </figure>

          <div className="al-pickers" role="tablist" aria-label="Choose a story">
            {stories.map((s, i) => (
              <button
                key={s.name}
                type="button"
                role="tab"
                aria-selected={i === current}
                className={i === current ? 'al-picker is-active' : 'al-picker'}
                onClick={() => setCurrent(i)}
              >
                <span className="al-picker-avatar" aria-hidden="true">{s.name.charAt(0)}</span>
                <span className="al-picker-text">
                  <strong>{s.name}</strong>
                  <span>{s.pathway}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* People you can talk to */}
      <section className="al-section">
        <div className="al-head">
          <p className="al-kicker">Coffee chats</p>
          <h2 className="al-h2">People you can talk to</h2>
          <p className="al-sub">
            Request a relaxed 15-minute chat with someone who has been where you are.
          </p>
        </div>
        <ul className="al-people">
          {MENTORS.map((m) => (
            <li key={m.name}>
              <Link className="al-person" to="/alumni/coffee-chats">
                <span className="al-person-avatar" aria-hidden="true">{m.name.charAt(0)}</span>
                <strong>{m.name}</strong>
                <span className="al-person-role">{m.role}</span>
                <span className="al-person-time">
                  <Icon name="calendar" size={13} /> {m.times.join(', ')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="al-cta">
        <h2>Ready to talk to someone?</h2>
        <p>Book an informal coffee chat with a student, alum or Amazon buddy.</p>
        <div className="al-hero-actions">
          <Link className="primary-button" to="/alumni/coffee-chats">
            Book a coffee chat <Icon name="arrowRight" size={15} />
          </Link>
        </div>
      </section>
    </main>
  )
}

export default Alummi
