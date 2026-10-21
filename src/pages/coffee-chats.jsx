import './coffee-chats.css'

const chats = [
  { name: 'Amara', role: 'Digital T Level student', available: 'Mondays and Wednesdays' },
  { name: 'Jay', role: 'Business placement alum', available: 'Tuesday afternoons' },
  { name: 'Priya', role: 'Finance placement alum', available: 'Thursdays' },
  { name: 'Sam', role: 'Amazon buddy and mentor', available: 'Friday mornings' },
]

function CoffeeChats() {
  return (
    <>
      <main>
        <section className="cc-header" aria-labelledby="cc-heading">
          <div className="cc-header-content">
            <p className="eyebrow">Community</p>
            <h1 id="cc-heading">Book a <span>coffee chat</span></h1>
            <p className="cc-tagline">
              Have an informal chat with a current T Level student, a placement alum, or
              an Amazon buddy. Ask anything - there are no silly questions.
            </p>
          </div>
        </section>

        <section className="content-section">
          <p className="eyebrow">Who you can talk to</p>
          <h2>Pick someone to chat with</h2>
          <p className="section-intro">
            Choose a person below and request a time that suits you. Chats are relaxed,
            friendly, and usually last about 15 minutes.
          </p>
          <div className="chat-grid">
            {chats.map((person) => (
              <article className="chat-card" key={person.name}>
                <div className="chat-avatar" aria-hidden="true">{person.name.charAt(0)}</div>
                <div className="chat-info">
                  <h3>{person.name}</h3>
                  <p className="chat-role">{person.role}</p>
                  <p className="chat-available">Available: {person.available}</p>
                </div>
                <button className="primary-button" type="button">Request a chat</button>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}

export default CoffeeChats
