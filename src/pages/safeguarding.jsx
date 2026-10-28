import { Link } from 'react-router-dom'
import './info-page.css'
import { Icon } from '../modules/icons'

/*
  Staying safe on Launchpad. Only describes what the site actually does.
  Helpline numbers checked against childline.org.uk and nspcc.org.uk on
  28 October 2026 - check them again before going live.
*/

const SHARE_NEVER = [
  'Your password',
  'Your home address or phone number',
  'Your social media accounts',
  'Photos of yourself or anyone else',
  'Bank or payment details',
]

function Safeguarding() {
  return (
    <main className="ip">
      <header className="ip-hero">
        <div className="ip-hero-inner">
          <p className="ip-kicker">Safeguarding</p>
          <h1>Staying <span>safe</span> on Launchpad</h1>
          <p className="ip-lead">
            How coffee chats work, what to keep private online, and who to talk to if something worries you.
          </p>
          <ul className="ip-jump">
            <li><a href="#coffee-chats">Coffee chats</a></li>
            <li><a href="#online">Staying safe online</a></li>
            <li><a href="#worried">If something worries you</a></li>
          </ul>
        </div>
      </header>

      <div className="ip-body">
        <div className="ip-alert" role="note">
          <span className="ip-alert-icon"><Icon name="phone" size={18} /></span>
          <div>
            <strong>If someone is in danger right now, call 999.</strong>
            <span>For anything else that worries you, see <a href="#worried">who to talk to</a> below.</span>
          </div>
        </div>

        <section className="ip-section">
          <h2>Who Launchpad is for</h2>
          <p>
            Launchpad is for students thinking about T Levels, and the parents, carers, schools and colleges
            around them. Amazon's T Level placements are for students aged 16 to 18, so most people using the
            site are under 18.
          </p>
          <p>
            If you're under 18, tell a parent or carer that you're using Launchpad. There's a{' '}
            <Link to="/parents">page just for them</Link>.
          </p>
        </section>

        <section className="ip-section" id="coffee-chats">
          <h2>Coffee chats</h2>
          <p>A coffee chat is a short talk about careers with a T Level student, a placement alum or an Amazon buddy.</p>
          <ul className="ip-facts">
            <li><Icon name="check" size={16} /> You send a request. The Launchpad team confirms a time and adds a meeting link.</li>
            <li><Icon name="check" size={16} /> You'll see the time and link on your Coffee chats page and your profile.</li>
            <li><Icon name="check" size={16} /> If you're under 18, we ask you to confirm that a parent or carer knows about the chat before you book.</li>
            <li><Icon name="check" size={16} /> Only use the meeting link we give you. You never need to swap phone numbers or social media.</li>
            <li><Icon name="check" size={16} /> Chats are about careers and placements. You can leave a chat at any time if you feel uncomfortable.</li>
          </ul>
        </section>

        <section className="ip-section" id="online">
          <h2>Staying safe online</h2>
          <p>Never share these on Launchpad, in a coffee chat, or anywhere online with someone you don't know:</p>
          <ul className="ip-never">
            {SHARE_NEVER.map((s) => (
              <li key={s}><Icon name="close" size={14} /> {s}</li>
            ))}
          </ul>
          <p>
            Amazon and the Launchpad team will never ask for your password. If anyone asks for any of the
            things above, or makes you feel uncomfortable, stop replying and tell someone you trust.
          </p>
        </section>

        <section className="ip-section" id="worried">
          <h2>If something worries you</h2>
          <p>
            Talk to someone you trust, like a parent, carer or teacher. Your school or college will also have a
            safeguarding lead whose job is to help.
          </p>
          <ul className="ip-contacts">
            <li>
              <span className="ip-contact-num">999</span>
              <div>
                <strong>Police and emergency services</strong>
                <span>If you or someone else is in danger right now.</span>
              </div>
            </li>
            <li>
              <span className="ip-contact-num">0800 1111</span>
              <div>
                <strong>Childline</strong>
                <span>
                  Free and confidential for anyone under 19, any time of day or night. It won't show on your
                  phone bill.{' '}
                  <a href="https://www.childline.org.uk/" target="_blank" rel="noopener noreferrer">childline.org.uk <Icon name="external" size={12} /></a>
                </span>
              </div>
            </li>
            <li>
              <span className="ip-contact-num">0808 800 5000</span>
              <div>
                <strong>NSPCC Helpline</strong>
                <span>
                  For adults who are worried about a child. Open 10am to 4pm, Monday to Friday.{' '}
                  <a href="https://www.nspcc.org.uk/" target="_blank" rel="noopener noreferrer">nspcc.org.uk <Icon name="external" size={12} /></a>
                </span>
              </div>
            </li>
          </ul>
        </section>

        <section className="ip-section">
          <h2>More about how we look after you</h2>
          <p>
            Read our <Link to="/privacy">privacy page</Link> to see what we store, and our{' '}
            <Link to="/terms">terms of use</Link> for the rules everyone on Launchpad agrees to.
          </p>
        </section>
      </div>
    </main>
  )
}

export default Safeguarding
