import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './community.css'
import { api } from '../modules/api'
import { useAuth } from '../modules/auth'
import { Icon } from '../modules/icons'

/*
  Question board: students ask questions; other students and the Launchpad
  team answer. Every post is checked by the team before anyone else sees it,
  personal details are blocked, and anything reported is hidden until checked.
*/

const RULES = [
  { icon: 'shield', title: 'Every post is checked', text: 'The Launchpad team reads each question and answer before it appears.' },
  { icon: 'lock', title: 'No personal details', text: 'Never share your email, phone number, address or social media. Posts with them are blocked.' },
  { icon: 'flag', title: 'Report anything worrying', text: 'Reported posts are hidden straight away until the team has looked at them.' },
]

function when(iso) {
  const d = new Date(String(iso || '').replace(' ', 'T'))
  return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function SafetyNote() {
  return (
    <div className="qb-safety" role="alert">
      <Icon name="shield" size={18} />
      <p>
        If you&apos;re worried about your safety, please talk to a trusted adult or call <strong>Childline free on
        0800 1111</strong>. If you&apos;re in danger right now, call <strong>999</strong>.{' '}
        <Link to="/safeguarding">More help on staying safe</Link>
      </p>
    </div>
  )
}

function ReportButton({ kind, id, onDone }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const send = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.reportBoardPost(kind, id, reason)
      onDone()
    } catch (err) {
      setError(err.message)
    }
  }
  if (!open) {
    return (
      <button type="button" className="qb-report" onClick={() => setOpen(true)}>
        <Icon name="flag" size={13} /> Report
      </button>
    )
  }
  return (
    <form className="qb-report-form" onSubmit={send}>
      <label htmlFor={`qb-r-${kind}-${id}`}>Why are you reporting this? (optional)</label>
      <input id={`qb-r-${kind}-${id}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
      {error && <p className="qb-error" role="alert">{error}</p>}
      <div>
        <button type="button" className="qb-text-btn" onClick={() => setOpen(false)}>Cancel</button>
        <button type="submit" className="qb-small-btn">Send report</button>
      </div>
    </form>
  )
}

function AnswerForm({ questionId, onPosted }) {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const send = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const r = await api.answerBoardQuestion(questionId, body)
      setBody('')
      setOpen(false)
      onPosted(r)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  if (!open) {
    return <button type="button" className="qb-text-btn" onClick={() => setOpen(true)}>Write an answer</button>
  }
  return (
    <form className="qb-answer-form" onSubmit={send}>
      <label className="visually-hidden" htmlFor={`qb-a-${questionId}`}>Your answer</label>
      <textarea id={`qb-a-${questionId}`} rows="3" value={body} onChange={(e) => setBody(e.target.value)} maxLength={1500}
        placeholder="Share what you know. Please don't include personal details." />
      {error && <p className="qb-error" role="alert">{error}</p>}
      <div>
        <button type="button" className="qb-text-btn" onClick={() => setOpen(false)}>Cancel</button>
        <button type="submit" className="qb-small-btn" disabled={busy || !body.trim()}>{busy ? 'Sending…' : 'Send answer'}</button>
      </div>
    </form>
  )
}

function Community() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [topic, setTopic] = useState('All')
  const [form, setForm] = useState({ title: '', body: '', topic: '' })
  const [busy, setBusy] = useState(false)
  const [posted, setPosted] = useState(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let live = true
    api.board()
      .then((d) => { if (live) setData(d) })
      .catch((err) => { if (live) setError(err.message) })
    return () => { live = false }
  }, [reload, user])

  const refresh = () => setReload((n) => n + 1)
  const afterPost = (r) => { setPosted(r); refresh() }

  const ask = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const r = await api.askBoardQuestion(form)
      setForm({ title: '', body: '', topic: '' })
      afterPost(r)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const topics = data?.topics || []
  const items = (data?.items || []).filter((q) => topic === 'All' || q.topic === topic)

  return (
    <main className="qb">
      <header className="qb-hero">
        <div className="qb-hero-inner">
          <p className="qb-kicker">Community</p>
          <h1>Question <span>board</span></h1>
          <p className="qb-lead">
            Ask a question about T Levels, placements or apprenticeships. Other students and the Launchpad team can answer.
          </p>
        </div>
      </header>

      <div className="qb-body">
        <ul className="qb-rules">
          {RULES.map((r) => (
            <li key={r.title}>
              <Icon name={r.icon} size={20} />
              <strong>{r.title}</strong>
              <span>{r.text}</span>
            </li>
          ))}
        </ul>

        {/* Ask */}
        <section className="qb-ask" aria-labelledby="qb-ask-title">
          <h2 id="qb-ask-title">Ask a question</h2>
          {posted && (
            <>
              <p className="qb-posted" role="status">
                <Icon name="check" size={15} />
                {posted.pending
                  ? 'Thanks! Your post will appear once the Launchpad team has checked it.'
                  : 'Posted.'}
              </p>
              {posted.safety && <SafetyNote />}
            </>
          )}
          {!user ? (
            <p className="qb-signin">
              <Link to="/login">Sign in</Link> or <Link to="/signup">create a free account</Link> to ask or answer questions.
            </p>
          ) : (
            <form className="qb-form" onSubmit={ask} noValidate>
              <label className="qb-field">
                <span>Topic</span>
                <select value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} required>
                  <option value="">Choose…</option>
                  {topics.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="qb-field">
                <span>Your question</span>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={140}
                  placeholder="e.g. Do I need to know how to code before a Digital placement?" required />
              </label>
              <label className="qb-field">
                <span>More detail (optional)</span>
                <textarea rows="3" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} maxLength={1500} />
              </label>
              {error && <p className="qb-error" role="alert">{error}</p>}
              <button type="submit" className="primary-button" disabled={busy}>
                {busy ? 'Sending…' : 'Post question'} {!busy && <Icon name="send" size={15} />}
              </button>
            </form>
          )}
        </section>

        {/* Questions */}
        <section className="qb-list" aria-labelledby="qb-list-title">
          <h2 id="qb-list-title">Questions</h2>
          <div className="qb-topics" role="group" aria-label="Filter by topic">
            {['All', ...topics].map((t) => (
              <button key={t} type="button" className={topic === t ? 'is-on' : ''} aria-pressed={topic === t} onClick={() => setTopic(t)}>{t}</button>
            ))}
          </div>

          {!data && !error && <p className="qb-quiet">Loading…</p>}
          {data && items.length === 0 && <p className="qb-quiet">No questions here yet. Be the first to ask one.</p>}

          <ol className="qb-questions">
            {items.map((q) => (
              <li key={q.id} className={q.pending ? 'qb-q is-pending' : 'qb-q'}>
                <span className="qb-q-topic">{q.topic}</span>
                <h3>{q.title}</h3>
                {q.body && <p className="qb-q-body">{q.body}</p>}
                <p className="qb-meta">
                  Asked by {q.mine ? 'you' : q.author} · {when(q.createdAt)}
                  {q.pending && <span className="qb-waiting">Waiting for approval - only you can see this</span>}
                </p>

                {q.answers.length > 0 && (
                  <ul className="qb-answers">
                    {q.answers.map((a) => (
                      <li key={a.id} className={a.pending ? 'qb-a is-pending' : 'qb-a'}>
                        <p>{a.body}</p>
                        <p className="qb-meta">
                          {a.team ? <span className="qb-team">Launchpad team</span> : (a.mine ? 'You' : a.author)} · {when(a.createdAt)}
                          {a.pending && <span className="qb-waiting">Waiting for approval</span>}
                          {user && !a.mine && !a.pending && <ReportButton kind="answer" id={a.id} onDone={refresh} />}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}

                {!q.pending && (
                  <div className="qb-q-actions">
                    {user ? <AnswerForm questionId={q.id} onPosted={afterPost} /> : <Link to="/login">Sign in to answer</Link>}
                    {user && !q.mine && <ReportButton kind="question" id={q.id} onDone={refresh} />}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  )
}

export default Community
