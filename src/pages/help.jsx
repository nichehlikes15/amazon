import { Link } from 'react-router-dom'
import './info-page.css'
import { Icon } from '../modules/icons'

// Answers only describe what the site actually does.
const GROUPS = [
  {
    id: 'getting-started',
    title: 'Getting started',
    items: [
      {
        q: 'What is Launchpad?',
        a: <>A place to learn about T Levels, explore the five Amazon pathways, find apprenticeships and talk to people who have done a placement. Start with the <Link to="/tlevel">T Levels page</Link> or the <Link to="/quiz">career quiz</Link>.</>,
      },
      {
        q: 'Do I need an account?',
        a: <>No - you can browse everything without one. An account lets you save opportunities, track your applications, upload your CV and see your coffee chat requests in one place. <Link to="/signup">Create an account</Link>.</>,
      },
      {
        q: 'Which pathway is right for me?',
        a: <>Take the <Link to="/quiz">career quiz</Link>. It asks a few quick questions and shows the pathway that fits your answers best, with a short explanation of why.</>,
      },
    ],
  },
  {
    id: 'opportunities',
    title: 'Opportunities and applications',
    items: [
      {
        q: 'How do I apply for an apprenticeship?',
        a: <>Open an opportunity on the <Link to="/opportunities">Opportunities page</Link> and press <strong>Apply</strong>. This takes you to the official job page, where you send your application.</>,
      },
      {
        q: 'How do I save an opportunity?',
        a: <>Sign in, then press the bookmark button on any opportunity. Your saved opportunities appear on <Link to="/profile">My profile</Link>.</>,
      },
      {
        q: 'Can I keep track of my application?',
        a: <>Yes. On each opportunity's page, signed-in users can set a status (from Not started to Offer), write notes and upload files such as a cover letter.</>,
      },
      {
        q: 'Can I practise for an interview?',
        a: <>Yes. <Link to="/interview">Interview practice</Link> is a practice call with a virtual interviewer. You answer five questions out loud or by typing, then get feedback on each answer.</>,
      },
      {
        q: 'How does the CV check work?',
        a: <>Upload your CV on <Link to="/profile#cv">My profile</Link>. It is checked straight away on our own server and given a score out of 100 with tips. It is a guide only and is not used by Amazon to make hiring decisions.</>,
      },
    ],
  },
  {
    id: 'coffee-chats',
    title: 'Coffee chats',
    items: [
      {
        q: 'What is a coffee chat?',
        a: <>A relaxed chat of about 15 minutes with a T Level student, a placement alum or an Amazon buddy. <Link to="/alumni/coffee-chats">Book one here</Link>.</>,
      },
      {
        q: 'What happens after I send a request?',
        a: <>The team reviews it and confirms a time. If you are signed in, you can see the status, the time and the meeting link on the Coffee chats page and on My profile.</>,
      },
      {
        q: 'Can I cancel a request?',
        a: <>Yes, while it is still waiting to be confirmed. Press <strong>Cancel request</strong> next to it on the Coffee chats page or My profile.</>,
      },
    ],
  },
  {
    id: 'account',
    title: 'Your account',
    items: [
      {
        q: 'How do I change my details or password?',
        a: <>Go to <Link to="/settings">Settings</Link>. You can update your name, email and school, and change your password.</>,
      },
      {
        q: 'Can I make the site easier to read?',
        a: <>Yes. In <Link to="/settings#accessibility">Settings</Link> you can change the text size, turn on a colour-blind friendly palette and reduce motion. See <Link to="/accessibility">Accessibility</Link> for more.</>,
      },
      {
        q: 'How do I download or delete my data?',
        a: <>Both are in <Link to="/settings#privacy">Settings</Link> under Privacy. Read the <Link to="/privacy">privacy page</Link> to see what is stored.</>,
      },
    ],
  },
]

function Help() {
  return (
    <main className="ip">
      <header className="ip-hero">
        <div className="ip-hero-inner">
          <p className="ip-kicker">Help</p>
          <h1>How can we <span>help?</span></h1>
          <p className="ip-lead">Quick answers to the most common questions about using Launchpad.</p>
          <ul className="ip-jump">
            {GROUPS.map((g) => (
              <li key={g.id}><a href={`#${g.id}`}>{g.title}</a></li>
            ))}
          </ul>
        </div>
      </header>

      <div className="ip-body">
        {GROUPS.map((g) => (
          <section className="ip-section" id={g.id} key={g.id}>
            <h2>{g.title}</h2>
            <div className="ip-faq">
              {g.items.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}

        <section className="ip-section">
          <h2>Still stuck?</h2>
          <p>
            Talk to someone who has been through it. A coffee chat is a good way to ask
            anything that isn't covered here.
          </p>
          <div className="ip-actions" style={{ justifyContent: 'flex-start', marginTop: 20 }}>
            <Link className="primary-button" to="/alumni/coffee-chats">
              Book a coffee chat <Icon name="arrowRight" size={15} />
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}

export default Help
