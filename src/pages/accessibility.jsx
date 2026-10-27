import { Link } from 'react-router-dom'
import './info-page.css'
import { Icon } from '../modules/icons'

// Only lists features that exist on the site today.
const FEATURES = [
  { icon: 'layers', title: 'Text size', text: 'Choose small, medium or large text in Settings. The whole site scales with it.' },
  { icon: 'check', title: 'Colour-blind friendly mode', text: 'Swaps the colours for a higher-contrast set that is easier to tell apart.' },
  { icon: 'clock', title: 'Reduce motion', text: 'Turns off animations and smooth scrolling. We also follow your device\'s own reduce-motion setting.' },
  { icon: 'arrowRight', title: 'Keyboard friendly', text: 'Links, buttons and tabs can be reached with the Tab key and show a clear orange outline when selected.' },
]

function Accessibility() {
  return (
    <main className="ip">
      <header className="ip-hero">
        <div className="ip-hero-inner">
          <p className="ip-kicker">Accessibility</p>
          <h1>Built for <span>everyone</span></h1>
          <p className="ip-lead">
            Launchpad should be easy to use however you browse. Here is what you can change,
            and how to tell us if something doesn't work for you.
          </p>
          <div className="ip-actions">
            <Link className="primary-button" to="/settings#accessibility">
              Open accessibility settings <Icon name="arrowRight" size={15} />
            </Link>
          </div>
        </div>
      </header>

      <div className="ip-body">
        <section className="ip-section">
          <h2>What you can change</h2>
          <ul className="ip-features">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <span className="ip-feature-icon"><Icon name={f.icon} size={18} /></span>
                <div>
                  <strong>{f.title}</strong>
                  <span>{f.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="ip-section">
          <h2>Using your browser</h2>
          <p>You can also use the tools built into your browser and device:</p>
          <ul>
            <li>Zoom in or out with <strong>Ctrl</strong> and <strong>+</strong> or <strong>-</strong> (<strong>Cmd</strong> on a Mac).</li>
            <li>Use your device's screen reader, such as VoiceOver on Mac and iPhone or Narrator on Windows.</li>
            <li>Turn on your device's reduce-motion setting - the site will follow it.</li>
          </ul>
        </section>

        <section className="ip-section">
          <h2>Something not working?</h2>
          <p>
            We are still improving the site. If a page is hard to read, a button can't be reached
            with the keyboard, or something doesn't work with your screen reader, please let us know
            through your school or college's T Level contact so we can fix it.
          </p>
          <p className="ip-note">
            Your settings are saved in this browser, so you may need to set them again on another
            device.
          </p>
        </section>
      </div>
    </main>
  )
}

export default Accessibility
