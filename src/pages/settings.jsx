import { useState } from 'react'
import './settings.css'
import { loadSettings, saveSettings } from '../modules/accessibility'

function Settings() {
  const initial = loadSettings()
  const [textSize, setTextSize] = useState(initial.textSize)
  const [colourBlind, setColourBlind] = useState(initial.colourBlind)
  const [emailUpdates, setEmailUpdates] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(initial.reducedMotion)

  // Apply and persist accessibility settings the moment they change.
  const updateTextSize = (size) => {
    setTextSize(size)
    saveSettings({ textSize: size, colourBlind, reducedMotion })
  }
  const updateColourBlind = (value) => {
    setColourBlind(value)
    saveSettings({ textSize, colourBlind: value, reducedMotion })
  }
  const updateReducedMotion = (value) => {
    setReducedMotion(value)
    saveSettings({ textSize, colourBlind, reducedMotion: value })
  }

  return (
    <>
      <main>
        <section className="settings-header" aria-labelledby="settings-heading">
          <div className="settings-header-content">
            <p className="eyebrow">Your account</p>
            <h1 id="settings-heading">Settings</h1>
            <p className="settings-tagline">
              Manage your account, accessibility and privacy preferences.
            </p>
          </div>
        </section>

        <section className="content-section">
          {/* Account */}
          <div className="settings-panel">
            <h2>Account</h2>
            <p className="section-intro">Update the details on your profile.</p>

            <div className="settings-field">
              <label htmlFor="full-name">Full name</label>
              <input id="full-name" type="text" defaultValue="Bob Smith" />
            </div>
            <div className="settings-field">
              <label htmlFor="email">Email address</label>
              <input id="email" type="email" defaultValue="bob@example.com" />
            </div>
            <div className="settings-field">
              <label htmlFor="school">School or college</label>
              <input id="school" type="text" defaultValue="" placeholder="Enter your school" />
            </div>
          </div>

          {/* Accessibility */}
          <div className="settings-panel">
            <h2>Accessibility</h2>
            <p className="section-intro">Make the site easier to use for you.</p>

            <div className="settings-row">
              <div className="settings-row-text">
                <h3>Text size</h3>
                <p>Choose a comfortable reading size.</p>
              </div>
              <div className="settings-choice" role="group" aria-label="Text size">
                {['small', 'medium', 'large'].map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={textSize === size ? 'choice-button active' : 'choice-button'}
                    onClick={() => updateTextSize(size)}
                    aria-pressed={textSize === size}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <div className="settings-row-text">
                <h3>Colour-blind friendly mode</h3>
                <p>Use a higher-contrast, colour-blind safe palette.</p>
              </div>
              <button
                type="button"
                className={colourBlind ? 'toggle on' : 'toggle'}
                onClick={() => updateColourBlind(!colourBlind)}
                aria-pressed={colourBlind}
                aria-label="Colour-blind friendly mode"
              >
                <span className="toggle-knob" />
              </button>
            </div>

            <div className="settings-row">
              <div className="settings-row-text">
                <h3>Reduce motion</h3>
                <p>Turn off animations and smooth scrolling.</p>
              </div>
              <button
                type="button"
                className={reducedMotion ? 'toggle on' : 'toggle'}
                onClick={() => updateReducedMotion(!reducedMotion)}
                aria-pressed={reducedMotion}
                aria-label="Reduce motion"
              >
                <span className="toggle-knob" />
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="settings-panel">
            <h2>Notifications</h2>
            <p className="section-intro">Choose how we keep you updated.</p>

            <div className="settings-row">
              <div className="settings-row-text">
                <h3>Email updates</h3>
                <p>Get new opportunities and reminders by email.</p>
              </div>
              <button
                type="button"
                className={emailUpdates ? 'toggle on' : 'toggle'}
                onClick={() => setEmailUpdates(!emailUpdates)}
                aria-pressed={emailUpdates}
                aria-label="Email updates"
              >
                <span className="toggle-knob" />
              </button>
            </div>
          </div>

          {/* Privacy */}
          <div className="settings-panel">
            <h2>Privacy</h2>
            <p className="section-intro">
              Your data is handled in line with UK GDPR. You can download or delete your data at any time.
            </p>
            <div className="settings-actions">
              <button className="secondary-button" type="button">Download my data</button>
              <button className="danger-button" type="button">Delete my account</button>
            </div>
          </div>

          <div className="settings-save">
            <button className="primary-button" type="button">Save changes</button>
          </div>
        </section>
      </main>
    </>
  )
}

export default Settings
