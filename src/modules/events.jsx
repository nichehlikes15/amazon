import { useState } from 'react'
import './events.css'

// Placeholder events: replace with real ones. Dates are 'YYYY-MM-DD'.
const events = [
  { title: 'Fulfilment centre site tour', type: 'In person', date: '2026-11-05', time: '10:00 to 12:00', place: 'Amazon fulfilment centre, Dunstable', text: 'See how orders are picked, packed and shipped, and meet the teams and robots that make it happen.' },
  { title: 'Life at AWS webinar', type: 'Online', date: '2026-11-12', time: '17:00 to 18:00', place: 'Online', text: 'Hear from AWS engineers about cloud computing, what they work on and how they got started.' },
  { title: 'Amazon apprenticeships explained', type: 'Online', date: '2026-11-19', time: '18:00 to 19:00', place: 'Online', text: 'Find out which apprenticeships are open, what they involve and how to apply.' },
  { title: 'London office tour', type: 'In person', date: '2026-11-26', time: '14:00 to 16:00', place: 'Amazon London, Principal Place', text: 'Visit an Amazon corporate office and take part in a Q&A with Amazonians from different teams.' },
  { title: 'CV and interview workshop', type: 'Online', date: '2026-12-03', time: '17:30 to 18:30', place: 'Online', text: 'Learn how to write a strong CV and answer questions using the Leadership Principles.' },
  { title: 'T Level information evening', type: 'Online', date: '2026-12-10', time: '18:00 to 19:00', place: 'Online', text: 'For students, parents and teachers: how T Level placements at Amazon work.' },
]

// Turns 'YYYY-MM-DD' into a local date (avoids time zone shifts).
const parseDate = (text) => {
  const [year, month, day] = text.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const formatDate = (date) =>
  date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

function Events() {
  // No backend for events yet: registering is only remembered on this page.
  const [registered, setRegistered] = useState([])

  const toggleRegister = (title) => {
    setRegistered((current) =>
      current.includes(title) ? current.filter((item) => item !== title) : [...current, title],
    )
  }

  return (
    <section className="content-section events-anchor" id="events" aria-labelledby="events-heading">
      <p className="eyebrow">Events at Amazon</p>
      <h2 id="events-heading">Upcoming events</h2>
      <p className="section-intro">
        Visit an Amazon site or join a webinar to see how Amazon works and meet the
        people behind it.
      </p>
      <ul className="event-list">
        {events.map((item) => {
          const date = parseDate(item.date)
          const isRegistered = registered.includes(item.title)
          return (
            <li className="event-card" key={item.title}>
              <div className="event-date" aria-hidden="true">
                <span className="event-day">{date.getDate()}</span>
                <span className="event-month">
                  {date.toLocaleDateString('en-GB', { month: 'short' })}
                </span>
              </div>
              <div className="event-body">
                <span className={`event-type ${item.type === 'Online' ? 'event-online' : 'event-in-person'}`}>
                  {item.type}
                </span>
                <h3>{item.title}</h3>
                <p className="event-meta">
                  {formatDate(date)} · {item.time} · {item.place}
                </p>
                <p>{item.text}</p>
              </div>
              <button
                type="button"
                className={isRegistered ? 'secondary-button event-button' : 'primary-button event-button'}
                onClick={() => toggleRegister(item.title)}
                aria-pressed={isRegistered}
              >
                {isRegistered ? 'Registered ✓' : 'Register'}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default Events
