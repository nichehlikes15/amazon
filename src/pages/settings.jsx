
import './settings.css'

function Settings() {
  return (
    <main className="settings-page">
      <div className="settings-container">
        <div className="settings-breadcrumb">
          <a href="/">Home</a>
          <span>/</span>
          <span>Settings</span>
        </div>

        <header className="settings-heading">
          <p className="settings-eyebrow">MAKE IT YOURS</p>
          <h1>Settings</h1>
          <p>
            Manage your account, customise your experience, and choose
            how you stay connected with Launchpad.
          </p>
        </header>
      </div>
    </main>
  )
}

export default Settings
