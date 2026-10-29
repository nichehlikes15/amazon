import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import './interest.css'
import { api } from '../modules/api'
import { useAuth } from '../modules/auth'
import { Icon } from '../modules/icons'

// Who can register interest - the three customer groups in the brief.
const ROLES = [
  {
    id: 'student',
    icon: 'user',
    title: "I'm a student",
    text: 'Interested in a T Level placement at Amazon.',
  },
  {
    id: 'parent',
    icon: 'heart',
    title: "I'm a parent or carer",
    text: 'Finding out about placements for my child.',
  },
  {
    id: 'school',
    icon: 'building',
    title: "I'm from a school or college",
    text: 'Interested in partnering with Amazon on placements.',
  },
]

const PATHWAYS = ['Digital', 'Business', 'Media', 'Finance', 'Engineering']

const COPY = {
  student: {
    pathwayLabel: 'Which pathway interests you?',
    schoolLabel: 'Your school or college (optional)',
    messageLabel: "Anything you'd like to add? (optional)",
    messageHint: 'For example, what you enjoy or what you would like to find out.',
    done: (name, pathway) => `Thanks, ${name}! Your interest in ${pathway === 'Not sure yet' ? 'Amazon T Level placements' : `the ${pathway} pathway`} has been registered.`,
  },
  parent: {
    pathwayLabel: 'Which pathway is your child interested in?',
    schoolLabel: "Your child's school or college (optional)",
    messageLabel: 'Any questions? (optional)',
    messageHint: 'For example, how placements work or what support students get.',
    done: (name) => `Thanks, ${name}! We've passed your details to the Amazon team.`,
  },
  school: {
    pathwayLabel: 'Which pathways do you teach?',
    schoolLabel: '',
    messageLabel: 'Tell us a bit more (optional)',
    messageHint: 'For example, how many students might take part, and when.',
    done: (name) => `Thanks, ${name}! The Amazon Emerging Talent team will be in touch about partnering with you.`,
  },
}

