import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import './profile.css'
import { useAuth } from '../modules/auth'
import { api } from '../modules/api'
import { CoffeeChatList } from '../modules/coffee-chat-list'
import PracticeScores from './profile-practice'
import ApplicationBoard from './profile-applications'
import { Icon, PathwayIcon, closingLabel, daysUntil } from '../modules/icons'
import { formatChatTime } from '../modules/mentors'

/*
  My profile - a personal dashboard.
  Header with your progress ring, four quick stats, then tabs:
  Overview, Saved, Coffee chats, Interview practice and CV.
  The tab is kept in the web address (#saved, #cv...) so other pages can
  link straight to it.
*/

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'layers' },
  { id: 'saved', label: 'Saved', icon: 'bookmark' },
  { id: 'applications', label: 'Applications', icon: 'check' },
  { id: 'coffee-chats', label: 'Coffee chats', icon: 'calendar' },
  { id: 'interview-practice', label: 'Interview practice', icon: 'video' },
  { id: 'cv', label: 'CV', icon: 'file' },
]

function tabFromHash(hash) {
  const id = (hash || '').replace('#', '')
  return TABS.some((t) => t.id === id) ? id : 'overview'
}

// Progress ring in the header
function Ring({ value, size = 128 }) {
  const r = (size - 12) / 2
  const c = 2 * Math.PI * r
  return (
    <svg className="pr-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} className="pr-ring-track" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        className="pr-ring-fill"
        strokeDasharray={c}
        style={{ '--offset': c * (1 - value / 100), '--full': c }}
      />
    </svg>
  )
}

