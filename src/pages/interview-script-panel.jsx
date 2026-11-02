import { useEffect, useRef, useState } from 'react'
import { api } from '../modules/api'
import { Icon } from '../modules/icons'
import { useScript, saveScript, clearScript, filledCount } from '../modules/interview-script'

/*
  The hidden "Scripted replies" panel (see modules/interview-script.js).
  Write what the interviewer should say for each question. Empty boxes use
  the normal AI / rule-based reply. Saved as you type, in this browser only.
*/

const PATHWAYS = ['Digital', 'Business', 'Media', 'Finance', 'Engineering']

// Asked instead of the "problem" question when "Ask me about my CV" is ticked.
const CV_QUESTION = {
  id: 'cv',
  text: 'The question about your CV (only asked when "Ask me about my CV" is ticked - it replaces the problem question).',
}

export default function ScriptPanel({ pathway: startPathway, who, onClose }) {
  const script = useScript()
  const [pathway, setPathway] = useState(startPathway)
  const [questions, setQuestions] = useState(null)
  const [error, setError] = useState('')
  const [closing, setClosing] = useState(false)
  const panelRef = useRef(null)

  // The questions for the chosen pathway (the first, third, fourth and last are the same for every pathway).
  useEffect(() => {
    let live = true
    api.interviewQuestions(pathway, false)
      .then((d) => {
        if (!live) return
        const list = []
        d.questions.forEach((q) => {
          list.push(q)
          if (q.id === 'problem') list.push(CV_QUESTION)
        })
        setQuestions(list)
        setError('')
      })
      .catch((err) => { if (live) setError(err.message) })
    return () => { live = false }
  }, [pathway])

  const close = () => {
    setClosing(true)
    setTimeout(onClose, 200)
  }
  const closeRef = useRef(close)
  useEffect(() => { closeRef.current = close })

  useEffect(() => {
    panelRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const setItem = (id, kind, value) => {
    const item = { ...(script.items[id] || {}), [kind]: value }
    saveScript({ ...script, items: { ...script.items, [id]: item } })
  }
  const setOn = (on) => saveScript({ ...script, on })
  const setSummary = (summary) => saveScript({ ...script, summary })
  const clearAll = () => {
    if (window.confirm('Clear every scripted reply and turn scripted replies off?')) clearScript()
  }

  const filled = filledCount(script)

  return (
    <div
      className={closing ? 'ivs-backdrop is-closing' : 'ivs-backdrop'}
      onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div className="ivs-panel" role="dialog" aria-modal="true" aria-labelledby="ivs-title" tabIndex={-1} ref={panelRef}>
        <div className="ivs-head">
          <div>
            <h2 id="ivs-title">Scripted replies</h2>
            <p className="ivs-intro">
              When this is on, {who} says what you write here. Leave a box empty to use the normal reply.
              Scores still come from the normal scoring rules. Saved in this browser only.
            </p>
          </div>
          <button type="button" className="ivs-close" onClick={close} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="ivs-bar">
          <label className="iv-switch ivs-switch">
            <input type="checkbox" checked={script.on} onChange={(e) => setOn(e.target.checked)} />
            <span className="iv-switch-track" aria-hidden="true" />
            <span>{script.on ? 'Scripted replies are on' : 'Scripted replies are off'}</span>
          </label>
          <span className="ivs-count">{filled} {filled === 1 ? 'reply' : 'replies'} written</span>
          <label className="ivs-pathway">
            <span>Questions for</span>
            <select value={pathway} onChange={(e) => setPathway(e.target.value)}>
              {PATHWAYS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        </div>

        {error && <p className="ivs-error" role="alert">We couldn't load the questions: {error}</p>}
        {!questions && !error && <p className="ivs-loading">Loading the questions…</p>}

        {questions && (
          <ol className="ivs-list">
            {questions.map((q, n) => {
              const item = script.items[q.id] || {}
              const isClose = q.id === 'close'
              return (
                <li key={q.id} className="ivs-q">
                  <span className="ivs-n" aria-hidden="true">{String(n + 1).padStart(2, '0')}</span>
                  <div className="ivs-q-body">
                    <p className="ivs-q-text">{q.text}</p>
                    {!isClose && (
                      <label className="ivs-field">
                        <span>Follow-up question</span>
                        <textarea
                          rows={2}
                          value={item.followUp || ''}
                          onChange={(e) => setItem(q.id, 'followUp', e.target.value)}
                          placeholder={`Empty: ${who} decides whether to ask one`}
                        />
                      </label>
                    )}
                    <label className="ivs-field">
                      <span>{isClose ? `What ${who} says after your questions` : `What ${who} says after the answer`}</span>
                      <textarea
                        rows={3}
                        value={item.feedback || ''}
                        onChange={(e) => setItem(q.id, 'feedback', e.target.value)}
                        placeholder="Empty: the normal reply"
                      />
                    </label>
                  </div>
                </li>
              )
            })}
            <li className="ivs-q">
              <span className="ivs-n" aria-hidden="true"><Icon name="check" size={18} /></span>
              <div className="ivs-q-body">
                <p className="ivs-q-text">The summary on the results page</p>
                <label className="ivs-field">
                  <span>Summary</span>
                  <textarea
                    rows={3}
                    value={script.summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Empty: the normal summary"
                  />
                </label>
              </div>
            </li>
          </ol>
        )}

        <div className="ivs-foot">
          <button type="button" className="ivs-clear" onClick={clearAll}>Clear everything</button>
          <button type="button" className="ivs-done" onClick={close}>Done</button>
        </div>
      </div>
    </div>
  )
}
