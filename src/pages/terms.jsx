import { Link } from 'react-router-dom'
import './info-page.css'

/*
  Terms of use for the prototype, in plain words. Have them checked by
  whoever is responsible for legal matters before the site goes live.
*/

function Terms() {
  return (
    <main className="ip">
      <header className="ip-hero">
        <div className="ip-hero-inner">
          <p className="ip-kicker">Terms of use</p>
          <h1>The <span>ground rules</span></h1>
          <p className="ip-lead">
            What you're agreeing to when you use Launchpad, in plain words.
          </p>
        </div>
      </header>

      <div className="ip-body">
        <section className="ip-section">
          <h2>About Launchpad</h2>
          <p>
            Launchpad is a prototype website built for the Amazon Emerging Talent Programs team as part of a
            T Level team project. It's for students thinking about T Levels, and the parents, carers, schools
            and colleges around them.
          </p>
          <p>
            The information here is a guide. Always check the details of a placement or apprenticeship on the
            official page before you apply.
          </p>
        </section>

        <section className="ip-section">
          <h2>Your account</h2>
          <ul>
            <li>Use your real name and an email address you can get to.</li>
            <li>Keep your password to yourself. Don't let anyone else use your account.</li>
            <li>If you're under 18, tell a parent or carer that you're using Launchpad.</li>
            <li>You can download your data or delete your account at any time in <Link to="/settings#privacy">Settings</Link>.</li>
          </ul>
        </section>

        <section className="ip-section">
          <h2>Be kind and stay safe</h2>
          <ul>
            <li>Be polite and respectful in coffee chats, forms and messages.</li>
            <li>Don't bully, threaten or upset anyone, and don't share anyone else's personal details.</li>
            <li>Don't share your own private details either. Our <Link to="/safeguarding">staying safe page</Link> explains what to keep private.</li>
            <li>We may cancel coffee chats or close accounts that break these rules.</li>
          </ul>
        </section>

        <section className="ip-section">
          <h2>Opportunities and applications</h2>
          <p>
            You apply for placements and apprenticeships on the employer's own website. Launchpad can't promise
            you a place, an interview or a reply.
          </p>
        </section>

        <section className="ip-section">
          <h2>Automatic feedback</h2>
          <p>
            The CV check, the career quiz explanation and the interview practice give feedback using automatic
            checks. They are a guide to help you practise. They are not used by Amazon to make hiring decisions.
          </p>
        </section>

        <section className="ip-section">
          <h2>Content and brand</h2>
          <p>
            The guides and downloads are for your own use. The Amazon name and logo belong to Amazon and are used
            here for this project only.
          </p>
        </section>

        <section className="ip-section">
          <h2>Your data</h2>
          <p>
            Our <Link to="/privacy">privacy page</Link> explains what we store, why, and how to download or delete it.
          </p>
        </section>

        <section className="ip-section">
          <h2>Changes</h2>
          <p>We may update these terms as the site changes. The latest version will always be on this page.</p>
        </section>
      </div>
    </main>
  )
}

export default Terms