function Profile() {
  const { user, loading } = useAuth()
  const { hash } = useLocation()
  const navigate = useNavigate()

  const [tab, setTab] = useState(() => tabFromHash(hash))
  const [saved, setSaved] = useState([])
  const [savedLoading, setSavedLoading] = useState(true)
  const [savedError, setSavedError] = useState('')
  const [progress, setProgress] = useState({ quizCompleted: false, quizPathway: null, interestRegistered: false })
  const [cv, setCv] = useState(null)
  const [cvLoaded, setCvLoaded] = useState(false)
  const [cvBusy, setCvBusy] = useState(false)
  const [cvError, setCvError] = useState('')
  const [chats, setChats] = useState([])
  const [chatsLoading, setChatsLoading] = useState(true)
  const [practice, setPractice] = useState([])
  const fileInput = useRef(null)

  // Links like /profile#cv open the right tab.
  useEffect(() => { setTab(tabFromHash(hash)) }, [hash])

  useEffect(() => {
    if (loading || !user) return
    api.listSavedOpportunities()
      .then((data) => setSaved(data.items || []))
      .catch((err) => setSavedError(err.message))
      .finally(() => setSavedLoading(false))
    api.myProgress().then(setProgress).catch(() => {})
    api.getCv().then((data) => setCv(data.cv)).catch(() => {}).finally(() => setCvLoaded(true))
    api.myCoffeeChats()
      .then((data) => setChats(data.items || []))
      .catch(() => {})
      .finally(() => setChatsLoading(false))
    api.myInterviewPractice().then((d) => setPractice(d.items || [])).catch(() => {})
  }, [loading, user])

  const openTab = (id) => {
    setTab(id)
    navigate({ hash: id === 'overview' ? '' : id }, { replace: true })
  }

  const onTabKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const i = TABS.findIndex((t) => t.id === tab)
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length].id
    openTab(next)
    document.getElementById(`pr-tab-${next}`)?.focus()
  }

  const removeSaved = async (id) => {
    try {
      await api.unsaveOpportunity(id)
      setSaved((prev) => prev.filter((o) => o.id !== id))
    } catch (err) {
      setSavedError(err.message)
    }
  }

  const handleCvUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCvError('')
    setCvBusy(true)
    try {
      const data = await api.uploadCv(file)
      setCv(data.cv)
    } catch (err) {
      setCvError(err.message)
    } finally {
      setCvBusy(false)
    }
  }

  const handleCvDelete = async () => {
    if (!window.confirm('Delete your CV and its review?')) return
    try {
      await api.deleteCv()
      setCv(null)
    } catch (err) {
      setCvError(err.message)
    }
  }

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  // Steps built from real account data. Each one links to where you do it.
  const steps = [
    { label: 'Create your account', done: true },
    { label: 'Add your school or college', done: Boolean(user.school), to: '/settings#account' },
    {
      label: progress.quizCompleted ? `Take the career quiz - you matched ${progress.quizPathway}` : 'Take the career quiz',
      done: progress.quizCompleted,
      to: '/quiz',
    },
    { label: 'Save 3 opportunities', done: saved.length >= 3, to: '/opportunities', note: `${Math.min(saved.length, 3)} of 3` },
    { label: 'Upload your CV', done: Boolean(cv), tab: 'cv' },
    { label: 'Do a practice interview', done: practice.length > 0, to: '/interview' },
    { label: 'Register your interest with Amazon', done: progress.interestRegistered, to: '/register-interest' },
  ]
  const doneCount = steps.filter((s) => s.done).length
  const completion = Math.round((doneCount / steps.length) * 100)
  const nextStep = steps.find((s) => !s.done)

  // Saved opportunities closing in the next 14 days (soonest first).
  const closingSoon = saved
    .filter((o) => { const d = daysUntil(o.closingDate); return d !== null && d >= 0 && d <= 14 })
    .sort((a, b) => daysUntil(a.closingDate) - daysUntil(b.closingDate))

  const now = Date.now()
  const nextChat = chats
    .filter((c) => c.status === 'Confirmed' && c.confirmedTime && new Date(c.confirmedTime).getTime() > now)
    .sort((a, b) => new Date(a.confirmedTime) - new Date(b.confirmedTime))[0]
  const waitingChats = chats.filter((c) => c.status === 'Requested').length
  const bestPractice = practice.reduce((m, p) => Math.max(m, p.overall), 0)
  const latestPractice = practice[0]
  const pathway = progress.quizPathway || user.quizPathway

  const stepAction = (s) => {
    if (s.done) return null
    if (s.tab) {
      return (
        <button type="button" className="pr-step-go" onClick={() => openTab(s.tab)}>
          Start <Icon name="arrowRight" size={13} />
        </button>
      )
    }
    return <Link className="pr-step-go" to={s.to}>Start <Icon name="arrowRight" size={13} /></Link>
  }

  return (
    <main className="pr">
      {/* ---------- Header ---------- */}
      <header className="pr-hero">
        <div className="pr-hero-inner">
          <div className="pr-id">
            <span className="pr-avatar" aria-hidden="true"><img src="/assets/images/defaultprofile.svg" alt="" /></span>
            <div className="pr-id-text">
              <p className="pr-kicker">My profile</p>
              <h1>{user.fullName}</h1>
              <p className="pr-meta">
                {user.school ? (
                  <span><Icon name="building" size={14} /> {user.school}</span>
                ) : (
                  <Link to="/settings#account"><Icon name="building" size={14} /> Add your school or college</Link>
                )}
                <span><Icon name="mail" size={14} /> {user.email}</span>
                {pathway && (
                  <Link className="pr-pathway" to={`/information#${pathway.toLowerCase()}`}>
                    <PathwayIcon pathway={pathway} size={14} /> {pathway} pathway
                  </Link>
                )}
              </p>
              <div className="pr-actions">
                <Link className="primary-button" to="/register-interest">
                  Register interest <Icon name="arrowRight" size={15} />
                </Link>
                <Link className="secondary-button" to="/logbook"><Icon name="book" size={15} /> My logbook</Link>
                <Link className="secondary-button" to="/settings">Edit profile</Link>
              </div>
            </div>
          </div>

          <div className="pr-progress" aria-label={`Profile ${completion}% complete`}>
            <div className="pr-ring-wrap">
              <Ring value={completion} />
              <span className="pr-ring-num">{completion}<small>%</small></span>
            </div>
            <div className="pr-progress-text">
              <strong>{doneCount} of {steps.length} steps done</strong>
              {nextStep ? (
                <span>Next: {nextStep.label.split(' - ')[0].toLowerCase()}</span>
              ) : (
                <span>You've done every step. Nice work!</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ---------- Quick stats ---------- */}
      <div className="pr-stats">
        <button type="button" className="pr-stat" onClick={() => openTab('saved')}>
          <span className="pr-stat-icon"><Icon name="bookmark" size={18} /></span>
          <span className="pr-stat-label">Saved opportunities</span>
          <strong>{savedLoading ? '-' : saved.length}</strong>
          <span className="pr-stat-sub">{closingSoon.length ? `${closingSoon.length} closing soon` : 'None closing soon'}</span>
        </button>
        <button type="button" className="pr-stat" onClick={() => openTab('coffee-chats')}>
          <span className="pr-stat-icon"><Icon name="calendar" size={18} /></span>
          <span className="pr-stat-label">Coffee chats</span>
          <strong>{chatsLoading ? '-' : chats.length}</strong>
          <span className="pr-stat-sub">
            {nextChat ? `Next: ${formatChatTime(nextChat.confirmedTime)}` : waitingChats ? `${waitingChats} waiting to be confirmed` : 'None booked'}
          </span>
        </button>
        <button type="button" className="pr-stat" onClick={() => openTab('interview-practice')}>
          <span className="pr-stat-icon"><Icon name="video" size={18} /></span>
          <span className="pr-stat-label">Best practice score</span>
          <strong>{practice.length ? bestPractice : '-'}{practice.length ? <small>/100</small> : null}</strong>
          <span className="pr-stat-sub">{practice.length ? `${practice.length} practice ${practice.length === 1 ? 'call' : 'calls'}` : 'No practice yet'}</span>
        </button>
        <button type="button" className="pr-stat" onClick={() => openTab('cv')}>
          <span className="pr-stat-icon"><Icon name="file" size={18} /></span>
          <span className="pr-stat-label">CV score</span>
          <strong>{cv ? cv.review.score : '-'}{cv ? <small>/100</small> : null}</strong>
          <span className="pr-stat-sub">{cv ? cv.name : cvLoaded ? 'No CV uploaded' : 'Loading…'}</span>
        </button>
      </div>

      {/* ---------- Tabs ---------- */}
      <nav className="pr-tabs-wrap" aria-label="Profile sections">
        <div className="pr-tabs" role="tablist" onKeyDown={onTabKey}>
          {TABS.map((t) => {
            const count = t.id === 'saved' ? saved.length : t.id === 'coffee-chats' ? chats.length
              : t.id === 'interview-practice' ? practice.length : null
            return (
              <button
                key={t.id}
                id={`pr-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls="pr-panel"
                tabIndex={tab === t.id ? 0 : -1}
                className={tab === t.id ? 'pr-tab is-active' : 'pr-tab'}
                onClick={() => openTab(t.id)}
              >
                <Icon name={t.icon} size={16} />
                {t.label}
                {count ? <span className="pr-tab-count">{count}</span> : null}
              </button>
            )
          })}
        </div>
      </nav>

      <div className="pr-body">
        <section id="pr-panel" role="tabpanel" aria-labelledby={`pr-tab-${tab}`} className="pr-panel" key={tab}>
          {/* ---------- Overview ---------- */}
          {tab === 'overview' && (
            <div className="pr-overview">
              <div className="pr-card pr-steps">
                <div className="pr-card-head">
                  <h2>Your next steps</h2>
                  <span className="pr-card-note">{doneCount} of {steps.length}</span>
                </div>
                <div className="pr-bar" aria-hidden="true"><span style={{ width: `${completion}%` }} /></div>
                <ol className="pr-step-list">
                  {steps.map((s, i) => (
                    <li key={s.label} className={s.done ? 'is-done' : nextStep === s ? 'is-next' : ''}>
                      <span className="pr-step-dot" aria-hidden="true">
                        {s.done ? <Icon name="check" size={13} /> : i + 1}
                      </span>
                      <span className="pr-step-text">
                        {s.label}
                        {s.note && !s.done && <em>{s.note}</em>}
                      </span>
                      {stepAction(s)}
                      <span className="visually-hidden">{s.done ? '(done)' : '(not done yet)'}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="pr-side">
                <div className="pr-card">
                  <div className="pr-card-head">
                    <h2>Coming up</h2>
                  </div>
                  {!nextChat && closingSoon.length === 0 ? (
                    <p className="pr-quiet">Nothing coming up. Save opportunities or book a coffee chat and they'll show here.</p>
                  ) : (
                    <ul className="pr-upcoming">
                      {nextChat && (
                        <li>
                          <span className="pr-up-icon is-chat"><Icon name="calendar" size={16} /></span>
                          <span>
                            <strong>Coffee chat with {nextChat.mentor}</strong>
                            <span>{formatChatTime(nextChat.confirmedTime)}</span>
                          </span>
                        </li>
                      )}
                      {closingSoon.slice(0, 3).map((o) => (
                        <li key={o.id}>
                          <span className="pr-up-icon is-closing"><Icon name="clock" size={16} /></span>
                          <span>
                            <Link to={`/opportunities/${o.id}`}><strong>{o.title}</strong></Link>
                            <span>{closingLabel(o.closingDate).text}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="pr-card">
                  <div className="pr-card-head">
                    <h2>Interview practice</h2>
                    <button type="button" className="pr-card-link" onClick={() => openTab('interview-practice')}>
                      See all <Icon name="arrowRight" size={13} />
                    </button>
                  </div>
                  {latestPractice ? (
                    <p className="pr-mini">
                      <span className="pr-mini-num">{latestPractice.overall}<small>/100</small></span>
                      <span>Your latest {latestPractice.pathway} practice call. Best so far: {bestPractice}.</span>
                    </p>
                  ) : (
                    <p className="pr-quiet">
                      Practise answering out loud with a virtual interviewer.{' '}
                      <Link to="/interview">Start a practice call</Link>
                    </p>
                  )}
                </div>

                <div className="pr-card">
                  <div className="pr-card-head">
                    <h2>Your CV</h2>
                    <button type="button" className="pr-card-link" onClick={() => openTab('cv')}>
                      {cv ? 'See review' : 'Upload'} <Icon name="arrowRight" size={13} />
                    </button>
                  </div>
                  {cv ? (
                    <p className="pr-mini">
                      <span className="pr-mini-num">{cv.review.score}<small>/100</small></span>
                      <span>{cv.review.verdict}</span>
                    </p>
                  ) : (
                    <p className="pr-quiet">Upload your CV to get a score and tips to improve it.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ---------- Saved ---------- */}
          {tab === 'saved' && (
            <div className="pf-section">
              <div className="pf-section-head">
                <h2>Saved opportunities <span className="pf-count">{saved.length}</span></h2>
                <Link className="pf-link" to="/opportunities">Browse more <Icon name="arrowRight" size={14} /></Link>
              </div>

              {savedError && <div className="pf-error" role="alert">{savedError}</div>}

              {closingSoon.length > 0 && (
                <div className="pf-alert" role="status">
                  <span className="pf-alert-icon"><Icon name="clock" size={18} /></span>
                  <div>
                    <strong>
                      {closingSoon.length === 1
                        ? '1 saved opportunity closes soon'
                        : `${closingSoon.length} saved opportunities close soon`}
                    </strong>
                    <span>
                      {closingSoon.map((o, i) => (
                        <span key={o.id}>
                          {i > 0 && ', '}
                          <Link to={`/opportunities/${o.id}`}>{o.title}</Link> ({closingLabel(o.closingDate).text.toLowerCase()})
                        </span>
                      ))}
                    </span>
                  </div>
                </div>
              )}

              {savedLoading ? (
                <p className="pf-empty">Loading…</p>
              ) : saved.length === 0 ? (
                <div className="pr-empty">
                  <span className="pr-empty-icon"><Icon name="bookmark" size={22} /></span>
                  <div>
                    <strong>Nothing saved yet</strong>
                    <p>Press the bookmark on any opportunity to keep it here.</p>
                  </div>
                  <Link className="primary-button" to="/opportunities">Browse opportunities <Icon name="arrowRight" size={15} /></Link>
                </div>
              ) : (
                <ul className="pf-saved-grid">
                  {saved.map((item) => {
                    const closing = closingLabel(item.closingDate)
                    return (
                      <li className="pf-card" key={item.id}>
                        <div className="pf-card-top">
                          <span className="pf-card-icon"><PathwayIcon pathway={item.pathway} size={18} /></span>
                          <button
                            type="button"
                            className="pf-card-remove"
                            onClick={() => removeSaved(item.id)}
                            aria-label={`Remove ${item.title} from saved`}
                            title="Remove from saved"
                          >
                            <Icon name="bookmark" size={16} data-filled />
                          </button>
                        </div>
                        <p className="pf-card-type">{item.pathway} · {item.type}</p>
                        <Link className="pf-card-title" to={`/opportunities/${item.id}`}>{item.title}</Link>
                        <ul className="pf-card-meta">
                          <li><Icon name="building" size={13} />{item.employer}</li>
                          <li><Icon name="pin" size={13} />{item.location}</li>
                        </ul>
                        {closing && <span className={`pf-card-closing is-${closing.tone}`}>{closing.text}</span>}
                        <div className="pf-card-actions">
                          <Link className="pf-card-view" to={`/opportunities/${item.id}`}>
                            View details <Icon name="arrowRight" size={14} />
                          </Link>
                          <a className="pf-card-apply" href={item.applyUrl} target="_blank" rel="noopener noreferrer">
                            Apply <Icon name="external" size={14} />
                          </a>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          {/* ---------- Coffee chats ---------- */}
          {tab === 'coffee-chats' && (
            <div className="pf-section" id="coffee-chats">
              <div className="pf-section-head">
                <h2>Coffee chats <span className="pf-count">{chats.length}</span></h2>
                <Link className="pf-link" to="/alumni/coffee-chats">Book a chat <Icon name="arrowRight" size={14} /></Link>
              </div>
              {chatsLoading ? (
                <p className="pf-empty">Loading…</p>
              ) : chats.length === 0 ? (
                <div className="pr-empty">
                  <span className="pr-empty-icon"><Icon name="calendar" size={22} /></span>
                  <div>
                    <strong>No coffee chats yet</strong>
                    <p>Have a relaxed 15-minute chat with a student, alum or Amazon buddy.</p>
                  </div>
                  <Link className="primary-button" to="/alumni/coffee-chats">Book a chat <Icon name="arrowRight" size={15} /></Link>
                </div>
              ) : (
                <CoffeeChatList
                  items={chats}
                  onUpdate={(req) => setChats((prev) => prev.map((r) => (r.id === req.id ? req : r)))}
                />
              )}
            </div>
          )}

          {/* ---------- Applications ---------- */}
          {tab === 'applications' && <ApplicationBoard />}

          {/* ---------- Interview practice ---------- */}
          {tab === 'interview-practice' && <PracticeScores />}

          {/* ---------- CV ---------- */}
          {tab === 'cv' && (
            <div className="pf-section pf-cv" id="cv">
              <div className="pf-section-head">
                <h2>Your CV</h2>
                {cv && <a className="pf-link" href={api.cvFileUrl()}>Download <Icon name="download" size={14} /></a>}
              </div>

              <input ref={fileInput} type="file" accept=".pdf,.docx,.txt" onChange={handleCvUpload} hidden />
              {cvError && <div className="pf-error" role="alert">{cvError}</div>}

              {!cv ? (
                <div className="pr-empty">
                  <span className="pr-empty-icon"><Icon name="upload" size={22} /></span>
                  <div>
                    <strong>Upload your CV</strong>
                    <p>
                      We'll check it straight away and give it a score out of 100, with tips to improve it.
                      PDF, Word (.docx) or text file, up to 10 MB.
                    </p>
                  </div>
                  <button type="button" className="primary-button" onClick={() => fileInput.current?.click()} disabled={cvBusy}>
                    {cvBusy ? 'Checking your CV…' : 'Upload your CV'}
                  </button>
                </div>
              ) : (
                <div className="pr-cv">
                  <div className="pr-cv-top">
                    <div className="pr-cv-score" aria-label={`CV score ${cv.review.score} out of 100`}>
                      <Ring value={cv.review.score} size={112} />
                      <span className="pr-ring-num">{cv.review.score}<small>/100</small></span>
                    </div>
                    <div className="pr-cv-summary">
                      <p className="pr-cv-verdict">{cv.review.verdict}</p>
                      <p className="pr-cv-file"><Icon name="file" size={14} /> {cv.name} · {cv.review.wordCount} words</p>
                      <div className="pr-cv-actions">
                        <button type="button" className="secondary-button" onClick={() => fileInput.current?.click()} disabled={cvBusy}>
                          <Icon name="upload" size={15} /> {cvBusy ? 'Checking…' : 'Upload a new version'}
                        </button>
                        <button type="button" className="pr-remove" onClick={handleCvDelete}>
                          <Icon name="trash" size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pr-cv-areas">
                    {cv.review.areas.map((area) => (
                      <div className="pr-cv-area" key={area.name}>
                        <div className="pr-cv-area-head">
                          <span>{area.name}</span>
                          <span>{area.score} / {area.max}</span>
                        </div>
                        <div className="pr-bar"><span style={{ width: `${(area.score / area.max) * 100}%` }} /></div>
                      </div>
                    ))}
                  </div>

                  {cv.review.tips.length > 0 && (
                    <div className="pr-cv-tips">
                      <h3>How to improve it</h3>
                      <ul>{cv.review.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
                    </div>
                  )}
                  <p className="pr-note">
                    This score is an automatic check of layout and content. It is a guide only and is not used by
                    Amazon to make hiring decisions.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default Profile
