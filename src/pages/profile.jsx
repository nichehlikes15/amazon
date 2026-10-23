import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import './profile.css'
import { useAuth } from '../modules/auth'
import { api } from '../modules/api'

function Profile() {
  const { user, loading } = useAuth()

  const [saved, setSaved] = useState([])
  const [savedLoading, setSavedLoading] = useState(true)
  const [savedError, setSavedError] = useState('')

  // Load the user's saved opportunities from the backend.
  useEffect(() => {
    if (loading || !user) return
    api.listSavedOpportunities()
      .then((data) => setSaved(data.items || []))
      .catch((err) => setSavedError(err.message))
      .finally(() => setSavedLoading(false))
  }, [loading, user])

  const removeSaved = async (id) => {
    try {
      await api.unsaveOpportunity(id)
      setSaved((prev) => prev.filter((o) => o.id !== id))
    } catch (err) {
      setSavedError(err.message)
    }
  }

  const interests = ['Digital', 'Business', 'Engineering', 'Software Development']

  const activity = [
    { action: 'Applied to Amazon Emerging Talent Placement', when: '2 days ago' },
    { action: 'Saved Digital Software Development T Level', when: '5 days ago' },
    { action: 'Completed the career quiz', when: '1 week ago' },
  ]

  const checklist = [
    { label: 'Create your account', done: true },
    { label: 'Add your interests', done: true },
    { label: 'Take the career quiz', done: true },
    { label: 'Save 3 opportunities', done: true },
    { label: 'Register your interest with Amazon', done: false },
    { label: 'Upload your CV', done: false },
  ]

  const doneCount = checklist.filter((c) => c.done).length
  const completion = Math.round((doneCount / checklist.length) * 100)

  // Wait for the session check, then require login.
  // (Kept after the hooks above so hooks always run in the same order.)
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  return (
    <>
      <main className="profile-page">
        <div className="profile-container">
          {/* Profile header card (LinkedIn style) */}
          <section className="profile-hero" aria-labelledby="profile-heading">
            <div className="profile-cover" aria-hidden="true" />
            <div className="profile-hero-body">
              <img
                className="profile-avatar"
                src="/assets/images/defaultprofile.svg"
                alt=""
              />
              <div className="profile-hero-row">
                <div className="profile-hero-text">
                  <h1 id="profile-heading">{user.fullName}</h1>
                  <p className="profile-headline">Year 12 student exploring T Levels and placements</p>
                  <p className="profile-location">London · Digital pathway</p>
                </div>
                <div className="profile-hero-actions">
                  <a className="primary-button" href="/register-interest">Register interest</a>
                  <a className="secondary-button" href="/settings">Edit profile</a>
                </div>
              </div>
            </div>
          </section>

          {/* Dashboard body */}
          <div className="dashboard-grid">
            {/* Left column */}
            <aside className="dashboard-side">
              {/* Profile completion */}
              <div className="panel">
                <h2 className="panel-title">Profile completion</h2>
                <div className="completion">
                  <div className="completion-bar">
                    <div className="completion-fill" style={{ width: `${completion}%` }} />
                  </div>
                  <span className="completion-pct">{completion}%</span>
                </div>
                <ul className="checklist">
                  {checklist.map((item) => (
                    <li key={item.label} className={item.done ? 'check done' : 'check'}>
                      <span className="check-mark" aria-hidden="true">{item.done ? '✓' : ''}</span>
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Interests */}
              <div className="panel">
                <h2 className="panel-title">Your interests</h2>
                <ul className="tag-list">
                  {interests.map((interest) => (
                    <li className="tag" key={interest}>{interest}</li>
                  ))}
                </ul>
              </div>
            </aside>

            {/* Main column */}
            <div className="dashboard-main">
              {/* Stat tiles */}
              <div className="stat-row">
                <article className="stat-tile">
                  <span className="stat-number">{saved.length}</span>
                  <p>Opportunities saved</p>
                </article>
                <article className="stat-tile">
                  <span className="stat-number">1</span>
                  <p>Applications started</p>
                </article>
                <article className="stat-tile">
                  <span className="stat-number">1</span>
                  <p>Quiz completed</p>
                </article>
              </div>

              {/* Saved opportunities */}
              <div className="panel">
                <div className="panel-head">
                  <h2 className="panel-title">Saved opportunities</h2>
                  <a className="panel-link" href="/opportunities">Browse more →</a>
                </div>
                {savedError && <div className="auth-error" role="alert">{savedError}</div>}
                {savedLoading ? (
                  <p className="saved-empty">Loading…</p>
                ) : saved.length === 0 ? (
                  <p className="saved-empty">
                    You haven't saved anything yet. <a href="/opportunities">Browse opportunities →</a>
                  </p>
                ) : (
                  <div className="saved-list">
                    {saved.map((item) => (
                      <article className="saved-row" key={item.id}>
                        <div className="saved-row-main">
                          <span className="saved-type">{item.pathway}</span>
                          <h3>{item.title}</h3>
                          <p className="saved-location">{item.employer} · {item.location}</p>
                        </div>
                        <div className="saved-row-actions">
                          <a
                            className="saved-apply"
                            href={item.applyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Apply →
                          </a>
                          <button
                            type="button"
                            className="saved-remove"
                            onClick={() => removeSaved(item.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent activity */}
              <div className="panel">
                <h2 className="panel-title">Recent activity</h2>
                <ul className="activity-list">
                  {activity.map((item) => (
                    <li className="activity-item" key={item.action}>
                      <span className="activity-dot" aria-hidden="true" />
                      <span className="activity-text">{item.action}</span>
                      <span className="activity-when">{item.when}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export default Profile
