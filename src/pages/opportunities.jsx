import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import './opportunities.css'
import { api } from '../modules/api'
import { useAuth } from '../modules/auth'
import { Icon, PathwayIcon, closingLabel, daysUntil, formatDate } from '../modules/icons'
import { signInPath } from '../modules/return-to'

const PATHWAYS = ['All', 'Digital', 'Business', 'Media', 'Finance', 'Engineering']

const SORTS = [
  { id: 'closing', label: 'Closing soonest' },
  { id: 'title', label: 'Title A-Z' },
  { id: 'location', label: 'Location A-Z' },
]

function SkeletonCard() {
  return (
    <div className="opp-card opp-skeleton" aria-hidden="true">
      <span className="sk sk-icon" />
      <span className="sk sk-line sk-w70" />
      <span className="sk sk-line sk-w45" />
      <span className="sk sk-line sk-w90" />
      <span className="sk sk-line sk-w80" />
      <span className="sk sk-btns" />
    </div>
  )
}

function Opportunities() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  // Filters live in the web address (e.g. ?pathway=Digital&q=london) so they
  // survive a refresh, the back button, and can be shared as a link.
  const [params, setParams] = useSearchParams()
  const filter = PATHWAYS.includes(params.get('pathway')) ? params.get('pathway') : 'All'
  const query = params.get('q') || ''
  const sort = SORTS.some((s) => s.id === params.get('sort')) ? params.get('sort') : 'closing'
  const savedOnly = params.get('saved') === '1'

  const setParam = (key, value, fallback) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value === fallback || value === '' || value === false || value == null) next.delete(key)
      else next.set(key, value === true ? '1' : value)
      return next
    }, { replace: true })
  }
  const setFilter = (v) => setParam('pathway', v, 'All')
  const setQuery = (v) => setParam('q', v, '')
  const setSort = (v) => setParam('sort', v, 'closing')
  const setSavedOnly = (v) => setParam('saved', v, false)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    api.listOpportunities()
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const toggleSave = async (opp) => {
    if (!user) {
      navigate(signInPath())
      return
    }
    setBusyId(opp.id)
    try {
      if (opp.saved) {
        await api.unsaveOpportunity(opp.id)
      } else {
        await api.saveOpportunity(opp.id)
      }
      setItems((prev) => prev.map((o) => (o.id === opp.id ? { ...o, saved: !o.saved } : o)))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  // How many opportunities sit in each pathway (shown next to each filter).
  const counts = useMemo(() => {
    const c = { All: items.length }
    items.forEach((o) => { c[o.pathway] = (c[o.pathway] || 0) + 1 })
    return c
  }, [items])

  const savedCount = items.filter((o) => o.saved).length

  const q = query.trim().toLowerCase()
  const shown = items
    .filter((o) => {
      const matchesPathway = filter === 'All' || o.pathway === filter
      const matchesSaved = !savedOnly || o.saved
      const matchesQuery =
        q === '' ||
        o.title.toLowerCase().includes(q) ||
        o.employer.toLowerCase().includes(q) ||
        o.location.toLowerCase().includes(q)
      return matchesPathway && matchesSaved && matchesQuery
    })
    .sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title)
      if (sort === 'location') return a.location.localeCompare(b.location)
      const da = daysUntil(a.closingDate)
      const db = daysUntil(b.closingDate)
      return (da ?? Infinity) - (db ?? Infinity)
    })

  const hasFilters = filter !== 'All' || q !== '' || savedOnly
  const clearFilters = () => {
    setParams((prev) => {
      const next = new URLSearchParams()
      if (prev.get('sort')) next.set('sort', prev.get('sort'))
      return next
    }, { replace: true })
  }

  return (
    <main>
      <header className="opps-hero">
        <div className="opps-hero-inner">
          <h1>Current <span>apprenticeships</span></h1>
          <p className="opps-lead">
            Explore live apprenticeship opportunities, save the ones you like, and apply
            directly. {user ? '' : 'Sign in to save opportunities to your profile.'}
          </p>
          {!loading && !error && items.length > 0 && (
            <ul className="opps-hero-stats" aria-label="At a glance">
              <li><strong>{items.length}</strong> opportunities</li>
              <li><strong>{Object.keys(counts).length - 1}</strong> pathways</li>
              {user && <li><strong>{savedCount}</strong> saved by you</li>}
            </ul>
          )}
        </div>
      </header>

      {/* data-no-reveal: this page runs its own card animations */}
      <div className="opps-body" data-no-reveal>
        {/* Left filter sidebar */}
        <aside className="opps-sidebar" aria-label="Filter opportunities">
          <div className="opps-sidebar-inner">
            <label className="opps-field">
              <span className="opps-field-label">Search</span>
              <span className="opps-search-wrap">
                <Icon name="search" size={16} className="opps-search-icon" />
                <input
                  className="opps-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Title, employer or location"
                  aria-label="Search opportunities"
                />
                {query && (
                  <button
                    type="button"
                    className="opps-search-clear"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                  >
                    <Icon name="close" size={14} />
                  </button>
                )}
              </span>
            </label>

            <div className="opps-field">
              <span className="opps-field-label">Pathway</span>
              <ul className="opps-pathways">
                {PATHWAYS.map((p) => (
                  <li key={p}>
                    <button
                      type="button"
                      className={filter === p ? 'opps-pathway-btn is-active' : 'opps-pathway-btn'}
                      onClick={() => setFilter(p)}
                      aria-pressed={filter === p}
                    >
                      <span className="opps-pathway-icon"><PathwayIcon pathway={p} size={16} /></span>
                      <span className="opps-pathway-name">{p}</span>
                      <span className="opps-pathway-count">{counts[p] || 0}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {user && (
              <label className="opps-toggle">
                <input
                  type="checkbox"
                  checked={savedOnly}
                  onChange={(e) => setSavedOnly(e.target.checked)}
                />
                <span className="opps-toggle-track" aria-hidden="true"><span /></span>
                <span>Saved only</span>
              </label>
            )}
          </div>
        </aside>

        {/* Right results area */}
        <section className="opps-results" aria-live="polite">
          <div className="opps-toolbar">
            <p className="opps-count">
              <strong>{loading ? '-' : shown.length}</strong>{' '}
              {shown.length === 1 ? 'opportunity' : 'opportunities'}
              {filter !== 'All' && <> in <strong>{filter}</strong></>}
            </p>
            <label className="opps-sort">
              <Icon name="sort" size={15} />
              <span className="visually-hidden">Sort by</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
          </div>

          {hasFilters && (
            <div className="opps-chips">
              {filter !== 'All' && (
                <button type="button" className="opps-chip" onClick={() => setFilter('All')}>
                  {filter} <Icon name="close" size={12} />
                </button>
              )}
              {q !== '' && (
                <button type="button" className="opps-chip" onClick={() => setQuery('')}>
                  &ldquo;{query.trim()}&rdquo; <Icon name="close" size={12} />
                </button>
              )}
              {savedOnly && (
                <button type="button" className="opps-chip" onClick={() => setSavedOnly(false)}>
                  Saved only <Icon name="close" size={12} />
                </button>
              )}
              <button type="button" className="opps-chip-clear" onClick={clearFilters}>Clear all</button>
            </div>
          )}

          {error && <div className="auth-error" role="alert">{error}</div>}

          {loading && (
            <div className="opps-grid">
              {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {!loading && !error && shown.length === 0 && (
            <div className="opps-empty">
              <span className="opps-empty-icon"><Icon name="search" size={26} /></span>
              <h2>No opportunities match</h2>
              <p>Try a different search or pathway.</p>
              {hasFilters && (
                <button type="button" className="secondary-button" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>
          )}

          {!loading && (
            // Re-keying the grid replays the entrance animation when the filter changes.
            <div className="opps-grid" key={`${filter}-${sort}-${savedOnly}`}>
              {shown.map((opp, i) => {
                const closing = closingLabel(opp.closingDate)
                return (
                  <article className="opp-card" key={opp.id} style={{ '--i': Math.min(i, 8) }}>
                    <div className="opp-card-top">
                      <span className="opp-icon"><PathwayIcon pathway={opp.pathway} size={20} /></span>
                      <button
                        type="button"
                        className={opp.saved ? 'opp-save saved' : 'opp-save'}
                        onClick={() => toggleSave(opp)}
                        disabled={busyId === opp.id}
                        aria-pressed={opp.saved}
                        aria-label={opp.saved ? `Remove ${opp.title} from saved` : `Save ${opp.title}`}
                        title={opp.saved ? 'Saved' : 'Save'}
                      >
                        <Icon name="bookmark" size={18} data-filled={opp.saved || undefined} />
                      </button>
                    </div>

                    <p className="opp-type">{opp.pathway} · {opp.type}</p>
                    <h2 className="opp-title">
                      <Link to={`/opportunities/${opp.id}`}>{opp.title}</Link>
                    </h2>

                    <ul className="opp-meta">
                      <li><Icon name="building" size={14} />{opp.employer}</li>
                      <li><Icon name="pin" size={14} />{opp.location}</li>
                    </ul>

                    {opp.summary && <p className="opp-summary">{opp.summary}</p>}

                    {closing && (
                      <p className={`opp-closing is-${closing.tone}`}>
                        <Icon name="calendar" size={14} />
                        <span>Closes {formatDate(opp.closingDate)}</span>
                        <span className="opp-closing-pill">{closing.text}</span>
                      </p>
                    )}

                    <div className="opp-actions">
                      <Link className="opp-view" to={`/opportunities/${opp.id}`}>
                        View details
                        <Icon name="arrowRight" size={14} />
                      </Link>
                      <a
                        className="opp-apply"
                        href={opp.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Apply for ${opp.title} (opens in a new tab)`}
                      >
                        Apply
                        <Icon name="external" size={14} />
                      </a>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default Opportunities
