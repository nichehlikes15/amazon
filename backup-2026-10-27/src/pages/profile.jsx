import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import './profile.css'
import { useAuth } from '../modules/auth'
import { api } from '../modules/api'

const Arrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" /><path d="M13 6l6 6-6 6" />
  </svg>
)

function Profile() {
  const { user, loading } = useAuth()

  const [saved, setSaved] = useState([])
  const [savedLoading, setSavedLoading] = useState(true)
  const [savedError, setSavedError] = useState('')
  const [progress, setProgress] = useState({ quizCompleted: false, quizPathway: null, interestRegistered: false })
  const [cv, setCv] = useState(null)
  const [cvBusy, setCvBusy] = useState(false)
  const [cvError, setCvError] = useState('')
  const fileInput = useRef(null)

  // Load the user's saved opportunities from the backend.
  useEffect(() => {
    if (loading || !user) return
    api.listSavedOpportunities()
      .then((data) => setSaved(data.items || []))
      .catch((err) => setSavedError(err.message))
      .finally(() => setSavedLoading(false))
    api.myProgress()
      .then((data) => setProgress(data))
      .catch(() => {})
    api.getCv()
      .then((data) => setCv(data.cv))
      .catch(() => {})
  }, [loading, user])

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

  // Checklist built from real account data, each step linking to where you do it.
  const checklist = [
    { label: 'Create your account', done: true, to: null },
    { label: 'Add your school or college', done: Boolean(user.school), to: '/settings#account' },
    { label: 'Save 3 opportunities', done: saved.length >= 3, to: '/opportunities' },
    { label: 'Upload your CV', done: Boolean(cv), to: '#cv' },
    {
      label: progress.quizCompleted ? `Take the career quiz - you matched ${progress.quizPathway}` : 'Take the career quiz',
      done: progress.quizCompleted,
      to: '/quiz',
    },
    { label: 'Register your interest with Amazon', done: progress.interestRegistered, to: '/register-interest' },
  ]
  const completion = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100)

  return (
    <main className="pf">
      {/* Light lilac hero */}
      <header className="pf-hero">
        <div className="pf-hero-inner">
          <img className="pf-avatar" src="/assets/images/defaultprofile.svg" alt="" />
          <div className="pf-hero-text">
            <h1>{user.fullName}</h1>
            <p className="pf-meta">
              {user.school ? user.school : <Link to="/settings#account">Add your school or college</Link>}
              <span aria-hidden="true"> · </span>
              {user.email}
            </p>
          </div>
          <div className="pf-hero-actions">
            <Link className="pf-btn" to="/register-interest">Register interest</Link>
            <Link className="pf-link" to="/settings">Edit profile <Arrow /></Link>
          </div>
        </div>
      </header>

      <div className="pf-body">
        <div className="pf-grid">
          {/* Saved opportunities */}
          <section className="pf-section">
            <div className="pf-section-head">
              <h2>Saved opportunities <span className="pf-count">{saved.length}</span></h2>
              <Link className="pf-link" to="/opportunities">Browse more <Arrow /></Link>
            </div>

            {savedError && <div className="pf-error" role="alert">{savedError}</div>}

            {savedLoading ? (
              <p className="pf-empty">Loading…</p>
            ) : saved.length === 0 ? (
              <p className="pf-empty">
                You haven't saved anything yet. <Link to="/opportunities">Browse opportunities</Link>
              </p>
            ) : (
              <ul className="pf-saved">
                {saved.map((item) => (
                  <li key={item.id}>
                    <div className="pf-saved-main">
                      <Link className="pf-saved-title" to={`/opportunities/${item.id}`}>{item.title}</Link>
                      <p>{item.employer} · {item.location}</p>
                    </div>
                    <div className="pf-saved-actions">
                      <a className="pf-link" href={item.applyUrl} target="_blank" rel="noopener noreferrer">
                        Apply <Arrow />
                      </a>
                      <button type="button" className="pf-remove" onClick={() => removeSaved(item.id)}>
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Next steps */}
          <aside className="pf-section pf-side">
            <h2>Your next steps</h2>
            <div className="pf-progress-row">
              <div className="pf-progress"><div className="pf-progress-fill" style={{ width: `${completion}%` }} /></div>
              <span>{completion}%</span>
            </div>
            <ul className="pf-checklist">
              {checklist.map((item) => (
                <li key={item.label} className={item.done ? 'is-done' : ''}>
                  <span className="pf-check" aria-hidden="true">
                    {item.done && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                    )}
                  </span>
                  {item.done || !item.to ? (
                    <span>{item.label}</span>
                  ) : (
                    item.to.startsWith('#') ? <a href={item.to}>{item.label}</a> : <Link to={item.to}>{item.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </aside>
        </div>

        {/* CV upload and review */}
        <section className="pf-section pf-cv" id="cv">
          <div className="pf-section-head">
            <h2>Your CV</h2>
            {cv && (
              <a className="pf-link" href={api.cvFileUrl()}>Download <Arrow /></a>
            )}
          </div>

          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleCvUpload}
            hidden
          />
          {cvError && <div className="pf-error" role="alert">{cvError}</div>}

          {!cv ? (
            <div className="pf-cv-empty">
              <p>
                Upload your CV to keep it saved to your profile. We will check it straight away
                and give it a score out of 100, with tips on how to improve it.
              </p>
              <button type="button" className="pf-btn" onClick={() => fileInput.current?.click()} disabled={cvBusy}>
                {cvBusy ? 'Checking your CV…' : 'Upload your CV'}
              </button>
              <p className="pf-cv-note">PDF, Word (.docx) or text file, up to 10 MB.</p>
            </div>
          ) : (
            <div className="pf-cv-result">
              <div className="pf-cv-score" aria-label={`CV score ${cv.review.score} out of 100`}>
                <span className="pf-cv-num">{cv.review.score}</span>
                <span className="pf-cv-out">/ 100</span>
              </div>
              <div className="pf-cv-summary">
                <p className="pf-cv-verdict">{cv.review.verdict}</p>
                <p className="pf-cv-file">{cv.name} · {cv.review.wordCount} words</p>
                <div className="pf-cv-actions">
                  <button type="button" className="pf-btn" onClick={() => fileInput.current?.click()} disabled={cvBusy}>
                    {cvBusy ? 'Checking…' : 'Upload a new version'}
                  </button>
                  <button type="button" className="pf-remove" onClick={handleCvDelete}>Delete</button>
                </div>
              </div>

              <div className="pf-cv-areas">
                {cv.review.areas.map((area) => (
                  <div className="pf-cv-area" key={area.name}>
                    <div className="pf-cv-area-head">
                      <span>{area.name}</span>
                      <span>{area.score} / {area.max}</span>
                    </div>
                    <div className="pf-progress">
                      <div className="pf-progress-fill" style={{ width: `${(area.score / area.max) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {cv.review.tips.length > 0 && (
                <div className="pf-cv-tips">
                  <h3>How to improve it</h3>
                  <ul>
                    {cv.review.tips.map((tip) => <li key={tip}>{tip}</li>)}
                  </ul>
                </div>
              )}
              <p className="pf-cv-note">
                This score is an automatic check of layout and content. It is a guide only and is not
                used by Amazon to make hiring decisions.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default Profile
