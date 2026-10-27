import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import './admin.css'
import { api } from '../modules/api'
import { useAuth } from '../modules/auth'

const PATHWAYS = ['Digital', 'Business', 'Media', 'Finance', 'Engineering']
const FILTER_PATHWAYS = ['All', ...PATHWAYS]

const emptyForm = {
  title: '',
  employer: 'Amazon',
  location: '',
  pathway: '',
  type: 'Apprenticeship',
  closingDate: '',
  applyUrl: '',
  summary: '',
}

function Admin() {
  const { user, loading: authLoading } = useAuth()

  // Expressions of interest
  const [items, setItems] = useState([])
  const [count, setCount] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  // Opportunities management
  const [opps, setOpps] = useState([])
  const [oppsError, setOppsError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)

  const isAdmin = !authLoading && user && user.isAdmin

  useEffect(() => {
    if (!isAdmin) return
    api.listInterest()
      .then((data) => {
        setItems(data.items || [])
        setCount(data.count || 0)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))

    api.listOpportunities()
      .then((data) => setOpps(data.items || []))
      .catch((err) => setOppsError(err.message))
  }, [isAdmin])

  // Wait for the session check, then require an admin account.
  if (authLoading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!user.isAdmin) return <Navigate to="/profile" replace />

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const addOpportunity = async (e) => {
    e.preventDefault()
    setOppsError('')
    if (!form.title || !form.employer || !form.location || !form.pathway || !form.applyUrl) {
      setOppsError('Title, employer, location, pathway and apply URL are required.')
      return
    }
    setBusy(true)
    try {
      const data = await api.createOpportunity(form)
      setOpps((prev) => [...prev, data.opportunity])
      setForm(emptyForm)
    } catch (err) {
      setOppsError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const removeOpportunity = async (id) => {
    setOppsError('')
    try {
      await api.deleteOpportunity(id)
      setOpps((prev) => prev.filter((o) => o.id !== id))
    } catch (err) {
      setOppsError(err.message)
    }
  }

  const shown = filter === 'All' ? items : items.filter((i) => i.pathway === filter)

  return (
    <>
      <main>
        <section className="admin-header">
          <div className="admin-header-content">
            <h1>Admin dashboard</h1>
            <p className="admin-tagline">
              Manage apprenticeship opportunities and review expressions of interest.
            </p>
          </div>
        </section>

        {/* Manage opportunities */}
        <section className="content-section">
          <h2 className="admin-section-title">Manage opportunities</h2>

          {oppsError && <div className="auth-error" role="alert">{oppsError}</div>}

          <form className="admin-opp-form" onSubmit={addOpportunity}>
            <div className="admin-form-grid">
              <div className="admin-field">
                <label htmlFor="title">Title</label>
                <input id="title" type="text" value={form.title} onChange={update('title')} />
              </div>
              <div className="admin-field">
                <label htmlFor="employer">Employer</label>
                <input id="employer" type="text" value={form.employer} onChange={update('employer')} />
              </div>
              <div className="admin-field">
                <label htmlFor="location">Location</label>
                <input id="location" type="text" value={form.location} onChange={update('location')} />
              </div>
              <div className="admin-field">
                <label htmlFor="pathway">Pathway</label>
                <select id="pathway" value={form.pathway} onChange={update('pathway')}>
                  <option value="">Choose…</option>
                  {PATHWAYS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="admin-field">
                <label htmlFor="closingDate">Closing date</label>
                <input id="closingDate" type="date" value={form.closingDate} onChange={update('closingDate')} />
              </div>
              <div className="admin-field">
                <label htmlFor="applyUrl">Apply URL</label>
                <input id="applyUrl" type="url" value={form.applyUrl} onChange={update('applyUrl')} placeholder="https://" />
              </div>
              <div className="admin-field admin-field-wide">
                <label htmlFor="summary">Summary</label>
                <input id="summary" type="text" value={form.summary} onChange={update('summary')} />
              </div>
            </div>
            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? 'Adding…' : 'Add opportunity'}
            </button>
          </form>

          {opps.length > 0 && (
            <div className="admin-table-wrap admin-opp-list">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Employer</th>
                    <th>Location</th>
                    <th>Pathway</th>
                    <th>Closes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {opps.map((o) => (
                    <tr key={o.id}>
                      <td>{o.title}</td>
                      <td>{o.employer}</td>
                      <td>{o.location}</td>
                      <td><span className="admin-pathway">{o.pathway}</span></td>
                      <td className="admin-date">{o.closingDate || '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-delete"
                          onClick={() => removeOpportunity(o.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Expressions of interest */}
        <section className="content-section admin-eoi-section">
          <h2 className="admin-section-title">Expressions of interest</h2>
          <div className="admin-toolbar">
            <span className="admin-count">{count} total {count === 1 ? 'entry' : 'entries'}</span>
            <div className="admin-filter">
              <label htmlFor="pathway-filter">Filter by pathway</label>
              <select
                id="pathway-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {FILTER_PATHWAYS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {loading && <p className="admin-status">Loading…</p>}
          {error && <div className="auth-error" role="alert">{error}</div>}

          {!loading && !error && shown.length === 0 && (
            <p className="admin-status">No expressions of interest yet.</p>
          )}

          {!loading && !error && shown.length > 0 && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>School / College</th>
                    <th>Pathway</th>
                    <th>Message</th>
                    <th>Received</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((item) => (
                    <tr key={item.id}>
                      <td>{item.fullName}</td>
                      <td>{item.email}</td>
                      <td>{item.school || '—'}</td>
                      <td><span className="admin-pathway">{item.pathway}</span></td>
                      <td className="admin-message">{item.message || '—'}</td>
                      <td className="admin-date">{item.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  )
}

export default Admin
