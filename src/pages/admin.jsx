import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import './admin.css'
import { api } from '../modules/api'
import { useAuth } from '../modules/auth'

function Admin() {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState([])
  const [count, setCount] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    if (authLoading || !user || !user.isAdmin) return
    api.listInterest()
      .then((data) => {
        setItems(data.items || [])
        setCount(data.count || 0)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [authLoading, user])

  // Wait for the session check, then require an admin account.
  if (authLoading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!user.isAdmin) return <Navigate to="/profile" replace />

  const pathways = ['All', 'Digital', 'Business', 'Media', 'Finance', 'Engineering']
  const shown = filter === 'All' ? items : items.filter((i) => i.pathway === filter)

  return (
    <>
      <main>
        <section className="admin-header">
          <div className="admin-header-content">
            <p className="eyebrow">Admin</p>
            <h1>Expressions of interest</h1>
            <p className="admin-tagline">
              Everyone who has registered their interest in a T Level placement with Amazon.
            </p>
          </div>
        </section>

        <section className="content-section">
          <div className="admin-toolbar">
            <span className="admin-count">{count} total {count === 1 ? 'entry' : 'entries'}</span>
            <div className="admin-filter">
              <label htmlFor="pathway-filter">Filter by pathway</label>
              <select
                id="pathway-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {pathways.map((p) => <option key={p} value={p}>{p}</option>)}
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
