import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './coffee-chats.css'
import '../modules/coffee-chat-list.css'
import './host-chats.css'
import { api } from '../modules/api'
import { useAuth } from '../modules/auth'
import { Icon } from '../modules/icons'
import { CHAT_STATUSES, formatChatTime } from '../modules/mentors'
import { PersonPhoto } from '../modules/person-photo'
import { SignInRedirect } from '../modules/return-to'

/*
  Manage my coffee chats (/alumni/coffee-chats/manage).
  For the people students book coffee chats with. An admin links each person
  to their account (Admin page, "Coffee chat hosts"). The person can then
  confirm a time, add a meeting link and update the status of THEIR OWN
  requests here. They can't open the admin page or see anyone else's requests:
  the server checks this on every request, not just this page.
*/

// What the host sees for each status ("Requested" reads better as "Waiting").
const STATUS_LABEL = { Requested: 'Waiting', Confirmed: 'Confirmed', Completed: 'Completed', Cancelled: 'Cancelled' }
const TABS = [...CHAT_STATUSES, 'All']

function NotHost() {
  return (
    <main className="cc hc">
      <header className="cc-hero">
        <div className="cc-hero-inner">
          <h1>This page is for <span>coffee chat hosts</span></h1>
          <p className="cc-lead">
            It&apos;s where the people on the Coffee chats page confirm and update their own chat requests.
            If you host coffee chats, ask a Launchpad admin to link your account.
          </p>
          <p className="hc-hero-link">
            <Link to="/alumni/coffee-chats">Back to coffee chats <Icon name="arrowRight" size={14} /></Link>
          </p>
        </div>
      </header>
    </main>
  )
}

