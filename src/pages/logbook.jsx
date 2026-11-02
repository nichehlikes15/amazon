import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './logbook.css'
import { api } from '../modules/api'
import { useAuth } from '../modules/auth'
import { Icon } from '../modules/icons'
import { SignInRedirect } from '../modules/return-to'

/*
  My logbook: every T Level student keeps a placement logbook and works
  towards technical and employability goals (see the Advice page). Students
  add an entry each week, tick goals off, and print or save it as a PDF for
  their review meetings.
*/

const KINDS = [
  { id: 'technical', title: 'Technical goals', hint: 'Skills for the job itself, e.g. "Build a simple dashboard in Excel".' },
  { id: 'employability', title: 'Employability goals', hint: 'Skills for any workplace, e.g. "Speak up in a team meeting".' },
]

// The Monday of this week, as YYYY-MM-DD.
function thisMonday() {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function weekLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const emptyEntry = () => ({ weekOf: thisMonday(), hours: '', did: '', learned: '', feedback: '' })

function GoalList({ kind, goals, onAdd, onToggle, onDelete }) {
  const [text, setText] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    if (await onAdd(kind.id, text)) setText('')
  }
  return (
    <div className="lb-goals-col">
      <h3>{kind.title}</h3>
      <p className="lb-hint lb-no-print">{kind.hint}</p>
      {goals.length === 0 ? (
        <p className="lb-quiet">No goals yet.</p>
      ) : (
        <ul>
          {goals.map((g) => (
            <li key={g.id} className={g.done ? 'is-done' : ''}>
              <label className="lb-goal">
                <input type="checkbox" checked={g.done} onChange={() => onToggle(g)} />
                <span className="lb-tick" aria-hidden="true"><Icon name="check" size={12} /></span>
                <span>{g.text}</span>
              </label>
              <button type="button" className="lb-icon-btn lb-no-print" onClick={() => onDelete(g)} aria-label={`Remove goal: ${g.text}`}>
                <Icon name="trash" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="lb-add lb-no-print" onSubmit={submit}>
        <label className="visually-hidden" htmlFor={`lb-goal-${kind.id}`}>New {kind.title.toLowerCase()}</label>
        <input id={`lb-goal-${kind.id}`} value={text} onChange={(e) => setText(e.target.value)} maxLength={200}
          placeholder="Add a goal…" />
        <button type="submit" className="lb-add-btn" disabled={!text.trim()}>
          <Icon name="plus" size={15} /> Add
        </button>
      </form>
    </div>
  )
}

function Logbook() {
  const { user, loading } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [entry, setEntry] = useState(emptyEntry)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (loading || !user) return undefined
    let live = true
    api.logbook()
      .then((d) => { if (live) setData(d) })
      .catch((err) => { if (live) setError(err.message) })
    return () => { live = false }
  }, [loading, user])

  if (loading) return null
  if (!user) return <SignInRedirect />

  const run = async (fn, okMessage) => {
    setError('')
    try {
      setData(await fn())
      if (okMessage) setNotice(okMessage)
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }

  const addGoal = (kind, text) => run(() => api.addLogbookGoal({ kind, text }))
  const toggleGoal = (g) => run(() => api.updateLogbookGoal(g.id, { done: !g.done }))
  const deleteGoal = (g) => run(() => api.deleteLogbookGoal(g.id))

  const update = (field) => (e) => setEntry({ ...entry, [field]: e.target.value })

  const saveEntry = async (e) => {
    e.preventDefault()
    setSaving(true)
    const ok = await run(
      () => (editing ? api.updateLogbookEntry(editing, entry) : api.addLogbookEntry(entry)),
      editing ? 'Entry updated.' : 'Entry added.',
    )
    setSaving(false)
    if (ok) {
      setEntry(emptyEntry())
      setEditing(null)
    }
  }

  const editEntry = (en) => {
    setEditing(en.id)
    setEntry({ weekOf: en.weekOf, hours: String(en.hours), did: en.did, learned: en.learned, feedback: en.feedback })
    setNotice('')
    document.getElementById('lb-entry-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const deleteEntry = (en) => {
    if (!window.confirm(`Delete your entry for the week of ${weekLabel(en.weekOf)}?`)) return
    run(() => api.deleteLogbookEntry(en.id), 'Entry deleted.')
  }

  const goals = data?.goals || []
  const done = goals.filter((g) => g.done).length
  const pct = data ? Math.min(100, Math.round((data.totalHours / data.targetHours) * 100)) : 0

  return (
    <main className="lb">
      <header className="lb-hero">
        <div className="lb-hero-inner">
          <p className="lb-kicker">Placement logbook</p>
          <h1>My <span>logbook</span></h1>
          <p className="lb-lead">
            Write down what you do each week, track your learning goals, and bring it to your review meetings.
          </p>
          <p className="lb-print-name">{user.fullName}{user.school ? ` · ${user.school}` : ''}</p>
          <div className="lb-actions lb-no-print">
            <button type="button" className="primary-button" onClick={() => window.print()}>
              <Icon name="printer" size={16} /> Print or save as PDF
            </button>
            <Link className="secondary-button" to="/t-level/advice#students">Logbook advice</Link>
          </div>
        </div>
      </header>

      <div className="lb-body">
        {error && <div className="lb-error lb-no-print" role="alert">{error}</div>}
        {!data && !error && <p className="lb-quiet">Loading…</p>}

        {data && (
          <>
            {/* Progress */}
            <section className="lb-stats" aria-label="Your progress">
              <div>
                <strong>{data.totalHours}<small> / {data.targetHours} hours</small></strong>
                <span>Placement hours logged</span>
                <div className="lb-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
              </div>
              <div>
                <strong>{data.entries.length}</strong>
                <span>{data.entries.length === 1 ? 'Weekly entry' : 'Weekly entries'}</span>
              </div>
              <div>
                <strong>{done}<small> / {goals.length}</small></strong>
                <span>Goals reached</span>
              </div>
            </section>

            {/* Goals */}
            <section className="lb-section" aria-labelledby="lb-goals-title">
              <span className="lb-n" aria-hidden="true">01</span>
              <h2 id="lb-goals-title">Learning goals</h2>
              <p className="lb-intro">You will have at least three technical and three employability goals. Tick them off as you reach them.</p>
              <div className="lb-goals">
                {KINDS.map((k) => (
                  <GoalList key={k.id} kind={k} goals={goals.filter((g) => g.kind === k.id)}
                    onAdd={addGoal} onToggle={toggleGoal} onDelete={deleteGoal} />
                ))}
              </div>
            </section>

            {/* New entry */}
            <section className="lb-section lb-no-print" id="lb-entry-form" aria-labelledby="lb-form-title">
              <span className="lb-n" aria-hidden="true">02</span>
              <h2 id="lb-form-title">{editing ? 'Edit this entry' : 'Add this week'}</h2>
              <p className="lb-intro">Write it while it&apos;s still fresh. A few sentences in each box is plenty.</p>
              {notice && <p className="lb-notice" role="status"><Icon name="check" size={14} /> {notice}</p>}
              <form className="lb-form" onSubmit={saveEntry} noValidate>
                <div className="lb-row">
                  <label className="lb-field">
                    <span>Week starting</span>
                    <input type="date" value={entry.weekOf} onChange={update('weekOf')} required />
                  </label>
                  <label className="lb-field">
                    <span>Hours on placement</span>
                    <input type="number" min="0" max="60" step="0.5" value={entry.hours} onChange={update('hours')} placeholder="e.g. 35" />
                  </label>
                </div>
                <label className="lb-field">
                  <span>What I did</span>
                  <textarea rows="3" value={entry.did} onChange={update('did')} maxLength={2000} required />
                </label>
                <label className="lb-field">
                  <span>What I learned</span>
                  <textarea rows="3" value={entry.learned} onChange={update('learned')} maxLength={2000} />
                </label>
                <label className="lb-field">
                  <span>Feedback I was given</span>
                  <textarea rows="2" value={entry.feedback} onChange={update('feedback')} maxLength={2000} />
                </label>
                <div className="lb-form-actions">
                  {editing && (
                    <button type="button" className="secondary-button" onClick={() => { setEditing(null); setEntry(emptyEntry()) }}>
                      Cancel
                    </button>
                  )}
                  <button type="submit" className="primary-button" disabled={saving}>
                    {saving ? 'Saving…' : editing ? 'Save changes' : 'Add entry'}
                  </button>
                </div>
              </form>
            </section>

            {/* Entries */}
            <section className="lb-section" aria-labelledby="lb-entries-title">
              <span className="lb-n" aria-hidden="true">03</span>
              <h2 id="lb-entries-title">Weekly entries</h2>
              {data.entries.length === 0 ? (
                <p className="lb-quiet">No entries yet. Add your first week above.</p>
              ) : (
                <ol className="lb-entries">
                  {data.entries.map((en) => (
                    <li key={en.id} className="lb-entry">
                      <div className="lb-entry-head">
                        <h3>Week of {weekLabel(en.weekOf)}</h3>
                        <span>{en.hours} {en.hours === 1 ? 'hour' : 'hours'}</span>
                        <div className="lb-entry-actions lb-no-print">
                          <button type="button" className="lb-text-btn" onClick={() => editEntry(en)}>Edit</button>
                          <button type="button" className="lb-text-btn is-danger" onClick={() => deleteEntry(en)}>Delete</button>
                        </div>
                      </div>
                      <dl>
                        <dt>What I did</dt><dd>{en.did}</dd>
                        {en.learned && <><dt>What I learned</dt><dd>{en.learned}</dd></>}
                        {en.feedback && <><dt>Feedback I was given</dt><dd>{en.feedback}</dd></>}
                      </dl>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}

export default Logbook
