import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './home.css'
import Events from '../modules/events'

const PATHWAYS = [
  {
    name: 'Digital', blurb: 'Software, data and support.',
    // code brackets </>
    icon: <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>,
  },
  {
    name: 'Business', blurb: 'Operations, planning and people.',
    // briefcase
    icon: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>,
  },
  {
    name: 'Media', blurb: 'Content, design and communication.',
    // play / media
    icon: <><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M10 8l5 3-5 3V8z" /><line x1="8" y1="21" x2="16" y2="21" /></>,
  },
  {
    name: 'Finance', blurb: 'Budgets, analysis and reporting.',
    // trending up chart
    icon: <><polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" /></>,
  },
  {
    name: 'Engineering', blurb: 'Design, build and maintain.',
    // wrench / tool
    icon: <><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6z" /></>,
  },
]

const STATS = [
  { value: 27446, suffix: '', label: 'T Level learners in England (2025-26)' },
  { value: 21, suffix: '', label: 'T Level pathways nationally' },
  { value: 5, suffix: '', label: 'subject areas at Amazon' },
]

const STEPS = [
  { n: '01', title: 'Discover', text: 'Explore pathways and take the quiz to find your fit.' },
  { n: '02', title: 'Prepare', text: 'Use on-site guides and track your application.' },
  { n: '03', title: 'Apply', text: 'Save opportunities and apply to real placements.' },
]

// Small hook: adds a class when the element scrolls into view, for reveal animations.
function useReveal() {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true)
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, shown]
}

// Count-up number animation, triggered when the stats band is revealed.
function useCountUp(target, run, duration = 1400) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!run) return
    let frame
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(target * eased))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [run, target, duration])
  return value
}

function StatCard({ stat, run }) {
  const value = useCountUp(stat.value, run)
  return (
    <div className="h-stat">
      <span className="h-stat-num">{value.toLocaleString()}{stat.suffix}</span>
      <span className="h-stat-label">{stat.label}</span>
    </div>
  )
}

function Home() {
  const [statsRef, statsShown] = useReveal()
  const [pathRef, pathShown] = useReveal()
  const [stepsRef, stepsShown] = useReveal()
  const [ctaRef, ctaShown] = useReveal()

  return (
    <main className="home">
      {/* ===== Animated hero ===== */}
      <section className="h-hero">
        <div className="h-hero-glow" aria-hidden="true" />
        <div className="h-hero-inner">
          <h1 className="h-title">
            <span className="h-rise" style={{ animationDelay: '0.15s' }}>Launch</span>{' '}
            <span className="h-rise" style={{ animationDelay: '0.3s' }}>your</span>{' '}
            <span className="h-rise h-accent" style={{ animationDelay: '0.45s' }}>future</span>
          </h1>
          <p className="h-hero-sub h-rise" style={{ animationDelay: '0.6s' }}>
            Discover T Levels, placements and apprenticeships at Amazon. Find your pathway,
            prepare with real guides, and apply - all in one place.
          </p>
          <div className="h-hero-actions h-rise" style={{ animationDelay: '0.75s' }}>
            <Link className="h-btn h-btn-primary" to="/quiz">Find your pathway</Link>
            <Link className="h-btn h-btn-ghost" to="/opportunities">Browse opportunities</Link>
          </div>
        </div>
      </section>

      {/* ===== Stats band with count-up ===== */}
      <section
        className={`h-stats ${statsShown ? 'is-shown' : ''}`}
        ref={statsRef}
      >
        {STATS.map((s) => (
          <StatCard key={s.label} stat={s} run={statsShown} />
        ))}
      </section>

      {/* ===== Pathways showcase ===== */}
      <section className="h-section" ref={pathRef}>
        <div className="h-section-head">
          <h2>Five pathways, one launchpad</h2>
          <p className="h-lead">
            Each pathway blends real work with training. Pick the one that fits how you think.
          </p>
        </div>
        <div className="h-path-grid">
          {PATHWAYS.map((p, i) => (
            <Link
              to="/information"
              className={`h-path-card ${pathShown ? 'is-shown' : ''}`}
              key={p.name}
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <span className="h-path-dot" aria-hidden="true" />
              <span className="h-path-dot" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {p.icon}
                </svg>
              </span>
              <h3>{p.name}</h3>
              <p>{p.blurb}</p>
              <span className="h-path-go" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M13 6l6 6-6 6" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== Steps ===== */}
      <section className="h-steps-wrap" ref={stepsRef}>
        <div className="h-section-head">
          <h2>From curious to placement</h2>
        </div>
        <div className="h-steps">
          {STEPS.map((s, i) => (
            <div
              className={`h-step ${stepsShown ? 'is-shown' : ''}`}
              key={s.n}
              style={{ transitionDelay: `${i * 0.12}s` }}
            >
              <span className="h-step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Gradient CTA ===== */}
      <section
        className={`h-cta ${ctaShown ? 'is-shown' : ''}`}
        ref={ctaRef}
      >
        <div className="h-cta-shimmer" aria-hidden="true" />
        <div className="h-cta-inner">
          <h2>Your next step starts here</h2>
          <p>Take the two-minute quiz and we'll point you to the pathway that fits.</p>
          <Link className="h-btn h-btn-light" to="/quiz">Start the quiz</Link>
        </div>
      </section>
    </main>
  )
}

export default Home