function ChatRow({ chat, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ confirmedTime: chat.confirmedTime || '', meetingLink: chat.meetingLink || '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const done = (request) => {
    onSaved(request)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  const changeStatus = async (status) => {
    setError('')
    setBusy(true)
    try {
      const data = await api.hostUpdateChatStatus(chat.id, status)
      done(data.request)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const openForm = () => {
    setError('')
    setDraft({ confirmedTime: chat.confirmedTime || '', meetingLink: chat.meetingLink || '' })
    setEditing(true)
  }

  const saveDetails = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await api.hostUpdateChatDetails(chat.id, draft)
      setEditing(false)
      done(data.request)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const age = chat.under18 === null || chat.under18 === undefined
    ? 'Not given'
    : chat.under18
      ? `Under 18${chat.guardianAware ? ' · a parent or carer knows' : ''}`
      : '18 or over'

  return (
    <li className="hc-item">
      <div className="hc-main">
        <div className="hc-top">
          <h3>{chat.fullName}</h3>
          <span className={`ccl-status is-${chat.status.toLowerCase()}`}>{STATUS_LABEL[chat.status] || chat.status}</span>
        </div>
        <p className="hc-received">Sent {chat.createdAt}</p>

        <dl className="hc-facts">
          <div><dt>Asked for</dt><dd>{chat.preferredTime}</dd></div>
          <div><dt>Topic</dt><dd>{chat.topic || 'Not given'}</dd></div>
          <div><dt>Age</dt><dd>{chat.under18 ? <span className="hc-u18">{age}</span> : age}</dd></div>
          <div className="hc-wide"><dt>Their message</dt><dd>{chat.message || 'No message'}</dd></div>
        </dl>

        <p className="hc-contact">
          <Icon name={chat.linkedAccount ? 'user' : 'mail'} size={15} />
          {chat.linkedAccount ? (
            <span>They&apos;ll see the time and meeting link in their Launchpad account.</span>
          ) : (
            <span>
              Sent while signed out, so email them the time and link:{' '}
              <a href={`mailto:${chat.email}`}>{chat.email}</a>
            </span>
          )}
        </p>
      </div>

      <div className="hc-side">
        <div className="hc-field">
          <label htmlFor={`hc-status-${chat.id}`}>Status</label>
          <select
            id={`hc-status-${chat.id}`}
            value={chat.status}
            onChange={(e) => changeStatus(e.target.value)}
            disabled={busy}
          >
            {CHAT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>

        <div className="hc-meeting">
          <p className="hc-meeting-label">Meeting</p>
          {chat.confirmedTime || chat.meetingLink ? (
            <>
              {chat.confirmedTime && <p className="hc-meeting-time"><Icon name="calendar" size={15} /> {formatChatTime(chat.confirmedTime)}</p>}
              {chat.meetingLink && (
                <p><a href={chat.meetingLink} target="_blank" rel="noopener noreferrer">Meeting link <Icon name="external" size={13} /></a></p>
              )}
            </>
          ) : (
            <p className="hc-muted">Not set yet</p>
          )}
          {!editing && (
            <button type="button" className="hc-text-btn" onClick={openForm}>
              {chat.confirmedTime || chat.meetingLink ? 'Change time or link' : 'Set a time and link'}
            </button>
          )}
        </div>

        {editing && (
          <form className="hc-form" onSubmit={saveDetails}>
            <div className="hc-field">
              <label htmlFor={`hc-time-${chat.id}`}>Date and time</label>
              <input
                id={`hc-time-${chat.id}`}
                type="datetime-local"
                value={draft.confirmedTime}
                onChange={(e) => setDraft({ ...draft, confirmedTime: e.target.value })}
              />
            </div>
            <div className="hc-field">
              <label htmlFor={`hc-link-${chat.id}`}>Meeting link</label>
              <input
                id={`hc-link-${chat.id}`}
                type="url"
                placeholder="https://"
                value={draft.meetingLink}
                onChange={(e) => setDraft({ ...draft, meetingLink: e.target.value })}
              />
            </div>
            <p className="hc-hint">Saving a time on a waiting request marks it as Confirmed. Leave both empty to clear them.</p>
            <div className="hc-form-actions">
              <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
              <button type="button" className="secondary-button" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        )}

        {saved && <p className="hc-saved" role="status"><Icon name="check" size={14} /> Saved</p>}
        {error && <p className="hc-error" role="alert">{error}</p>}
      </div>
    </li>
  )
}

function HostChats() {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState([])
  const [host, setHost] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [forbidden, setForbidden] = useState(false)
  const [tab, setTab] = useState('Requested')
  const [notice, setNotice] = useState('')

  const isHost = Boolean(user && user.chatHost)

  useEffect(() => {
    if (!isHost) return undefined
    let live = true
    api.hostCoffeeChats()
      .then((d) => {
        if (!live) return
        setItems(d.items || [])
        setHost(d.host || '')
        // Start on the waiting requests, or show everything if none are waiting.
        if (!(d.items || []).some((c) => c.status === 'Requested')) setTab('All')
      })
      .catch((err) => {
        if (!live) return
        if (/only for coffee chat hosts/i.test(err.message)) setForbidden(true)
        else setError(err.message)
      })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [isHost])

  if (authLoading) return <main className="cc hc"><p className="hc-loading">Loading…</p></main>
  if (!user) return <SignInRedirect />
  if (!isHost || forbidden) return <NotHost />

  const name = host || user.chatHost
  const firstName = name.split(' ')[0]
  const count = (s) => (s === 'All' ? items.length : items.filter((c) => c.status === s).length)
  const shown = tab === 'All' ? items : items.filter((c) => c.status === tab)
  const onSaved = (req) => {
    const before = items.find((c) => c.id === req.id)
    setItems((prev) => prev.map((c) => (c.id === req.id ? req : c)))
    // If it no longer fits the tab you're on, say where it went instead of it just vanishing.
    if (before && before.status !== req.status && tab !== 'All' && tab !== req.status) {
      setNotice(`Saved. ${req.fullName}'s chat is now in ${STATUS_LABEL[req.status]}.`)
      setTimeout(() => setNotice(''), 4000)
    }
  }

  return (
    <main className="cc hc">
      <header className="cc-hero">
        <div className="cc-hero-inner">
          <PersonPhoto name={name} className="hc-photo" />
          <h1>Your <span>coffee chats</span></h1>
          <p className="cc-lead">
            Requests people have sent to {firstName}. Confirm a time, add a meeting link, and mark each chat as
            completed afterwards.
          </p>
          <ul className="cc-hero-facts">
            <li><Icon name="clock" size={15} /> {count('Requested')} waiting</li>
            <li><Icon name="calendar" size={15} /> {count('Confirmed')} confirmed</li>
            <li><Icon name="check" size={15} /> {count('Completed')} completed</li>
          </ul>
        </div>
      </header>

      <section className="cc-section hc-section">
        <div className="hc-tabs" role="group" aria-label="Show requests by status">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={tab === t ? 'hc-tab is-on' : 'hc-tab'}
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
            >
              {t === 'All' ? 'All' : STATUS_LABEL[t]} <span>{count(t)}</span>
            </button>
          ))}
        </div>

        {loading && (
          <ul className="hc-list" aria-hidden="true">
            {[0, 1].map((i) => <li key={i} className="hc-item hc-skeleton"><span /><span /><span /></li>)}
          </ul>
        )}
        {error && <p className="hc-error" role="alert">{error}</p>}
        <p className={notice ? 'hc-notice is-on' : 'hc-notice'} role="status">{notice}</p>

        {!loading && !error && items.length === 0 && (
          <p className="hc-empty">No one has requested a chat with you yet. New requests will show here.</p>
        )}
        {!loading && !error && items.length > 0 && shown.length === 0 && (
          <p className="hc-empty">No {tab === 'All' ? '' : STATUS_LABEL[tab].toLowerCase()} requests.</p>
        )}

        {!loading && shown.length > 0 && (
          <ul className="hc-list">
            {shown.map((c) => <ChatRow key={c.id} chat={c} onSaved={onSaved} />)}
          </ul>
        )}
      </section>

      <section className="cc-section hc-safe">
        <div className="cc-head">
          <h2 className="cc-h2">Keeping chats safe</h2>
        </div>
        <ul className="hc-safe-list">
          <li><Icon name="video" size={18} /><span>Hold every chat on the meeting link you add here, not on personal apps or phone numbers.</span></li>
          <li><Icon name="shield" size={18} /><span>Many students are under 18. Don&apos;t ask for or share personal contact details or social media.</span></li>
          <li><Icon name="heart" size={18} /><span>If anything worries you, tell the Launchpad team straight away. <Link to="/safeguarding">How to get help</Link></span></li>
        </ul>
      </section>
    </main>
  )
}

export default HostChats