function Interest() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const startRole = ROLES.some((r) => r.id === params.get('role')) ? params.get('role') : 'student'

  const [role, setRole] = useState(startRole)
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    school: user?.school || '',
    organisation: '',
    contactRole: '',
    pathway: PATHWAYS.includes(params.get('pathway')) ? params.get('pathway') : '',
    message: '',
  })
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const copy = COPY[role]
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })
  const pathwayChoices = role === 'school' ? [...PATHWAYS, 'Several pathways'] : [...PATHWAYS, 'Not sure yet']

  const chooseRole = (id) => {
    setRole(id)
    setError('')
    // A pathway choice that doesn't exist for the new role is cleared.
    const allowed = id === 'school' ? [...PATHWAYS, 'Several pathways'] : [...PATHWAYS, 'Not sure yet']
    if (form.pathway && !allowed.includes(form.pathway)) setForm((f) => ({ ...f, pathway: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.fullName.trim() || !form.email.trim() || !form.pathway) {
      setError('Please fill in your name, email and a pathway.')
      return
    }
    if (role === 'school' && !form.organisation.trim()) {
      setError('Please add the name of your school or college.')
      return
    }
    if (!consent) {
      setError('Please tick the box to agree to the privacy notice, so the Amazon team can contact you.')
      return
    }
    setBusy(true)
    try {
      await api.submitInterest({
        role,
        fullName: form.fullName,
        email: form.email,
        school: role === 'school' ? form.organisation : form.school,
        organisation: role === 'school' ? form.organisation : '',
        contactRole: role === 'school' ? form.contactRole : '',
        pathway: form.pathway,
        message: form.message,
        consent: true,
      })
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const firstName = form.fullName.split(' ')[0] || 'there'

  return (
    <main className="ei">
      <header className="ei-hero">
        <div className="ei-hero-inner">
          <p className="ei-kicker">Register interest</p>
          <h1>Tell Amazon you're <span>interested</span></h1>
          <p className="ei-lead">
            Students, parents and carers, schools and colleges can all register interest. It only takes a
            minute and helps the Amazon Emerging Talent team plan placements.
          </p>
        </div>
      </header>

      <section className="ei-body">
        {done ? (
          <div className="ei-card ei-success" role="status">
            <span className="ei-success-icon"><Icon name="check" size={28} /></span>
            <h2>{copy.done(firstName, form.pathway)}</h2>
            <p>The Amazon team will contact you at <strong>{form.email}</strong> with next steps.</p>
            <div className="ei-success-actions">
              {user ? (
                <Link className="primary-button" to="/profile">Back to my profile <Icon name="arrowRight" size={15} /></Link>
              ) : (
                <Link className="primary-button" to="/information">Explore the pathways <Icon name="arrowRight" size={15} /></Link>
              )}
              {role === 'parent' && <Link className="secondary-button" to="/parents">Guide for parents and carers</Link>}
            </div>
          </div>
        ) : (
          <form className="ei-card" onSubmit={handleSubmit} noValidate>
            <fieldset className="ei-roles">
              <legend>Who are you?</legend>
              <div className="ei-role-grid">
                {ROLES.map((r) => (
                  <label key={r.id} className={role === r.id ? 'ei-role is-on' : 'ei-role'}>
                    <input
                      type="radio"
                      name="role"
                      value={r.id}
                      checked={role === r.id}
                      onChange={() => chooseRole(r.id)}
                    />
                    <span className="ei-role-icon"><Icon name={r.icon} size={20} /></span>
                    <strong>{r.title}</strong>
                    <span>{r.text}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {error && <div className="auth-error" role="alert">{error}</div>}

            <div className="ei-fields" key={role}>
              <div className="ei-row">
                <div className="interest-field">
                  <label htmlFor="fullName">Full name</label>
                  <input id="fullName" type="text" value={form.fullName} onChange={update('fullName')} autoComplete="name" required />
                </div>
                <div className="interest-field">
                  <label htmlFor="email">Email address</label>
                  <input id="email" type="email" value={form.email} onChange={update('email')} autoComplete="email" required />
                </div>
              </div>

              {role === 'school' ? (
                <div className="ei-row">
                  <div className="interest-field">
                    <label htmlFor="organisation">School or college name</label>
                    <input id="organisation" type="text" value={form.organisation} onChange={update('organisation')} autoComplete="organization" required />
                  </div>
                  <div className="interest-field">
                    <label htmlFor="contactRole">Your job title (optional)</label>
                    <input id="contactRole" type="text" value={form.contactRole} onChange={update('contactRole')}
                      placeholder="For example, careers lead" autoComplete="organization-title" />
                  </div>
                </div>
              ) : (
                <div className="interest-field">
                  <label htmlFor="school">{copy.schoolLabel}</label>
                  <input id="school" type="text" value={form.school} onChange={update('school')} />
                </div>
              )}

              <div className="interest-field">
                <label htmlFor="pathway">{copy.pathwayLabel}</label>
                <select id="pathway" value={form.pathway} onChange={update('pathway')} required>
                  <option value="">Choose…</option>
                  {pathwayChoices.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="interest-field">
                <label htmlFor="message">{copy.messageLabel}</label>
                <textarea id="message" rows="4" value={form.message} onChange={update('message')} maxLength={2000}
                  aria-describedby="message-hint" />
                <p className="ei-hint" id="message-hint">{copy.messageHint}</p>
              </div>
            </div>

            <label className="ei-consent">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span className="ei-check" aria-hidden="true"><Icon name="check" size={12} /></span>
              <span>
                I agree that the Amazon Emerging Talent team can use these details to contact me about T Level
                placements, as explained in the <Link to="/privacy">privacy notice</Link>.
              </span>
            </label>

            <button className="primary-button interest-submit" type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Register my interest'}
              {!busy && <Icon name="arrowRight" size={15} />}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}

export default Interest
