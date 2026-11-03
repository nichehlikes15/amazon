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
  ['Register interest form', 'Who you are (student, parent or carer, or school), name, email, school or college, job title (schools only), pathway and message', 'So the Amazon team can contact you'],
  ['Coffee chat requests', 'Name, email, who you want to talk to, time, topic and message', 'So the team can arrange your chat'],
  ['Interview practice', 'Your score for each practice call and each question, the pathway and the date - not what you said', 'To show your progress on My profile'],
  ['Agreements', 'When you agreed to the privacy notice and terms (sign up, interest form and coffee chats)', 'To show you agreed'],
  ['Coffee chat safety check', "Whether you said you're under 18, and that a parent or carer knows about the chat", 'To help keep under-18s safe'],
  ['Password reset links', 'A scrambled code and when it runs out (after 30 minutes)', 'So you can choose a new password'],
  ['Who you are', 'Whether you are a student, teacher or parent. Kept on your device, and on your account if you have one', 'To show you the links that are useful to you'],
  ['Page feedback', 'Which page, yes or no, and any comment - not linked to your name or account', 'To improve the site'],
  ['Placement logbook', 'Your learning goals and weekly entries: the week, hours, what you did, what you learned and feedback', 'So you can keep and print your logbook'],
  ['Question board', 'Your questions and answers, when you posted them, and any reports you make. Others only see your first name and initial', 'To run the question board safely'],
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
            <li>
              If you choose &quot;Ask me about my CV&quot;, our server reads your saved CV to write one question. Contact
              details are taken out first, and nothing extra is saved.
            </li>
            <li>
              Questions typed into Ask Launchpad (the help chat) are answered and then thrown away. They are not saved.
            </li>
            <li>
              Alex's replies, follow-up questions and end summary can be written by an AI model. On the live site
              this is Amazon Nova, run through Amazon Bedrock in the EU inside our own AWS account. Amazon Bedrock
              doesn't store your answers or use them to train AI models. When we test the site on our own computer,
              the AI runs on that computer instead (using a tool called Ollama). Your scores always come from fixed
              checks, not the AI.
            </li>
            <li>If you're signed in, your scores for each call (not your answers) are saved to My profile. You can remove any result there.</li>
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
            This removes your account, saved opportunities, application tracking and files, your CV,
            your coffee chat requests and your interview practice scores.
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
