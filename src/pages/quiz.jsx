import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import './quiz.css'
import { api } from '../modules/api'
import { useAuth } from '../modules/auth'
import { Icon, PathwayIcon, closingLabel } from '../modules/icons'

const PATHWAYS = ['Digital', 'Business', 'Media', 'Finance', 'Engineering']

// Each question maps to exactly ONE pathway, and every pathway has the same
// number of questions (2 each), so no pathway gets an unfair advantage.
const QUESTIONS = [
  { id: 'code', pathway: 'Digital', text: 'Do you enjoy solving problems with computers or writing code?' },
  { id: 'data', pathway: 'Digital', text: 'Do you find working with data and spotting patterns interesting?' },
  { id: 'organise', pathway: 'Business', text: 'Do you like organising people, plans or projects?' },
  { id: 'lead', pathway: 'Business', text: 'Do you see yourself leading a team or running operations one day?' },
  { id: 'create', pathway: 'Media', text: 'Do you enjoy being creative - design, writing or making content?' },
  { id: 'communicate', pathway: 'Media', text: 'Do you like communicating ideas and telling stories to an audience?' },
  { id: 'numbers', pathway: 'Finance', text: 'Are you comfortable and confident working with numbers?' },
  { id: 'budget', pathway: 'Finance', text: 'Would you enjoy managing budgets, reporting or analysis?' },
  { id: 'build', pathway: 'Engineering', text: 'Do you like building or understanding how physical things work?' },
  { id: 'handson', pathway: 'Engineering', text: 'Do you prefer hands-on, practical work over desk work?' },
]

const ANSWERS = [
  { label: 'Yes', factor: 1 },
  { label: 'Probably', factor: 0.5 },
  { label: 'Not sure', factor: 0 },
  { label: 'Probably not', factor: -0.5 },
  { label: 'No', factor: -1 },
]

// Click the "Question 1" label to show how each answer is scored (and the
// totals at the end). Remembered on this device.
const SCORING_KEY = 'launchpad-quiz-scoring'

// +1, +0.5, 0, −0.5, −1
const points = (n) => (n > 0 ? `+${n}` : n < 0 ? `\u2212${Math.abs(n)}` : '0')

const MAX_QUESTIONS = 8
const CONFIDENCE_TO_STOP = 3

function emptyScores() {
  return Object.fromEntries(PATHWAYS.map((p) => [p, 0]))
}

// Random order for tie-breaks, so the first question isn't always Digital.
function shuffled(list) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// Ask about the pathway we know least about first, so every pathway gets a
// fair hearing. Ties are broken by the random order, not the list order.
function pickNext(order, alreadyAsked, currentScores) {
  const remaining = order.filter((q) => !alreadyAsked.includes(q.id))
  if (remaining.length === 0) return null
  const timesAsked = Object.fromEntries(PATHWAYS.map((p) => [p, 0]))
  alreadyAsked.forEach((id) => {
    const q = QUESTIONS.find((item) => item.id === id)
    if (q) timesAsked[q.pathway] += 1
  })
  const best = [...remaining].sort((a, b) => {
    if (timesAsked[a.pathway] !== timesAsked[b.pathway]) {
      return timesAsked[a.pathway] - timesAsked[b.pathway]
    }
    return currentScores[b.pathway] - currentScores[a.pathway]
  })
  return best[0]
}

// Open opportunities for the pathway you matched (soonest closing first),
// with a link to all of them on the Opportunities page.
const OPPS_SHOWN = 3

const shorten = (text, max = 130) => {
  const s = (text || '').trim()
  if (s.length <= max) return s
  return `${s.slice(0, max).replace(/\s+\S*$/, '')}…`
}

