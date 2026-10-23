import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import './quiz.css'
import { api } from '../modules/api'
import { useAuth } from '../modules/auth'

const PATHWAYS = ['Digital', 'Business', 'Media', 'Finance', 'Engineering']

// Each question maps an answer onto exactly ONE pathway, and every pathway
// gets the SAME number of questions (2 each), so no single pathway is
// over-represented. A "Yes" adds to that pathway; "No" subtracts.
const QUESTIONS = [
  // Digital
  { id: 'code', pathway: 'Digital', text: 'Do you enjoy solving problems with computers or writing code?' },
  { id: 'data', pathway: 'Digital', text: 'Do you find working with data and spotting patterns interesting?' },
  // Business
  { id: 'organise', pathway: 'Business', text: 'Do you like organising people, plans or projects?' },
  { id: 'lead', pathway: 'Business', text: 'Do you see yourself leading a team or running operations one day?' },
  // Media
  { id: 'create', pathway: 'Media', text: 'Do you enjoy being creative - design, writing or making content?' },
  { id: 'communicate', pathway: 'Media', text: 'Do you like communicating ideas and telling stories to an audience?' },
  // Finance
  { id: 'numbers', pathway: 'Finance', text: 'Are you comfortable and confident working with numbers?' },
  { id: 'budget', pathway: 'Finance', text: 'Would you enjoy managing budgets, reporting or analysis?' },
  // Engineering
  { id: 'build', pathway: 'Engineering', text: 'Do you like building or understanding how physical things work?' },
  { id: 'handson', pathway: 'Engineering', text: 'Do you prefer hands-on, practical work over desk work?' },
]

// Weighted answer options - this is what gives it the Akinator feel.
const ANSWERS = [
  { label: 'Yes', factor: 1 },
  { label: 'Probably', factor: 0.5 },
  { label: 'Not sure', factor: 0 },
  { label: 'Probably not', factor: -0.5 },
  { label: 'No', factor: -1 },
]

const MAX_QUESTIONS = 8
const CONFIDENCE_TO_STOP = 3 // leader must be this far ahead to finish early

function emptyScores() {
  return Object.fromEntries(PATHWAYS.map((p) => [p, 0]))
}

