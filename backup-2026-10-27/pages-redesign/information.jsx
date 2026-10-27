import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './information.css'

const pathways = [
  {
    id: 'digital',
    name: 'Digital',
    summary: 'Build software, work with data, and keep systems running and secure.',
    study: ['Software development', 'Data analysis', 'Digital support and security'],
    skills: ['Programming', 'Problem solving', 'Working with databases'],
    roles: ['Software developer', 'Data analyst', 'IT support technician'],
  },
  {
    id: 'business',
    name: 'Business',
    summary: 'Plan, organise and lead - the skills behind how a company runs day to day.',
    study: ['Business operations', 'Project management', 'Marketing and finance basics'],
    skills: ['Planning', 'Communication', 'Teamwork and leadership'],
    roles: ['Operations assistant', 'Project coordinator', 'Business analyst'],
  },
  {
    id: 'media',
    name: 'Media',
    summary: 'Tell stories and design content across digital and creative channels.',
    study: ['Content creation', 'Design principles', 'Digital communication'],
    skills: ['Creativity', 'Visual design', 'Writing and editing'],
    roles: ['Content creator', 'Junior designer', 'Social media assistant'],
  },
  {
    id: 'finance',
    name: 'Finance',
    summary: 'Work with numbers, budgets and reporting to help a business make decisions.',
    study: ['Accounting basics', 'Budgeting and reporting', 'Financial analysis'],
    skills: ['Attention to detail', 'Numeracy', 'Working with data'],
    roles: ['Finance assistant', 'Accounts trainee', 'Junior analyst'],
  },
  {
    id: 'engineering',
    name: 'Engineering',
    summary: 'Design, build and test real products and systems. More sub-pathways coming soon.',
    study: ['Design and development', 'Manufacturing basics', 'Testing and maintenance'],
    skills: ['Technical design', 'Hands-on building', 'Problem solving'],
    roles: ['Engineering technician', 'Design assistant', 'Maintenance trainee'],
    comingSoon: true,
  },
]

const COLS = [
  { key: 'study', label: 'What you would study' },
  { key: 'skills', label: 'Skills you would build' },
  { key: 'roles', label: 'Where it can lead' },
]

function Information() {
  const [active, setActive] = useState(pathways[0].id)
  const sectionsRef = useRef(null)

  const { hash } = useLocation()

  const scrollToPathway = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Arriving from a link like /information#digital: glide down to that pathway.
  useEffect(() => {
    const id = hash.replace('#', '')
    if (!pathways.some((p) => p.id === id)) return
    setActive(id)
    // Wait a moment so the page has laid out (and finished fading in) first.
    const t = setTimeout(() => scrollToPathway(id), 250)
    return () => clearTimeout(t)
  }, [hash])

  // Scroll-spy: highlight the side-rail item for the pathway in view,
  // and reveal each section as it enters.
  useEffect(() => {
    const sections = sectionsRef.current?.querySelectorAll('.pw-row') || []
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setActive(e.target.id)
            e.target.classList.add('is-in')
          }
        })
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    )
    const reveal = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            reveal.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12 },
    )
    sections.forEach((s) => { spy.observe(s); reveal.observe(s) })
    return () => { spy.disconnect(); reveal.disconnect() }
  }, [])

  return (
    <main className="info2">
      {/* Hero */}
      <header className="info2-hero">
        <div className="info2-hero-inner">
          <h1>Explore the <span>T Level</span> pathways</h1>
          <p className="info2-lead">
            Amazon Emerging Talent offers placements across five subject areas. Explore what
            you would study, the skills you would build, and where each pathway can lead.
          </p>
        </div>
      </header>

      {/* Body: sticky side rail + open sections */}
      <div className="info2-body">
        <aside className="info2-rail" aria-label="Pathways">
          <ol>
            {pathways.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={active === p.id ? 'is-active' : ''}
                  onClick={() => scrollToPathway(p.id)}
                >
                  <span className="info2-rail-n">{String(i + 1).padStart(2, '0')}</span>
                  {p.name}
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <div className="info2-sections" ref={sectionsRef}>
          {pathways.map((p, i) => (
            <section className="pw-row" id={p.id} key={p.id}>
              <div className="pw-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</div>
              <div className="pw-content">
                <div className="pw-head">
                  <h2>{p.name}</h2>
                  {p.comingSoon && <span className="pw-soon">More coming soon</span>}
                </div>
                <p className="pw-summary">{p.summary}</p>

                <div className="pw-cols">
                  {COLS.map((col) => (
                    <div className="pw-col" key={col.key}>
                      <h3>{col.label}</h3>
                      <ul>
                        {p[col.key].map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="pw-actions">
                  <Link className="pw-link" to="/quiz">
                    Is this right for me?
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
                  </Link>
                  <Link className="pw-link pw-link-muted" to="/opportunities">
                    See opportunities
                  </Link>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Closing CTA */}
      <section className="info2-cta">
        <h2>Ready to register your interest?</h2>
        <p>Let Amazon know which pathway interests you - it only takes a minute.</p>
        <Link className="info2-cta-btn" to="/register-interest">Register your interest</Link>
      </section>
    </main>
  )
}

export default Information
