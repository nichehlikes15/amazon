import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './opportunities.css'
import { api } from '../modules/api'
import { useAuth } from '../modules/auth'

const PATHWAYS = ['All', 'Digital', 'Business', 'Media', 'Finance', 'Engineering']

function formatDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d)) return iso
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Opportunities() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    api.listOpportunities()
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const toggleSave = async (opp) => {
    if (!user) {
      // Not logged in - send them to login.
      window.location.href = '/login'
      return
    }
    setBusyId(opp.id)
    try {
      if (opp.saved) {
        await api.unsaveOpportunity(opp.id)
      } else {
        await api.saveOpportunity(opp.id)
      }
      setItems((prev) =>
        prev.map((o) => (o.id === opp.id ? { ...o, saved: !o.saved } : o)),
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const q = query.trim().toLowerCase()
  const shown = items.filter((o) => {
    const matchesPathway = filter === 'All' || o.pathway === filter
    const matchesQuery =
      q === '' ||
      o.title.toLowerCase().includes(q) ||
      o.employer.toLowerCase().includes(q) ||
      o.location.toLowerCase().includes(q)
    return matchesPathway && matchesQuery
  })

  return (
    <>
      <main>
        <section className="opps-header">
          <div className="opps-header-content">
            <p className="eyebrow">Opportunities</p>
            <h1>Current apprenticeships</h1>
            <p className="opps-tagline">
              Explore live apprenticeship opportunities, save the ones you like, and apply
              directly. {user ? '' : 'Sign in to save opportunities to your profile.'}
            </p>
          </div>
        </section>

        <section className="content-section">
          <div className="opps-toolbar">
            <span className="opps-count">{shown.length} {shown.length === 1 ? 'opportunity' : 'opportunities'}</span>
            <div className="opps-controls">
              <input
                className="opps-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, employer or location"
                aria-label="Search opportunities"
              />
              <div className="opps-filter">
                <label htmlFor="pathway-filter">Pathway</label>
                <select id="pathway-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
                  {PATHWAYS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          {loading && <p className="opps-status">Loading…</p>}
          {error && <div className="auth-error" role="alert">{error}</div>}

          {!loading && !error && shown.length === 0 && (
            <p className="opps-status">No opportunities match your search.</p>
          )}

          <div className="opps-grid">
            {shown.map((opp) => (
              <article className="opp-card" key={opp.id}>
                <div className="opp-card-top">
                  <span className="opp-pathway">{opp.pathway}</span>
                  <button
                    type="button"
                    className={opp.saved ? 'opp-save saved' : 'opp-save'}
                    onClick={() => toggleSave(opp)}
                    disabled={busyId === opp.id}
                    aria-pressed={opp.saved}
                  >
                    {opp.saved ? '★ Saved' : '☆ Save'}
                  </button>
                </div>
                <h2 className="opp-title">{opp.title}</h2>
                <p className="opp-employer">{opp.employer} · {opp.location}</p>
                {opp.summary && <p className="opp-summary">{opp.summary}</p>}
                <div className="opp-meta">
                  <span className="opp-type">{opp.type}</span>
                  {opp.closingDate && (
                    <span className="opp-closing">Closes {formatDate(opp.closingDate)}</span>
                  )}
                </div>
                <div className="opp-actions">
                  <Link className="opp-view" to={`/opportunities/${opp.id}`}>
                    View details
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="11" cy="11" r="7" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </Link>
                  <a
                    className="opp-apply"
                    href={opp.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Apply
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14" />
                      <path d="M13 6l6 6-6 6" />
                    </svg>
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}

export default Opportunities
