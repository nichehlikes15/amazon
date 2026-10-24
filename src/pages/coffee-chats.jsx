import { useMemo, useRef, useState } from 'react'
import './coffee-chats.css'

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
