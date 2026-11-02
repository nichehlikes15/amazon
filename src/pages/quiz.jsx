import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import './quiz.css'
import { api } from '../modules/api'
import { useAuth } from '../modules/auth'
import { Icon, PathwayIcon, closingLabel } from '../modules/icons'
import { MENTORS } from '../modules/mentors'

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

// What to do next, made for the pathway you matched: read about it, practise
// an interview for it, talk to someone, see matching opportunities, register.
function NextSteps({ pathway }) {
  const [opps, setOpps] = useState(null)
  useEffect(() => {
    let live = true
    api.listOpportunities()
      .then((d) => { if (live) setOpps((d.items || []).filter((o) => o.pathway === pathway).slice(0, 3)) })
      .catch(() => { if (live) setOpps([]) })
    return () => { live = false }
  }, [pathway])

  const anchor = pathway.toLowerCase()
  const person = MENTORS.find((m) => m.pathway === pathway)
  const steps = [
    {
      title: `Read about ${pathway}`,
      text: `What you study on the ${pathway} pathway, and the jobs it can lead to.`,
      links: [{ to: `/information#${anchor}`, label: `Explore ${pathway}` }],
    },
    {
      title: 'Practise an interview',
      text: `A practice call with Alex or Peccy, with a question about ${pathway} and four general ones.`,
      links: [
        { to: `/interview?pathway=${pathway}`, label: 'Start a practice call' },
        { to: '/guides/interview-prep', label: 'Interview tips' },
      ],
    },
    {
      title: 'Talk to someone',
      text: person
        ? `${person.firstName} is on the ${pathway} pathway and happy to have a short chat.`
        : 'A relaxed chat with a T Level student, a placement alum or an Amazon buddy.',
      links: [{ to: '/alumni/coffee-chats', label: 'Book a coffee chat' }],
    },
    {
      title: 'Register your interest',
      text: 'Tell the Amazon Emerging Talent team you are interested in this pathway.',
      links: [{ to: `/register-interest?pathway=${pathway}`, label: 'Register interest' }],
    },
  ]

  return (
    <section className="qz-next" aria-labelledby="qz-next-title">
      <h3 id="qz-next-title">Your next steps</h3>
      <ol className="qz-next-steps">
        {steps.map((s, n) => (
          <li key={s.title} style={{ '--n': n }}>
            <span className="qz-next-n" aria-hidden="true">{String(n + 1).padStart(2, '0')}</span>
            <h4>{s.title}</h4>
            <p>{s.text}</p>
            <div className="qz-next-links">
              {s.links.map((l) => (
                <Link key={l.to} to={l.to}>{l.label} <Icon name="arrowRight" size={14} /></Link>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <div className="qz-next-opps">
        <h4>{pathway} opportunities</h4>
        {opps === null ? (
          <p className="qz-next-quiet">Loading…</p>
        ) : opps.length === 0 ? (
          <p className="qz-next-quiet">There are no {pathway} opportunities listed right now.</p>
        ) : (
          <ul>
            {opps.map((o) => {
              const closing = closingLabel(o.closingDate)
              return (
                <li key={o.id}>
                  <Link to={`/opportunities/${o.id}`}>{o.title}</Link>
                  <span>{o.location}{closing ? ` · ${closing.text}` : ''}</span>
                </li>
              )
            })}
          </ul>
        )}
        <Link className="qz-next-all" to="/opportunities">See all opportunities <Icon name="arrowRight" size={14} /></Link>
      </div>
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
              <span className="qz-qnum">Question {asked.length + 1}</span>
              <span className="qz-qmax">up to {MAX_QUESTIONS}</span>
            </div>
            <div className="qz-progress" aria-hidden="true">
              <div className="qz-progress-fill" style={{ width: `${progress}%` }} />
            </div>

            {currentQuestion && (
              // Keyed by question so each new one slides in instead of swapping instantly.
              <div className="qz-swap" key={currentQuestion.id}>
                <h2 className="qz-question">{currentQuestion.text}</h2>
                <div className="qz-answers">
                  {ANSWERS.map((a) => (
                    <button
                      key={a.label}
                      type="button"
                      className="qz-answer"
                      onClick={() => answer(a.factor)}
                    >
                      <span>{a.label}</span>
                      <Icon name="arrowRight" size={16} />
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
                  </div>
                )
              })}
            </div>

            <NextSteps pathway={topPathway} />
            <button type="button" className="qz-restart" onClick={restart}>Start again</button>
          </section>
        )}
      </div>
    </main>
  )
}

export default Quiz