function MatchedOpportunities({ pathway }) {
  const [opps, setOpps] = useState(null)
  useEffect(() => {
    let live = true
    api.listOpportunities()
      .then((d) => {
        if (!live) return
        const open = (d.items || [])
          .filter((o) => o.pathway === pathway && closingLabel(o.closingDate)?.tone !== 'closed')
          .sort((x, y) => (x.closingDate || '9999').localeCompare(y.closingDate || '9999'))
        setOpps(open)
      })
      .catch(() => { if (live) setOpps([]) })
    return () => { live = false }
  }, [pathway])

  const shown = opps ? opps.slice(0, OPPS_SHOWN) : []

  return (
    <section className="qz-opps" aria-labelledby="qz-opps-title">
      <h3 id="qz-opps-title">{pathway} opportunities</h3>
      {opps && opps.length > 0 && (
        <p className="qz-opps-lead">
          {opps.length === 1 ? 'One role is' : `${opps.length} roles are`} open on the {pathway} pathway right now.
        </p>
      )}

      {opps === null && (
        <ol className="qz-opps-list" aria-hidden="true">
          {[0, 1, 2].map((n) => (
            <li key={n} className="qz-opp is-loading">
              <span className="qz-sk qz-sk-n" />
              <span className="qz-sk qz-sk-title" />
              <span className="qz-sk qz-sk-line" />
              <span className="qz-sk qz-sk-line is-short" />
            </li>
          ))}
        </ol>
      )}

      {opps && opps.length === 0 && (
        <div className="qz-opps-empty">
          <span className="qz-opps-empty-icon" aria-hidden="true"><Icon name="search" size={22} /></span>
          <p>There are no {pathway} opportunities open right now. New roles are added through the year.</p>
        </div>
      )}

      {shown.length > 0 && (
        <ol className="qz-opps-list">
          {shown.map((o, n) => {
            const closing = closingLabel(o.closingDate)
            return (
              <li key={o.id} className="qz-opp" style={{ '--n': n }}>
                <span className="qz-opp-n" aria-hidden="true">{String(n + 1).padStart(2, '0')}</span>
                <div className="qz-opp-tags">
                  {closing && (
                    <span className={`qz-opp-closing is-${closing.tone}`}>
                      <Icon name="clock" size={13} /> {closing.text}
                    </span>
                  )}
                  {o.type && <span className="qz-opp-type">{o.type}</span>}
                </div>
                <h4 className="qz-opp-title">
                  <Link to={`/opportunities/${o.id}`}>{o.title}</Link>
                </h4>
                <p className="qz-opp-meta">{[o.employer, o.location].filter(Boolean).join(' · ')}</p>
                {o.summary && <p className="qz-opp-summary">{shorten(o.summary)}</p>}
                <div className="qz-opp-actions">
                  <Link className="qz-opp-btn is-light" to={`/opportunities/${o.id}`}>View details</Link>
                  {o.applyUrl && (
                    <a className="qz-opp-btn is-apply" href={o.applyUrl} target="_blank" rel="noopener noreferrer">
                      Apply <Icon name="external" size={14} />
                      <span className="visually-hidden"> (opens in a new tab)</span>
                    </a>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {/* Opens the full list with no filter, so it's never empty */}
      <Link className="qz-opps-all" to="/opportunities">
        See all opportunities
        <Icon name="arrowRight" size={15} />
      </Link>
    </section>
  )
}

function Quiz() {
  const { user } = useAuth()
  // Everyone starts from zero - nothing is decided before you answer.
  const [order, setOrder] = useState(() => shuffled(QUESTIONS))
  const [scores, setScores] = useState(emptyScores)
  const [asked, setAsked] = useState([])
  const [currentId, setCurrentId] = useState(() => pickNext(order, [], emptyScores())?.id ?? null)
  const [finished, setFinished] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [explaining, setExplaining] = useState(false)
  const [showScoring, setShowScoringState] = useState(() => {
    try { return localStorage.getItem(SCORING_KEY) === 'on' } catch { return false }
  })
  const toggleScoring = () => {
    const on = !showScoring
    setShowScoringState(on)
    try { localStorage.setItem(SCORING_KEY, on ? 'on' : 'off') } catch { /* private mode */ }
  }

  const currentQuestion = useMemo(
    () => QUESTIONS.find((q) => q.id === currentId) || null,
    [currentId],
  )

  const ranking = useMemo(
    () => [...PATHWAYS].sort((a, b) => scores[b] - scores[a]),
    [scores],
  )
  const topPathway = ranking[0]

  const answer = (factor) => {
    if (!currentQuestion) return
    const next = { ...scores, [currentQuestion.pathway]: scores[currentQuestion.pathway] + factor }
    const nowAsked = [...asked, currentQuestion.id]
    setScores(next)
    setAsked(nowAsked)

    const sorted = [...PATHWAYS].sort((a, b) => next[b] - next[a])
    const gap = next[sorted[0]] - next[sorted[1]]
    const nextQ = pickNext(order, nowAsked, next)
    const everyPathwayAsked = nowAsked.length >= PATHWAYS.length

    if ((gap >= CONFIDENCE_TO_STOP && everyPathwayAsked) || nowAsked.length >= MAX_QUESTIONS || !nextQ) {
      setFinished(true)
      setCurrentId(null)
    } else {
      setCurrentId(nextQ.id)
    }
  }

  const restart = () => {
    const newOrder = shuffled(QUESTIONS)
    setOrder(newOrder)
    setScores(emptyScores())
    setAsked([])
    setFinished(false)
    setExplanation('')
    setCurrentId(pickNext(newOrder, [], emptyScores())?.id ?? null)
  }

  // Only once the quiz is finished, ask the backend for the explanation.
  useEffect(() => {
    if (!finished) return
    // Signed-in students get the result saved so their profile can tick it off.
    if (user) api.saveQuizResult(topPathway).catch(() => {})
    setExplaining(true)
    api.explainPathway(scores)
      .then((data) => setExplanation(data.explanation || ''))
      .catch(() => setExplanation(''))
      .finally(() => setExplaining(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  const progress = Math.round((asked.length / MAX_QUESTIONS) * 100)

  return (
    <main className="qz">
      <header className="qz-hero">
        <div className="qz-hero-inner">
          <p className="qz-kicker">Career quiz</p>
          <h1>Find your <span>pathway</span></h1>
          <p className="qz-lead">
            Answer a few quick questions. We'll only show your result once you've finished.
          </p>
        </div>
      </header>

      <div className="qz-body">
        {!finished ? (
          <section className="qz-step" aria-live="polite">
            <div className="qz-progress-row">
              <button
                type="button"
                className={showScoring ? 'qz-qnum is-on' : 'qz-qnum'}
                onClick={toggleScoring}
                aria-pressed={showScoring}
                title={showScoring ? 'Hide how the answers are scored' : 'Show how the answers are scored'}
              >
                Question {asked.length + 1}
              </button>
              <span className="qz-qmax">up to {MAX_QUESTIONS}</span>
            </div>
            <div className="qz-progress" aria-hidden="true">
              <div className="qz-progress-fill" style={{ width: `${progress}%` }} />
            </div>

            {currentQuestion && (
              // Keyed by question so each new one slides in instead of swapping instantly.
              <div className="qz-swap" key={currentQuestion.id}>
                <h2 className="qz-question">{currentQuestion.text}</h2>
                {showScoring && (
                  <p className="qz-scoring-note">
                    This question counts towards <strong>{currentQuestion.pathway}</strong>.
                  </p>
                )}
                <div className={showScoring ? 'qz-answers is-scoring' : 'qz-answers'}>
                  {ANSWERS.map((a) => (
                    <button
                      key={a.label}
                      type="button"
                      className="qz-answer"
                      onClick={() => answer(a.factor)}
                    >
                      <span>{a.label}</span>
                      <span className="qz-answer-end">
                        <span className="qz-points" aria-hidden={!showScoring}>
                          {points(a.factor)} {currentQuestion.pathway}
                        </span>
                        <Icon name="arrowRight" size={16} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className="qz-result qz-swap">
            <div className="qz-result-head">
              <p className="qz-kicker">Your best match</p>
              <span className="qz-result-icon" aria-hidden="true">
                <PathwayIcon pathway={topPathway} size={28} />
              </span>
              <h2 className="qz-result-title">{topPathway}</h2>
            </div>

            <div className="qz-why">
              <h3>Why this fits you</h3>
              <p>{explaining ? 'Thinking about your answers…' : explanation}</p>
            </div>

            <div className="qz-breakdown">
              <h3>How your answers scored</h3>
              {ranking.map((p) => {
                const top = Math.max(1, scores[topPathway])
                const pct = Math.max(0, Math.round((scores[p] / top) * 100))
                return (
                  <div className={p === topPathway ? 'qz-bar-row is-top' : 'qz-bar-row'} key={p}>
                    <span className="qz-bar-label">{p}</span>
                    <div className="qz-bar"><div className="qz-bar-fill" style={{ width: `${pct}%` }} /></div>
                    {showScoring && <span className="qz-bar-score">{points(scores[p])}</span>}
                  </div>
                )
              })}
            </div>

            <MatchedOpportunities pathway={topPathway} />
            <button type="button" className="qz-restart" onClick={restart}>Start again</button>
          </section>
        )}
      </div>
    </main>
  )
}

export default Quiz
