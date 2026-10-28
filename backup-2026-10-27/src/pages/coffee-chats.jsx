import './coffee-chats.css'

const chats = [
  { name: 'Amara', role: 'Digital T Level student', available: 'Mondays and Wednesdays' },
  { name: 'Jay', role: 'Business placement alum', available: 'Tuesday afternoons' },
  { name: 'Priya', role: 'Finance placement alum', available: 'Thursdays' },
  { name: 'Sam', role: 'Amazon buddy and mentor', available: 'Friday mornings' },
]

function CoffeeChats() {
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
        </div>
      </header>

      {/* People - open rows, no boxes */}
      <section className="cc-section">
        <h2 className="cc-h2">Pick someone to chat with</h2>
        <p className="cc-intro">
          Choose a person below and request a time that suits you. Chats are relaxed,
          friendly, and usually last about 15 minutes.
        </p>

        <ul className="cc-people">
          {chats.map((person) => (
            <li className="cc-person" key={person.name}>
              <span className="cc-avatar" aria-hidden="true">{person.name.charAt(0)}</span>
              <div className="cc-person-main">
                <h3>{person.name}</h3>
                <p className="cc-role">{person.role}</p>
              </div>
              <span className="cc-available">{person.available}</span>
              <button type="button" className="cc-request">
                Request a chat
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default CoffeeChats
