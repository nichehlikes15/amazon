import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useMemo, useRef, useState } from 'react'
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

/* ------------------------------------------------------------------
   Content (placeholders: replace with real volunteers)
   Days use 0 = Sunday, 1 = Monday ... 6 = Saturday.
------------------------------------------------------------------- */

const amazonians = [
  { name: 'Amara', role: 'Software Development Engineer', team: 'AWS', topics: ['Coding', 'Apprenticeships'], days: [1, 3], slots: ['10:00', '10:30', '14:00'] },
  { name: 'Jay', role: 'Operations Manager', team: 'Fulfilment centres', topics: ['Leadership', 'Operations'], days: [2], slots: ['13:00', '13:30', '15:00'] },
  { name: 'Priya', role: 'Financial Analyst', team: 'Amazon Finance', topics: ['Finance', 'Career changes'], days: [4], slots: ['09:30', '11:00', '16:00'] },
  { name: 'Sam', role: 'Data Analyst Apprentice', team: 'Retail', topics: ['Apprenticeships', 'Data'], days: [5], slots: ['09:00', '09:30', '10:00'] },
  { name: 'Leon', role: 'HR Business Partner', team: 'People Experience', topics: ['Applying to Amazon', 'Interviews'], days: [3], slots: ['14:00', '14:30', '15:30'] },
  { name: 'Hana', role: 'Product Manager', team: 'Prime Video', topics: ['Product', 'Tech careers'], days: [2, 4], slots: ['12:00', '16:30'] },
]

const facts = [
  { title: '1:1 and informal', text: 'Just you and one Amazonian. It is a friendly conversation, not an interview.' },
  { title: 'About 15 minutes', text: 'Short enough to fit around school, college or work.' },
  { title: 'Open to anyone', text: 'Students, parents, teachers, career changers. No experience needed.' },
]

const askAbout = [
  'What a normal day looks like in your job',
  'How you got your role at Amazon',
  'What apprenticeships and placements are like',
  'Which skills or subjects helped you most',
  'How the Leadership Principles work day to day',
  'Tips for applying and interviews',
]

const steps = [
  { title: 'Choose an Amazonian', text: 'Pick someone whose role or team interests you.' },
  { title: 'Pick a day and time', text: 'Choose one of their free slots and tell them what you would like to chat about.' },
  { title: 'Have your chat', text: 'They will confirm by email, then you meet for a relaxed 15-minute chat.' },
]

const tips = [
  { title: 'Before', text: 'Look at their role and write down two or three questions you would like to ask.' },
  { title: 'During', text: 'Be yourself, listen and ask follow-up questions. It is fine to take notes.' },
  { title: 'After', text: 'Say thank you, and think about what you learned and what you want to explore next.' },
]

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------- */

const DAY_NAMES = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']

const formatDate = (date) =>
  date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

// Turns 'YYYY-MM-DD' into a local date (avoids time zone shifts).
const parseDate = (text) => {
  const [year, month, day] = text.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Date value used in the form, e.g. '2026-10-26'.
const toValue = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

// Upcoming dates in the next two weeks that fall on this person's days.
function upcomingDates(days) {
  const dates = []
  const today = new Date()
  for (let offset = 1; offset <= 14; offset += 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)
    if (days.includes(date.getDay())) dates.push(date)
  }
  return dates
}

const listDays = (days) => days.map((day) => DAY_NAMES[day]).join(' and ')

const emptyForm = { person: '', date: '', time: '', name: '', email: '', message: '' }

