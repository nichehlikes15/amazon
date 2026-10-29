import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import './coffee-chats.css'
import { api } from '../modules/api'
import { useAuth } from '../modules/auth'
import { Icon } from '../modules/icons'
import { MENTORS, CHAT_TOPICS } from '../modules/mentors'
import { PersonPhoto } from '../modules/person-photo'
import { CoffeeChatList } from '../modules/coffee-chat-list'

const STEPS = [
  { title: 'Pick someone', text: 'Choose a student, alum or Amazon buddy who matches what you want to know.' },
  { title: 'Choose a time', text: 'Pick one of their free slots and tell them what you would like to talk about.' },
  { title: 'Have a chat', text: 'The team will be in touch to confirm. Chats are relaxed and last about 15 minutes.' },
]

function Avatar({ name, size = 'md' }) {
  return <PersonPhoto name={name} className={`cc-avatar cc-avatar-${size}`} />
}

/* ---------- Request form (slide-in panel) ---------- */
function RequestPanel({ mentor, user, onClose, onSent }) {
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    preferredTime: mentor.times.length === 1 ? mentor.times[0] : '',
    topic: mentor.topics[0] || '',
    message: '',
    ageGroup: '',
    guardianAware: false,
    consent: false,
  })
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(null)
  const [closing, setClosing] = useState(false)
  const firstField = useRef(null)

  // Fade/slide out before unmounting so closing is smooth too.
  const close = () => {
    setClosing(true)
    setTimeout(onClose, 260)
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => firstField.current?.focus(), 120)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      clearTimeout(t)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.fullName.trim() || !form.email.trim()) {
      setError('Please add your name and email.')
      return
    }
    if (!form.preferredTime) {
      setError('Please choose a time.')
      return
    }
    if (!form.ageGroup) {
      setError("Please tell us if you're under 18.")
      return
    }
    if (form.ageGroup === 'under18' && !form.guardianAware) {
      setError("Please check that a parent or carer knows about the chat.")
      return
    }
    if (!form.consent) {
      setError('Please tick the box to agree to the privacy notice and the staying safe guidance.')
      return
    }
    setSending(true)
    try {
      const data = await api.requestCoffeeChat({ mentor: mentor.name, ...form })
      setSent(data.request)
      onSent(data.request)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return createPortal(
    <div className={closing ? 'cc-overlay is-closing' : 'cc-overlay'} onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}>
      <div className="cc-panel" role="dialog" aria-modal="true" aria-labelledby="cc-panel-title">
        <div className="cc-panel-head">
          <Avatar name={mentor.name} />
          <div>
            <p className="cc-panel-kicker">Coffee chat with</p>
            <h2 id="cc-panel-title">{mentor.name}</h2>
            <p className="cc-panel-role">{mentor.role}</p>
          </div>
          <button type="button" className="cc-panel-close" onClick={close} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>

        {sent ? (
          <div className="cc-sent" role="status">
            <span className="cc-sent-icon"><Icon name="check" size={28} /></span>
            <h3>Request sent</h3>
            <p>
              You asked {mentor.firstName} for a chat on <strong>{sent.preferredTime}</strong>
              {sent.topic ? <> about <strong>{sent.topic.toLowerCase()}</strong></> : null}.
              The team will be in touch at <strong>{sent.email}</strong> to confirm.
            </p>
            <button type="button" className="primary-button" onClick={close}>Done</button>
          </div>
        ) : (
          <form className="cc-form" onSubmit={submit} noValidate>
            {error && <div className="cc-error" role="alert">{error}</div>}

            <div className="cc-form-row">
              <label className="cc-field">
                <span>Your name</span>
                <input ref={firstField} type="text" value={form.fullName} onChange={update('fullName')} autoComplete="name" />
              </label>
              <label className="cc-field">
                <span>Email</span>
                <input type="email" value={form.email} onChange={update('email')} autoComplete="email" />
              </label>
            </div>

            <fieldset className="cc-fieldset">
              <legend>When suits you?</legend>
              <div className="cc-options">
                {mentor.times.map((t) => (
                  <label key={t} className={form.preferredTime === t ? 'cc-option is-on' : 'cc-option'}>
                    <input type="radio" name="time" value={t} checked={form.preferredTime === t} onChange={update('preferredTime')} />
                    <Icon name="calendar" size={15} />
                    {t}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="cc-fieldset">
              <legend>What would you like to talk about?</legend>
              <div className="cc-options">
                {CHAT_TOPICS.map((t) => (
                  <label key={t} className={form.topic === t ? 'cc-option is-on' : 'cc-option'}>
                    <input type="radio" name="topic" value={t} checked={form.topic === t} onChange={update('topic')} />
                    {t}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="cc-field">
              <span>Anything else? <em>(optional)</em></span>
              <textarea rows="4" value={form.message} onChange={update('message')} maxLength={1000}
                placeholder="A question you'd like answered, or anything they should know first." />
            </label>

            <fieldset className="cc-fieldset">
              <legend>Are you under 18?</legend>
              <div className="cc-options">
                {[['under18', "Yes, I'm under 18"], ['18+', "No, I'm 18 or over"]].map(([value, label]) => (
                  <label key={value} className={form.ageGroup === value ? 'cc-option is-on' : 'cc-option'}>
                    <input type="radio" name="ageGroup" value={value} checked={form.ageGroup === value}
                      onChange={() => setForm({ ...form, ageGroup: value, guardianAware: value === 'under18' ? form.guardianAware : false })} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            {form.ageGroup === 'under18' && (
              <label className="cc-check">
                <input type="checkbox" checked={form.guardianAware}
                  onChange={(e) => setForm({ ...form, guardianAware: e.target.checked })} />
                <span className="cc-check-box" aria-hidden="true"><Icon name="check" size={12} /></span>
                <span>A parent or carer knows I'm booking this chat.</span>
              </label>
            )}

            <label className="cc-check">
              <input type="checkbox" checked={form.consent}
                onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
              <span className="cc-check-box" aria-hidden="true"><Icon name="check" size={12} /></span>
              <span>
                I agree to the <Link to="/privacy">privacy notice</Link> and I've read how to{' '}
                <Link to="/safeguarding">stay safe in coffee chats</Link>.
              </span>
            </label>

            <div className="cc-form-actions">
              <button type="button" className="secondary-button" onClick={close}>Cancel</button>
              <button type="submit" className="primary-button" disabled={sending}>
                {sending ? 'Sending…' : 'Send request'}
                {!sending && <Icon name="arrowRight" size={15} />}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}

/* ---------- Page ---------- */
function CoffeeChats() {
  const { user } = useAuth()
  const [selected, setSelected] = useState(null)
  const [mine, setMine] = useState([])

  useEffect(() => {
    if (!user) { setMine([]); return undefined }
    const load = () => api.myCoffeeChats().then((d) => setMine(d.items || [])).catch(() => {})
    load()
    // Pick up status changes made by the team when you come back to this tab.
    const onFocus = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onFocus)
    return () => document.removeEventListener('visibilitychange', onFocus)
  }, [user])

  const onSent = (req) => {
    if (user) setMine((prev) => [req, ...prev])
  }

  const onUpdate = (req) => setMine((prev) => prev.map((r) => (r.id === req.id ? req : r)))

  return (
    <main className="cc">
      {/* Hero */}
      <header className="cc-hero">
        <div className="cc-hero-inner">
          <h1>Book a <span>coffee chat</span></h1>
          <p className="cc-lead">
            Have an informal chat with a current T Level student, a placement alum, or an
            Amazon buddy. Ask anything - there are no silly questions.
          </p>
          <ul className="cc-hero-facts">
            <li><Icon name="clock" size={15} /> About 15 minutes</li>
            <li><Icon name="check" size={15} /> Free and informal</li>
            <li><Icon name="building" size={15} /> Students, alumni and Amazon buddies</li>
          </ul>
        </div>
      </header>

      {/* How it works */}
      <section className="cc-section">
        <div className="cc-head">
          <h2 className="cc-h2">How it works</h2>
        </div>
        <ol className="cc-steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="cc-step-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* People */}
      <section className="cc-section">
        <div className="cc-head">
          <h2 className="cc-h2">Pick someone to chat with</h2>
          <p className="cc-intro">Choose a person below and request a time that suits you.</p>
        </div>

        <ul className="cc-people">
          {MENTORS.map((m) => (
            <li className="cc-person" key={m.name}>
              <div className="cc-person-top">
                <Avatar name={m.name} size="lg" />
                <div>
                  <h3>{m.name}</h3>
                  <p className="cc-role">{m.role}</p>
                </div>
              </div>
              <p className="cc-about">{m.about}</p>

              <dl className="cc-details">
                <div>
                  <dt>Good to ask about</dt>
                  <dd>
                    <ul className="cc-tags">
                      {m.topics.map((t) => <li key={t}>{t}</li>)}
                    </ul>
                  </dd>
                </div>
                <div>
                  <dt>Free on</dt>
                  <dd className="cc-times">
                    {m.times.map((t) => (
                      <span key={t}><Icon name="calendar" size={14} />{t}</span>
                    ))}
                  </dd>
                </div>
              </dl>

              <button type="button" className="cc-request" onClick={() => setSelected(m)}>
                Request a chat with {m.firstName}
                <Icon name="arrowRight" size={15} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Your requests */}
      {user && mine.length > 0 && (
        <section className="cc-section">
          <div className="cc-head">
            <h2 className="cc-h2">Your requests</h2>
          </div>
          <div className="cc-mine-wrap">
            <CoffeeChatList items={mine} onUpdate={onUpdate} />
          </div>
        </section>
      )}

      {!user && (
        <section className="cc-signin">
          <p>
            <Link to="/login">Sign in</Link> to see the chats you've requested in one place.
          </p>
        </section>
      )}

      {selected && (
        <RequestPanel
          mentor={selected}
          user={user}
          onClose={() => setSelected(null)}
          onSent={onSent}
        />
      )}
    </main>
  )
}

export default CoffeeChats