function Quiz() {
  const { user } = useAuth()
  const [scores, setScores] = useState(emptyScores)
  const [asked, setAsked] = useState([])
  const [currentId, setCurrentId] = useState(null)
  const [finished, setFinished] = useState(false)
  const [primed, setPrimed] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [explaining, setExplaining] = useState(false)

  // Personalise: if signed in, give a SMALL head start to the pathways of
  // saved opportunities (half a point each, capped) so it only nudges the
  // order of questions, never decides the result on its own.
  useEffect(() => {
    if (!user) {
      setPrimed(true)
      return
    }
    api.listSavedOpportunities()
      .then((data) => {
        const items = data.items || []
        if (items.length) {
          setScores((prev) => {
            const next = { ...prev }
            items.forEach((o) => {
              if (next[o.pathway] !== undefined) {
                next[o.pathway] = Math.min(1, next[o.pathway] + 0.5)
              }
            })
            return next
          })
        }
      })
      .catch(() => {})
      .finally(() => setPrimed(true))
  }, [user])

  // Pick the next question. Strategy: ask about the pathways we know LEAST
  // about first (fewest questions asked so far), so every pathway gets a
  // fair hearing before we start narrowing. Ties broken by current lead.
  const pickNext = (alreadyAsked, currentScores) => {
    const askedPathways = alreadyAsked
      .map((id) => QUESTIONS.find((q) => q.id === id))
      .filter(Boolean)
      .map((q) => q.pathway)

    const remaining = QUESTIONS.filter((q) => !alreadyAsked.includes(q.id))
    if (remaining.length === 0) return null

    // How many questions each pathway has had so far.
    const timesAsked = Object.fromEntries(PATHWAYS.map((p) => [p, 0]))
    askedPathways.forEach((p) => { timesAsked[p] += 1 })

    // Prefer the least-asked pathway; break ties by higher current score
    // (so once things are even, we dig into the front-runner).
    remaining.sort((a, b) => {
      if (timesAsked[a.pathway] !== timesAsked[b.pathway]) {
        return timesAsked[a.pathway] - timesAsked[b.pathway]
      }
      return currentScores[b.pathway] - currentScores[a.pathway]
    })
    return remaining[0]
  }

  // Prime the first question once scores are ready.
  useEffect(() => {
    if (primed && currentId === null && !finished && asked.length === 0) {
      const first = pickNext([], scores)
      setCurrentId(first ? first.id : null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primed])

  const currentQuestion = useMemo(
    () => QUESTIONS.find((q) => q.id === currentId) || null,
    [currentId],
  )

  const ranking = useMemo(
    () => [...PATHWAYS].sort((a, b) => scores[b] - scores[a]),
    [scores],
  )

  const confidence = Math.max(0, scores[ranking[0]] - scores[ranking[1]])
  const confidencePct = Math.min(100, Math.round((confidence / CONFIDENCE_TO_STOP) * 100))

  const answer = (factor) => {
    if (!currentQuestion) return
    const next = { ...scores }
    next[currentQuestion.pathway] += factor
    const nowAsked = [...asked, currentQuestion.id]
    setScores(next)
    setAsked(nowAsked)

    const sorted = [...PATHWAYS].sort((a, b) => next[b] - next[a])
    const gap = next[sorted[0]] - next[sorted[1]]
    const nextQ = pickNext(nowAsked, next)

    // Stop only after every pathway has had at least one question (>=5 asked),
    // so an early lead can't end it before the others are even considered.
    const everyPathwayAsked = nowAsked.length >= PATHWAYS.length
    if ((gap >= CONFIDENCE_TO_STOP && everyPathwayAsked) ||
        nowAsked.length >= MAX_QUESTIONS ||
        !nextQ) {
      setFinished(true)
      setCurrentId(null)
    } else {
      setCurrentId(nextQ.id)
    }
  }

  const restart = () => {
    setScores(emptyScores())
    setAsked([])
    setFinished(false)
    setExplanation('')
    // Re-pick the first question on the next tick.
    const first = pickNext([], emptyScores())
    setCurrentId(first ? first.id : null)
  }

  const topPathway = ranking[0]

  // When the quiz finishes, ask the backend for a personalised explanation.
  useEffect(() => {
    if (!finished) return
    setExplaining(true)
    api.explainPathway(scores)
      .then((data) => setExplanation(data.explanation || ''))
      .catch(() => setExplanation(''))
      .finally(() => setExplaining(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  return (
    <main className="quiz-page">
      <div className="quiz-wrap">
        <header className="quiz-top">
          <p className="quiz-eyebrow">Pathway finder</p>
          <h1>Let's find your pathway</h1>
          <p className="quiz-sub">
            Answer a few questions and I'll narrow down the T Level pathway that fits you best.
            {user ? ' Using your saved interests to start smarter.' : ''}
          </p>
        </header>

        {!finished ? (
          <section className="quiz-card">
            {currentQuestion ? (
              <>
                <div className="quiz-guess">
                  <span className="quiz-guess-label">Leaning towards</span>
                  <span className="quiz-guess-value">
                    {confidence > 0 ? topPathway : 'Still deciding…'}
                  </span>
                  <div className="quiz-confidence">
                    <div className="quiz-confidence-fill" style={{ width: `${confidencePct}%` }} />
                  </div>
                </div>

                <p className="quiz-qnum">Question {asked.length + 1}</p>
                <h2 className="quiz-question">{currentQuestion.text}</h2>

                <div className="quiz-answers">
                  {ANSWERS.map((a) => (
                    <button
                      key={a.label}
                      type="button"
                      className="quiz-answer"
                      onClick={() => answer(a.factor)}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="quiz-loading">Thinking…</p>
            )}
          </section>
        ) : (
          <section className="quiz-card quiz-result">
            <p className="quiz-eyebrow">Your best match</p>
            <h2 className="quiz-result-title">{topPathway}</h2>
            <p className="quiz-result-text">
              Based on your answers, the <strong>{topPathway}</strong> pathway looks like the
              strongest fit. Explore what it involves, or see live opportunities in it.
            </p>
            <div className="quiz-result-actions">
              <Link className="quiz-primary" to="/information">Explore {topPathway}</Link>
              <Link className="quiz-ghost" to="/opportunities">See opportunities</Link>
            </div>

            <div className="quiz-ai">
              <div className="quiz-ai-head">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.5z" />
                </svg>
                <h3>Why this fits you</h3>
              </div>
              {explaining ? (
                <p className="quiz-ai-text">Thinking about your answers…</p>
              ) : (
                <p className="quiz-ai-text">{explanation}</p>
              )}
            </div>

            <div className="quiz-breakdown">
              <h3>How your answers scored</h3>
              {ranking.map((p) => {
                const top = Math.max(1, scores[topPathway])
                const pct = Math.max(0, Math.round((scores[p] / top) * 100))
                return (
                  <div className="quiz-bar-row" key={p}>
                    <span className="quiz-bar-label">{p}</span>
                    <div className="quiz-bar"><div className="quiz-bar-fill" style={{ width: `${pct}%` }} /></div>
                  </div>
                )
              })}
            </div>

            <button type="button" className="quiz-ghost quiz-restart" onClick={restart}>
              Start again
            </button>
          </section>
        )}
      </div>
    </main>
  )
}

export default Quiz
