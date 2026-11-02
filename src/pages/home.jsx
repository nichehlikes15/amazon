import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './home.css'
import { api } from '../modules/api'
import { useAuth } from '../modules/auth'
import { Icon, PathwayIcon, closingLabel, daysUntil } from '../modules/icons'
import { formatChatTime } from '../modules/mentors'
import { RoleChoice, roleInfo, useRole } from '../modules/role'

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

// Signed-in summary: your quiz match, saved opportunities and next coffee chat.
// What to look at first, for each type of visitor.
const ROLE_NEXT = {
  student: [
    { to: '/quiz', icon: 'all', label: 'Start here', title: 'Find your pathway', sub: 'Take the two-minute career quiz' },
    { to: '/opportunities', icon: 'search', label: 'Explore', title: 'Opportunities', sub: 'Placements and apprenticeships at Amazon' },
    { to: '/interview', icon: 'video', label: 'Get ready', title: 'Interview practice', sub: 'Practise with Alex or Peccy, our virtual interviewers' },
  ],
  teacher: [
    { to: '/tlevel', icon: 'book', label: 'Start here', title: 'T Levels at Amazon', sub: 'How placements work for your students' },
    { to: '/t-level/advice', icon: 'file', label: 'Guidance', title: 'Advice', sub: 'Setting up and supporting a placement' },
    { to: '/register-interest?role=school', icon: 'building', label: 'Partner with us', title: 'Register your school', sub: 'Tell Amazon you would like to take part' },
  ],
  parent: [
    { to: '/parents', icon: 'heart', label: 'Start here', title: 'Parents and carers', sub: 'What T Levels and placements involve' },
    { to: '/what-is-a-t-level', icon: 'book', label: 'The basics', title: 'What is a T Level?', sub: 'The course explained simply' },
    { to: '/safeguarding', icon: 'shield', label: 'Peace of mind', title: 'Staying safe', sub: 'How students are kept safe' },
  ],
}

// Older accounts made before roles: ask once, at the top of the welcome card.
function AccountRolePrompt() {
  const [, setRole] = useRole()
  return (
    <div className="h-role-prompt">
      <p><strong>Tell us who you are</strong> so we only show you the links you need.</p>
      <RoleChoice value={null} name="account-role" compact onChange={setRole} />
    </div>
  )
}

function RoleTiles({ role }) {
  return (
    <div className="h-welcome-grid">
      {ROLE_NEXT[role].map((tile, i) => (
        <Link className="h-tile h-role-tile" to={tile.to} key={tile.to} style={{ '--i': i }}>
          <span className="h-tile-icon"><Icon name={tile.icon} size={20} /></span>
          <span className="h-tile-label">{tile.label}</span>
          <strong>{tile.title}</strong>
          <span className="h-tile-sub">{tile.sub}</span>
        </Link>
      ))}
    </div>
  )
}

// Signed out: "I am a..." instead of the signed-in summary. The choice is kept
// on this device, and added to the account if they sign up or sign in later.
function RoleWelcome() {
  const [role, setRole] = useRole()
  const [changing, setChanging] = useState(false)
  const info = roleInfo(role)

  if (!info || changing) {
    return (
      <section className="h-welcome h-role" aria-labelledby="h-role-title">
        <div className="h-role-swap" key="pick">
          <div className="h-welcome-head">
            <h2 id="h-role-title">Welcome to Launchpad. I am a…</h2>
            {changing && (
              <button type="button" className="h-welcome-link h-role-btn" onClick={() => setChanging(false)}>
                Keep {info.label.toLowerCase()}
              </button>
            )}
          </div>
          <p className="h-role-lead">
            Pick one and we&apos;ll show you the parts of Launchpad that are useful to you. You can change it at any time.
          </p>
          <RoleChoice value={role} name="home-role" onChange={(r) => { setRole(r); setChanging(false) }} />
        </div>
      </section>
    )
  }

  return (
    <section className="h-welcome h-role" aria-labelledby="h-role-title">
      <div className="h-role-swap" key={role}>
        <div className="h-welcome-head">
          <h2 id="h-role-title">Launchpad for {info.plural}</h2>
          <button type="button" className="h-welcome-link h-role-btn" onClick={() => setChanging(true)}>
            Not a {info.label.toLowerCase()}? Change
          </button>
        </div>
        <RoleTiles role={role} />
        <p className="h-role-note">
          <Icon name="check" size={14} /> Saved on this device. If you create an account, it&apos;s saved to your account too.
        </p>
      </div>
    </section>
  )
}