/* ------------------------------------------------------------------
   Page
------------------------------------------------------------------- */

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

  const formRef = useRef(null)
  const [form, setForm] = useState(emptyForm)
  const [sent, setSent] = useState(null)

  const selected = amazonians.find((person) => person.name === form.person)
  const dateOptions = useMemo(() => (selected ? upcomingDates(selected.days) : []), [selected])

  const chooseAmazonian = (name) => {
    setSent(null)
    setForm((current) => ({ ...current, person: name, date: '', time: '' }))
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const update = (event) => {
    const { name, value } = event.target
    setForm((current) => {
      // Changing the person or day resets the choices that depend on it.
      if (name === 'person') return { ...current, person: value, date: '', time: '' }
      if (name === 'date') return { ...current, date: value, time: '' }
      return { ...current, [name]: value }
    })
  }

  // No backend for chats yet: this only shows a confirmation and sends nothing.
  const submit = (event) => {
    event.preventDefault()
    setSent({ person: form.person, date: formatDate(parseDate(form.date)), time: form.time })
    setForm(emptyForm)
  }

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
    <>
      <main>
        <section className="cc-header" aria-labelledby="cc-heading">
          <div className="cc-header-content">
            <p className="eyebrow">Community</p>
            <h1 id="cc-heading">Have a <span>coffee chat</span> with an Amazonian</h1>
            <p className="cc-tagline">
              A coffee chat is a relaxed 1:1 talk with someone who works at Amazon. Find
              out what a career here is really like, or just have a general chat. There
              are no silly questions.
            </p>
            <div className="cc-actions">
              <a className="primary-button" href="#amazonians">Who is available</a>
              <a className="secondary-button cc-secondary-on-dark" href="/#events">Events at Amazon</a>
            </div>
          </div>
        </section>

        {/* What is a coffee chat */}
        <section className="content-section" aria-labelledby="what-heading">
          <p className="eyebrow">What is a coffee chat?</p>
          <h2 id="what-heading">A friendly conversation, not an interview</h2>
          <div className="cc-fact-grid">
            {facts.map((item) => (
              <article className="cc-fact" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>

          <h2 className="cc-subheading" id="ask-heading">Things you could ask</h2>
          <ul className="cc-ask-list" aria-labelledby="ask-heading">
            {askAbout.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        {/* Who is available */}
        <section className="cc-band cc-anchor" id="amazonians" aria-labelledby="amazonians-heading">
          <div className="content-section">
          <p className="eyebrow">Meet the Amazonians</p>
          <h2 id="amazonians-heading">Who is available</h2>
          <p className="section-intro">
            These Amazonians have volunteered to share their experience. Choose someone
            and book a time.
          </p>
          <div className="chat-grid">
            {amazonians.map((person) => {
              const next = upcomingDates(person.days)[0]
              return (
                <article className="chat-card" key={person.name}>
                  <div className="chat-card-top">
                    <div className="chat-avatar" aria-hidden="true">{person.name.charAt(0)}</div>
                    <div className="chat-info">
                      <h3>{person.name}</h3>
                      <p className="chat-role">{person.role}</p>
                      <p className="chat-team">{person.team}</p>
                    </div>
                  </div>
                  <ul className="chat-topics" aria-label={`${person.name} can talk about`}>
                    {person.topics.map((topic) => (
                      <li key={topic}>{topic}</li>
                    ))}
                  </ul>
                  <div className="chat-availability">
                    <span className="chat-dot" aria-hidden="true" />
                    <div>
                      <p className="chat-days">{listDays(person.days)}</p>
                      {next && <p className="chat-next">Next: {formatDate(next)}</p>}
                    </div>
                  </div>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => chooseAmazonian(person.name)}
                  >
                    Book a chat with {person.name}
                  </button>
                </article>
              )
            })}
          </div>
          </div>
        </section>

        {/* How it works and tips */}
        <section className="content-section" aria-labelledby="how-heading">
          <p className="eyebrow">How it works</p>
          <h2 id="how-heading">Three simple steps</h2>
          <ol className="cc-steps">
            {steps.map((item, index) => (
              <li className="cc-step" key={item.title}>
                <span className="cc-step-number" aria-hidden="true">{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ol>

          <h2 className="cc-subheading">Tips for a great chat</h2>
          <div className="cc-tips">
            {tips.map((item) => (
              <article className="cc-tip" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

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
        {/* Request form */}
        <section className="cc-band cc-anchor" aria-labelledby="request-heading">
          <div className="content-section" ref={formRef}>
            <p className="eyebrow">Book a coffee chat</p>
            <h2 id="request-heading">Request a chat</h2>

            {sent ? (
              <div className="cc-success" role="status">
                <h3>Request sent to {sent.person}</h3>
                <p>
                  You asked for <strong>{sent.date} at {sent.time}</strong>. {sent.person} will
                  confirm by email.
                </p>
                <button type="button" className="secondary-button" onClick={() => setSent(null)}>
                  Book another chat
                </button>
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
            ) : (
              <form className="cc-form" onSubmit={submit}>
                <div className="cc-field">
                  <label htmlFor="cc-person">Who would you like to chat with?</label>
                  <select id="cc-person" name="person" value={form.person} onChange={update} required>
                    <option value="">Choose an Amazonian</option>
                    {amazonians.map((person) => (
                      <option key={person.name} value={person.name}>
                        {person.name}, {person.role}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cc-field-row">
                  <div className="cc-field">
                    <label htmlFor="cc-date">Day</label>
                    <select
                      id="cc-date"
                      name="date"
                      value={form.date}
                      onChange={update}
                      disabled={!selected}
                      required
                    >
                      <option value="">{selected ? 'Choose a day' : 'Choose an Amazonian first'}</option>
                      {dateOptions.map((date) => (
                        <option key={toValue(date)} value={toValue(date)}>{formatDate(date)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="cc-field">
                    <span className="cc-label" id="cc-time-label">Time slot</span>
                    {form.date ? (
                      <div className="slot-grid" role="radiogroup" aria-labelledby="cc-time-label">
                        {selected.slots.map((slot) => (
                          <label className="slot" key={slot}>
                            <input
                              type="radio"
                              name="time"
                              value={slot}
                              checked={form.time === slot}
                              onChange={update}
                              required
                            />
                            <span>{slot}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="slot-empty">Choose a day to see times</p>
                    )}
                  </div>
                </div>

                <div className="cc-field-row">
                  <div className="cc-field">
                    <label htmlFor="cc-name">Your name</label>
                    <input id="cc-name" name="name" type="text" autoComplete="name" value={form.name} onChange={update} required />
                  </div>
                  <div className="cc-field">
                    <label htmlFor="cc-email">Email address</label>
                    <input id="cc-email" name="email" type="email" autoComplete="email" value={form.email} onChange={update} required />
                  </div>
                </div>

                <div className="cc-field">
                  <label htmlFor="cc-message">What would you like to chat about? (optional)</label>
                  <textarea
                    id="cc-message"
                    name="message"
                    rows="3"
                    maxLength="500"
                    value={form.message}
                    onChange={update}
                    placeholder="For example: I'm doing a Digital T Level and would love to hear how you became a software engineer."
                  />
                </div>

                <p className="cc-note">
                  Chats last about 15 minutes. If you are under 18, let a parent, carer or
                  teacher know before your chat.
                </p>
                <button className="primary-button" type="submit">Send request</button>
              </form>
            )}
          </div>
        </section>
      </main>
    </>
  )
}

export default CoffeeChats
