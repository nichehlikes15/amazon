import { Link } from 'react-router-dom'
import './info-page.css'

/*
  Privacy information for the prototype. Everything below describes what the
  code actually does today - update it if the backend changes. Have it checked
  by whoever is responsible for data protection before the site goes live.
  Set CONTACT_EMAIL to show a contact line.
*/
const CONTACT_EMAIL = ''

const DATA = [
  ['Your account', 'Name, email, school or college (if you add it), a scrambled (hashed) version of your password, email preference', 'To sign you in and show your profile'],
  ['Saved opportunities', 'Which opportunities you saved and when', 'So you can find them again on My profile'],
  ['Application tracking', 'The status, notes and files you add to an opportunity', 'So you can keep track of your applications'],
  ['Your CV', 'The file you upload and its automatic review', 'To give you a score and tips'],
  ['Career quiz', 'Your top pathway and when you finished the quiz', 'To show your match on My profile'],
  ['Register interest form', 'Name, email, school, pathway and message', 'So the Amazon team can contact you'],
  ['Coffee chat requests', 'Name, email, who you want to talk to, time, topic and message', 'So the team can arrange your chat'],
]

function Privacy() {
  return (
    <main className="ip">
      <header className="ip-hero">
        <div className="ip-hero-inner">
          <p className="ip-kicker">Privacy</p>
          <h1>Your data, <span>explained</span></h1>
          <p className="ip-lead">
            What Launchpad stores, why, and how you can download or delete it at any time.
          </p>
          <ul className="ip-jump">
            <li><a href="#what">What we store</a></li>
            <li><a href="#where">Where it's kept</a></li>
            <li><a href="#interview">Interview practice</a></li>
            <li><a href="#cookies">Cookies</a></li>
            <li><a href="#rights">Your choices</a></li>
          </ul>
        </div>
      </header>

      <div className="ip-body">
        <section className="ip-section" id="what">
          <h2>What we store and why</h2>
          <p>We only store what you give us while using the site:</p>
          <div className="ip-table-wrap">
            <table className="ip-table">
              <thead>
                <tr>
                  <th scope="col">What</th>
                  <th scope="col">Details</th>
                  <th scope="col">Why</th>
                </tr>
              </thead>
              <tbody>
                {DATA.map(([what, details, why]) => (
                  <tr key={what}>
                    <th scope="row">{what}</th>
                    <td>{details}</td>
                    <td>{why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            You can use the register interest and coffee chat forms without an account. In that
            case they are stored with the details you type in, but not linked to an account.
          </p>
        </section>

        <section className="ip-section" id="where">
          <h2>Where it's kept</h2>
          <p>
            Your data and files are stored on the Launchpad server. Your CV check and your quiz
            explanation are both worked out on that server - they are not sent to any outside
            service.
          </p>
          <p>
            Admins can see register interest forms and coffee chat requests so they can reply to
            them.
          </p>
        </section>

        <section className="ip-section" id="interview">
          <h2>Interview practice</h2>
          <ul>
            <li>Your answers are sent to our server to work out your feedback, then thrown away. They are not saved.</li>
            <li>If you turn on your camera, the video only shows on your own screen. It is not recorded or sent anywhere.</li>
            <li>
              If you answer out loud, your browser turns your speech into text. Some browsers (such as Chrome)
              use their own online service to do this - check your browser's privacy settings if you'd rather
              type your answers.
            </li>
          </ul>
        </section>

        <section className="ip-section" id="cookies">
          <h2>Cookies and browser storage</h2>
          <ul>
            <li>One cookie keeps you signed in. It is removed when you sign out.</li>
            <li>Your accessibility settings (text size, colours, motion) are saved in your browser, not on our server.</li>
            <li>We don't use advertising or tracking cookies.</li>
          </ul>
        </section>

        <section className="ip-section" id="rights">
          <h2>Your choices</h2>
          <h3>Download your data</h3>
          <p>
            Go to <Link to="/settings#privacy">Settings</Link> and press <strong>Download my data</strong>.
            You get a file with everything we store about your account.
          </p>
          <h3>Delete your account</h3>
          <p>
            In <Link to="/settings#privacy">Settings</Link>, press <strong>Delete my account</strong>.
            This removes your account, saved opportunities, application tracking and files, your CV
            and your coffee chat requests.
          </p>
          <p>
            Register interest forms you sent are kept so the Amazon team can still reply, but they are
            no longer linked to your account.
          </p>
          {CONTACT_EMAIL && (
            <p>
              Questions about your data? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
          )}
        </section>
      </div>
    </main>
  )
}

export default Privacy
