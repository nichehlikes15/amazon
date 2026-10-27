import { useState } from 'react'
import './interest.css'
import { api } from '../modules/api'
import { useAuth } from '../modules/auth'

const PATHWAYS = ['Digital', 'Business', 'Media', 'Finance', 'Engineering']

function Interest() {
  const { user } = useAuth()
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    school: user?.school || '',
    pathway: '',
    message: '',
  })
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.fullName || !form.email || !form.pathway) {
      setError('Please fill in your name, email and chosen pathway.')
      return
    }
    setBusy(true)
    try {
      await api.submitInterest(form)
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <main>
        <section className="interest-header">
          <div className="interest-header-content">
            <h1>Tell Amazon you're interested</h1>
            <p className="interest-tagline">
              Let the Amazon Emerging Talent team know which pathway interests you.
              It only takes a minute and helps them plan placements.
            </p>
          </div>
        </section>

        <section className="content-section">
          <div className="interest-card">
            {done ? (
              <div className="interest-success" role="status">
                <h2>Thank you, {form.fullName.split(' ')[0] || 'there'}!</h2>
                <p>
                  Your interest in the {form.pathway} pathway has been registered.
                  The Amazon team will be in touch with next steps.
                </p>
                <a className="primary-button" href="/profile">Back to my profile</a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                {error && <div className="auth-error" role="alert">{error}</div>}

                <div className="interest-field">
                  <label htmlFor="fullName">Full name</label>
                  <input id="fullName" type="text" value={form.fullName} onChange={update('fullName')} required />
                </div>
                <div className="interest-field">
                  <label htmlFor="email">Email address</label>
                  <input id="email" type="email" value={form.email} onChange={update('email')} required />
                </div>
                <div className="interest-field">
                  <label htmlFor="school">School or college (optional)</label>
                  <input id="school" type="text" value={form.school} onChange={update('school')} />
                </div>
                <div className="interest-field">
                  <label htmlFor="pathway">Which pathway interests you?</label>
                  <select id="pathway" value={form.pathway} onChange={update('pathway')} required>
                    <option value="">Choose a pathway…</option>
                    {PATHWAYS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="interest-field">
                  <label htmlFor="message">Anything you'd like to add? (optional)</label>
                  <textarea id="message" rows="4" value={form.message} onChange={update('message')} />
                </div>

                <p className="interest-privacy">
                  Your details are stored securely and used only to contact you about
                  T Level opportunities, in line with UK GDPR.
                </p>

                <button className="primary-button interest-submit" type="submit" disabled={busy}>
                  {busy ? 'Submitting…' : 'Register my interest'}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
    </>
  )
}

export default Interest