function WelcomeBack({ user }) {
  const [saved, setSaved] = useState(null)
  const [chats, setChats] = useState([])

  useEffect(() => {
    api.listSavedOpportunities().then((d) => setSaved(d.items || [])).catch(() => setSaved([]))
    api.myCoffeeChats().then((d) => setChats(d.items || [])).catch(() => setChats([]))
  }, [])

  const firstName = user.fullName.split(' ')[0]
  const pathway = user.quizPathway

  const nextClosing = (saved || [])
    .filter((o) => { const d = daysUntil(o.closingDate); return d !== null && d >= 0 })
    .sort((a, b) => daysUntil(a.closingDate) - daysUntil(b.closingDate))[0]

  const now = Date.now()
  const nextChat = chats
    .filter((c) => c.status === 'Confirmed' && c.confirmedTime && new Date(c.confirmedTime).getTime() > now)
    .sort((a, b) => new Date(a.confirmedTime) - new Date(b.confirmedTime))[0]
  const waitingChats = chats.filter((c) => c.status === 'Requested').length

  return (
    <section className="h-welcome" aria-label="Your summary">
      <div className="h-welcome-head">
        <h2>Welcome back, {firstName}</h2>
        <Link className="h-welcome-link" to="/profile">Go to my profile <Icon name="arrowRight" size={14} /></Link>
      </div>
      {!user.role && <AccountRolePrompt />}
      <div className="h-welcome-grid">
        {/* Quiz match */}
        <Link className="h-tile" to={pathway ? `/information#${pathway.toLowerCase()}` : '/quiz'}>
          <span className="h-tile-icon">{pathway ? <PathwayIcon pathway={pathway} size={20} /> : <Icon name="check" size={20} />}</span>
          <span className="h-tile-label">Your pathway</span>
          <strong>{pathway || 'Not found yet'}</strong>
          <span className="h-tile-sub">{pathway ? 'From your career quiz' : 'Take the two-minute quiz'}</span>
        </Link>

        {/* Saved */}
        <Link className="h-tile" to={saved && saved.length ? '/profile' : '/opportunities'}>
          <span className="h-tile-icon"><Icon name="bookmark" size={20} /></span>
          <span className="h-tile-label">Saved opportunities</span>
          <strong>{saved === null ? '-' : saved.length}</strong>
          <span className="h-tile-sub">
            {nextClosing
              ? <>Next to close: {nextClosing.title} ({closingLabel(nextClosing.closingDate).text.toLowerCase()})</>
              : saved && saved.length ? 'None closing soon' : 'Browse and save the ones you like'}
          </span>
        </Link>

        {/* Coffee chat */}
        <Link className="h-tile" to="/alumni/coffee-chats">
          <span className="h-tile-icon"><Icon name="calendar" size={20} /></span>
          <span className="h-tile-label">Next coffee chat</span>
          <strong>{nextChat ? nextChat.mentor : waitingChats ? `${waitingChats} waiting` : 'None booked'}</strong>
          <span className="h-tile-sub">
            {nextChat
              ? formatChatTime(nextChat.confirmedTime)
              : waitingChats ? 'Waiting for the team to confirm' : 'Talk to a student or Amazon buddy'}
          </span>
        </Link>
      </div>
    </section>
  )
}

function Home() {
  const { user } = useAuth()
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

      {user ? <WelcomeBack user={user} /> : <RoleWelcome />}

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
              to={`/information#${p.name.toLowerCase()}`}
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
