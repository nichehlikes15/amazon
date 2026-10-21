import { Navigate } from 'react-router-dom'
import './profile.css'
import { useAuth } from '../modules/auth'

function Profile() {
  const { user, loading } = useAuth()

  // Wait for the session check, then require login.
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  const savedItems = [
    { type: 'Apprenticeship', title: 'Amazon Digital Apprenticeship', location: 'London', status: 'Open' },
    { type: 'T Level', title: 'Digital Software Development', location: 'Nationwide', status: 'Saved' },
    { type: 'Placement', title: 'Amazon Emerging Talent Placement', location: 'Manchester', status: 'Applied' },
    { type: 'College', title: 'Ada National College for Digital Skills', location: 'London', status: 'Saved' },
  ]

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

  return (
    <>
      <main className="profile-page">
        {/* Account banner */}
        <section className="account-banner" aria-labelledby="profile-heading">
          <div className="account-banner-inner">
            <div className="account-identity">
              <img
                className="profile-avatar"
                src="/assets/images/defaultprofile.svg"
                alt=""
              />
              <div>
                <p className="account-eyebrow">Your account</p>
                <h1 id="profile-heading">{user.fullName}</h1>
                <p className="account-meta">Year 12 student · London · Digital pathway</p>
              </div>
            </div>
            <div className="account-banner-actions">
              <a className="primary-button" href="/register-interest">Register interest</a>
              <a className="secondary-button secondary-on-dark" href="/settings">Edit profile</a>
            </div>
          </div>
        </section>

        {/* Dashboard body */}
        <section className="dashboard">
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
                  <span className="stat-number">4</span>
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
                  <a className="panel-link" href="/information">Browse more →</a>
                </div>
                <div className="saved-list">
                  {savedItems.map((item) => (
                    <article className="saved-row" key={item.title}>
                      <div className="saved-row-main">
                        <span className="saved-type">{item.type}</span>
                        <h3>{item.title}</h3>
                        <p className="saved-location">{item.location}</p>
                      </div>
                      <span className={`saved-status status-${item.status.toLowerCase()}`}>
                        {item.status}
                      </span>
                    </article>
                  ))}
                </div>
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
        </section>
      </main>
    </>
  )
}

export default Profile
