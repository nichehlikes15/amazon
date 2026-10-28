import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../modules/api'
import { Icon, PathwayIcon } from '../modules/icons'

/*
  "Interview practice" on My Profile: your scores from practice calls with
  Alex, so you can see yourself improving. Only scores are saved - never
  what you said.
*/

const tone = (score) => (score >= 75 ? 'good' : score >= 50 ? 'ok' : 'low')

// SQLite gives "2026-10-27 16:30:00" in UTC.
function parseDate(value) {
  if (!value) return null
  const d = new Date(`${String(value).replace(' ', 'T')}Z`)
  return isNaN(d) ? null : d
}

function formatDate(value, withTime = false) {
  const d = parseDate(value)
  if (!d) return ''
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

// Bar chart of your last few calls, oldest on the left.
function ScoreChart({ items }) {
  const recent = items.slice(0, 10).reverse()
  return (
    <div className="pp-chart" role="img"
      aria-label={`Your last ${recent.length} practice scores: ${recent.map((r) => r.overall).join(', ')}`}>
      <div className="pp-chart-lines" aria-hidden="true">
        <span style={{ bottom: '75%' }}><em>75</em></span>
        <span style={{ bottom: '50%' }}><em>50</em></span>
        <span style={{ bottom: '25%' }}><em>25</em></span>
      </div>
      <div className="pp-chart-bars">
        {recent.map((r, i) => (
          <div className="pp-bar-col" key={r.id} title={`${formatDate(r.createdAt, true)} - ${r.overall}/100`}>
            <span
              className={`pp-bar is-${tone(r.overall)}`}
              style={{ '--h': `${Math.max(4, r.overall)}%`, '--d': `${i * 0.06}s` }}
            >
              <span className="pp-bar-num">{r.overall}</span>
            </span>
            <span className="pp-bar-date">{formatDate(r.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Session({ item, onDelete }) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const weakest = [...(item.questions || [])].sort((a, b) => a.score - b.score)[0]

  return (
    <li className={open ? 'pp-session is-open' : 'pp-session'}>
      <button type="button" className="pp-session-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="pp-session-icon"><PathwayIcon pathway={item.pathway} size={18} /></span>
        <span className="pp-session-main">
          <strong>{item.pathway} practice</strong>
          <span>{formatDate(item.createdAt, true)}</span>
        </span>
        <span className={`pp-score is-${tone(item.overall)}`}>{item.overall}</span>
        <span className="pp-caret" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4" /></svg>
        </span>
      </button>

      <div className="pp-session-body" hidden={!open}>
        <ul className="pp-questions">
          {(item.questions || []).map((q) => (
            <li key={q.id}>
              <span className="pp-q-text">{q.question}</span>
              <span className="pp-q-bar" aria-hidden="true">
                <span className={`is-${tone(q.score)}`} style={{ width: `${q.score}%` }} />
              </span>
              <span className={`pp-q-score is-${tone(q.score)}`}>{q.score}</span>
            </li>
          ))}
        </ul>

        {weakest && weakest.score < 75 && (
          <p className="pp-weakest">
            <Icon name="clock" size={14} /> Lowest score: “{weakest.question}”
          </p>
        )}

        {item.focusOn?.length > 0 && (
          <div className="pp-focus">
            <h4>Things to work on</h4>
            <ul>{item.focusOn.slice(0, 3).map((f) => <li key={f}>{f}</li>)}</ul>
          </div>
        )}

        <div className="pp-session-actions">
          {confirming ? (
            <span className="pp-confirm">
              Remove this result?
              <button type="button" className="pp-yes" onClick={() => onDelete(item.id)}>Yes, remove</button>
              <button type="button" className="pp-no" onClick={() => setConfirming(false)}>Keep it</button>
            </span>
          ) : (
            <button type="button" className="pp-remove" onClick={() => setConfirming(true)}>
              <Icon name="trash" size={14} /> Remove result
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

export default function PracticeScores() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    api.myInterviewPractice()
      .then((d) => setItems(d.items || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const remove = async (id) => {
    setError('')
    try {
      await api.deleteInterviewPractice(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  const latest = items[0]
  const best = items.reduce((m, i) => Math.max(m, i.overall), 0)
  const first = items[items.length - 1]
  const change = items.length > 1 ? latest.overall - first.overall : null
  const shown = showAll ? items : items.slice(0, 5)

  return (
    <section className="pf-section pp" id="interview-practice">
      <div className="pf-section-head">
        <h2>Interview practice <span className="pf-count">{items.length}</span></h2>
        <Link className="pf-link" to="/interview">Practise again <Icon name="arrowRight" size={14} /></Link>
      </div>

      {error && <div className="pf-error" role="alert">{error}</div>}

      {loading ? (
        <p className="pf-empty">Loading…</p>
      ) : items.length === 0 ? (
        <div className="pp-empty">
          <span className="pp-empty-icon"><Icon name="video" size={22} /></span>
          <div>
            <strong>No practice interviews yet</strong>
            <p>Have a practice video call with Alex. Your scores will appear here so you can see yourself improve.</p>
          </div>
          <Link className="primary-button" to="/interview">
            Start a practice call <Icon name="arrowRight" size={15} />
          </Link>
        </div>
      ) : (
        <>
          <div className="pp-stats">
            <div className="pp-stat">
              <span>Latest score</span>
              <strong className={`is-${tone(latest.overall)}`}>{latest.overall}<small>/100</small></strong>
            </div>
            <div className="pp-stat">
              <span>Best score</span>
              <strong>{best}<small>/100</small></strong>
            </div>
            <div className="pp-stat">
              <span>Practice calls</span>
              <strong>{items.length}</strong>
            </div>
            <div className="pp-stat">
              <span>Since your first call</span>
              <strong className={change > 0 ? 'is-up' : change < 0 ? 'is-down' : ''}>
                {change === null ? '-' : change > 0 ? `+${change}` : change}
              </strong>
            </div>
          </div>

          {items.length > 1 && <ScoreChart items={items} />}

          <ul className="pp-sessions">
            {shown.map((item) => <Session key={item.id} item={item} onDelete={remove} />)}
          </ul>

          {items.length > 5 && (
            <button type="button" className="pp-more" onClick={() => setShowAll((s) => !s)}>
              {showAll ? 'Show fewer' : `Show all ${items.length} results`}
            </button>
          )}

          <p className="pp-note">Only your scores are saved - never what you said in the call.</p>
        </>
      )}
    </section>
  )
}
