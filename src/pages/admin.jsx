import { Fragment, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import './admin.css'
import { api } from '../modules/api'
import { useAuth } from '../modules/auth'
import { Icon } from '../modules/icons'
import { CHAT_STATUSES, formatChatTime } from '../modules/mentors'
import { AdminBoard, AdminChatHosts, AdminDatabase, AdminFeedback, AdminKpis, downloadCsv } from './admin-insights'
import { SignInRedirect } from '../modules/return-to'

const ROLE_NAMES = { student: 'Student', parent: 'Parent or carer', school: 'School or college' }

const PATHWAYS = ['Digital', 'Business', 'Media', 'Finance', 'Engineering']
const FILTER_PATHWAYS = ['All', ...PATHWAYS, 'Not sure yet', 'Several pathways']

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
  const [roleFilter, setRoleFilter] = useState('All')

  // Coffee chat requests
  const [chats, setChats] = useState([])
  const [chatsError, setChatsError] = useState('')
  const [chatsLoading, setChatsLoading] = useState(true)
  const [chatFilter, setChatFilter] = useState('All')
  const [chatBusy, setChatBusy] = useState(null)
  const [chatSaved, setChatSaved] = useState(null)
  const [editingChat, setEditingChat] = useState(null)
  const [chatDraft, setChatDraft] = useState({ confirmedTime: '', meetingLink: '' })

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

    api.listCoffeeChats()
      .then((data) => setChats(data.items || []))
      .catch((err) => setChatsError(err.message))
      .finally(() => setChatsLoading(false))
  }, [isAdmin])

  // Wait for the session check, then require an admin account.
  if (authLoading) return null
  if (!user) return <SignInRedirect />
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

  const updateChatStatus = async (id, status) => {
    setChatsError('')
    setChatBusy(id)
    try {
      const data = await api.updateCoffeeChatStatus(id, status)
      setChats((prev) => prev.map((c) => (c.id === id ? data.request : c)))
      setChatSaved(id)
      setTimeout(() => setChatSaved((cur) => (cur === id ? null : cur)), 1800)
    } catch (err) {
      setChatsError(err.message)
    } finally {
      setChatBusy(null)
    }
  }

  const startEditChat = (c) => {
    setChatsError('')
    setEditingChat(c.id)
    setChatDraft({ confirmedTime: c.confirmedTime || '', meetingLink: c.meetingLink || '' })
  }

  const saveChatDetails = async (e, id) => {
    e.preventDefault()
    setChatsError('')
    setChatBusy(id)
    try {
      const data = await api.updateCoffeeChatDetails(id, chatDraft)
      setChats((prev) => prev.map((c) => (c.id === id ? data.request : c)))
      setEditingChat(null)
      setChatSaved(id)
      setTimeout(() => setChatSaved((cur) => (cur === id ? null : cur)), 1800)
    } catch (err) {
      setChatsError(err.message)
    } finally {
      setChatBusy(null)
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

  const shown = items
    .filter((i) => filter === 'All' || i.pathway === filter)
    .filter((i) => roleFilter === 'All' || (i.role || 'student') === roleFilter)

  const exportInterest = () => downloadCsv(
    'launchpad-expressions-of-interest.csv',
    ['Who', 'Name', 'Email', 'School or college', 'Job title', 'Pathway', 'Message', 'Received'],
    shown.map((i) => [ROLE_NAMES[i.role] || 'Student', i.fullName, i.email, i.organisation || i.school || '', i.contactRole || '', i.pathway, i.message || '', i.createdAt]),
  )
  const shownChats = chatFilter === 'All' ? chats : chats.filter((c) => c.status === chatFilter)

  return (
    <>
      <main>
        <section className="admin-header">
          <div className="admin-header-content">
            <h1>Admin dashboard</h1>
            <p className="admin-tagline">
              Track the project's KPIs, manage opportunities, and review interest, coffee chats and feedback.
            </p>
          </div>
        </section>

        {/* KPIs */}
        <AdminKpis />

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
              <label htmlFor="role-filter">Who</label>
              <select id="role-filter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="All">Everyone</option>
                {Object.entries(ROLE_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
              <label htmlFor="pathway-filter">Pathway</label>
              <select
                id="pathway-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {FILTER_PATHWAYS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <button type="button" className="ak-csv" onClick={exportInterest} disabled={!shown.length}>
                <Icon name="download" size={14} /> Download CSV
              </button>
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
                    <th>Who</th>
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
                      <td><span className={`ak-role is-${item.role || 'student'}`}>{ROLE_NAMES[item.role] || 'Student'}</span></td>
                      <td>{item.fullName}</td>
                      <td>{item.email}</td>
                      <td>
                        {item.organisation || item.school || '-'}
                        {item.contactRole && <span className="ak-sub">{item.contactRole}</span>}
                      </td>
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

        {/* Who manages each person's coffee chats */}
        <AdminChatHosts />

        {/* Coffee chat requests */}
        <section className="content-section admin-eoi-section">
          <h2 className="admin-section-title">Coffee chat requests</h2>
          <div className="admin-toolbar">
            <span className="admin-count">
              {chats.length} total {chats.length === 1 ? 'request' : 'requests'}
              {chats.some((c) => c.status === 'Requested') && (
                <> · {chats.filter((c) => c.status === 'Requested').length} waiting</>
              )}
            </span>
            <div className="admin-filter">
              <label htmlFor="chat-filter">Filter by status</label>
              <select id="chat-filter" value={chatFilter} onChange={(e) => setChatFilter(e.target.value)}>
                {['All', ...CHAT_STATUSES].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {chatsLoading && <p className="admin-status">Loading…</p>}
          {chatsError && <div className="auth-error" role="alert">{chatsError}</div>}

          {!chatsLoading && !chatsError && chats.length === 0 && (
            <p className="admin-status">No coffee chat requests yet.</p>
          )}

          {!chatsLoading && chats.length > 0 && shownChats.length === 0 && (
            <p className="admin-status">No requests with this status.</p>
          )}

          {!chatsLoading && shownChats.length > 0 && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>With</th>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Email</th>
                    <th>Asked for</th>
                    <th>Topic</th>
                    <th>Message</th>
                    <th>Received</th>
                    <th>Status</th>
                    <th>Meeting</th>
                  </tr>
                </thead>
                <tbody>
                  {shownChats.map((c) => (
                    <Fragment key={c.id}>
                    <tr className={editingChat === c.id ? 'is-editing' : ''}>
                      <td><span className="admin-pathway">{c.mentor}</span></td>
                      <td>{c.fullName}</td>
                      <td>
                        {c.under18 === null || c.under18 === undefined ? '-' : c.under18 ? (
                          <span className="ak-u18" title="Under 18 - a parent or carer knows about the chat">
                            Under 18{c.guardianAware ? ' · parent/carer aware' : ''}
                          </span>
                        ) : '18+'}
                      </td>
                      <td>{c.email}</td>
                      <td>{c.preferredTime}</td>
                      <td>{c.topic || '-'}</td>
                      <td className="admin-message">{c.message || '-'}</td>
                      <td className="admin-date">{c.createdAt}</td>
                      <td>
                        <div className="admin-status-cell">
                          <select
                            className={`admin-status-select is-${c.status.toLowerCase()}`}
                            value={c.status}
                            onChange={(e) => updateChatStatus(c.id, e.target.value)}
                            disabled={chatBusy === c.id}
                            aria-label={`Status for ${c.fullName}'s chat with ${c.mentor}`}
                          >
                            {CHAT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                          {chatSaved === c.id && <span className="admin-saved" role="status">Saved</span>}
                        </div>
                      </td>
                      <td className="admin-meeting">
                        {c.confirmedTime || c.meetingLink ? (
                          <span className="admin-meeting-info">
                            {c.confirmedTime && <span>{formatChatTime(c.confirmedTime)}</span>}
                            {c.meetingLink && (
                              <a href={c.meetingLink} target="_blank" rel="noopener noreferrer">Meeting link</a>
                            )}
                          </span>
                        ) : (
                          <span className="admin-muted">Not set</span>
                        )}
                        <button
                          type="button"
                          className="admin-edit"
                          onClick={() => (editingChat === c.id ? setEditingChat(null) : startEditChat(c))}
                          aria-expanded={editingChat === c.id}
                        >
                          {editingChat === c.id ? 'Close' : c.confirmedTime || c.meetingLink ? 'Edit' : 'Set time'}
                        </button>
                      </td>
                    </tr>
                    {editingChat === c.id && (
                      <tr className="admin-edit-row">
                        <td colSpan={10}>
                          <form className="admin-chat-form" onSubmit={(e) => saveChatDetails(e, c.id)}>
                            <div className="admin-field">
                              <label htmlFor={`chat-time-${c.id}`}>Date and time</label>
                              <input
                                id={`chat-time-${c.id}`}
                                type="datetime-local"
                                value={chatDraft.confirmedTime}
                                onChange={(e) => setChatDraft({ ...chatDraft, confirmedTime: e.target.value })}
                              />
                            </div>
                            <div className="admin-field admin-field-grow">
                              <label htmlFor={`chat-link-${c.id}`}>Meeting link</label>
                              <input
                                id={`chat-link-${c.id}`}
                                type="url"
                                placeholder="https://"
                                value={chatDraft.meetingLink}
                                onChange={(e) => setChatDraft({ ...chatDraft, meetingLink: e.target.value })}
                              />
                            </div>
                            <div className="admin-chat-actions">
                              <button type="submit" className="primary-button" disabled={chatBusy === c.id}>
                                {chatBusy === c.id ? 'Saving…' : 'Save'}
                              </button>
                              <button type="button" className="secondary-button" onClick={() => setEditingChat(null)}>
                                Cancel
                              </button>
                            </div>
                            <p className="admin-chat-hint">
                              {c.fullName} will see this on their Coffee chats page and profile. Saving a time
                              on a waiting request marks it as Confirmed. Leave both empty to clear them.
                            </p>
                          </form>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Question board moderation */}
        <AdminBoard />

        {/* Page feedback */}
        <AdminFeedback />

        {/* Download a copy of the database */}
        <AdminDatabase />
      </main>
    </>
  )
}

export default Admin
