import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import './page-feedback.css'
import { api } from './api'
import { Icon } from './icons'

/*
  "Was this page helpful?" at the bottom of each page. Answers are anonymous
  (no name or account is saved) and show up in the Admin dashboard, where they
  can be downloaded for the Task 3 feedback analysis.
*/

const HIDDEN_ON = ['/admin', '/login', '/signup', '/forgot-password', '/reset-password', '/interview']

function FeedbackBox({ page }) {
  const [state, setState] = useState('ask') // ask | comment | sending | done
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  const send = async (helpful, text = '') => {
    setError('')
    setState('sending')
    try {
      await api.sendFeedback({ page, helpful, comment: text })
      setState('done')
    } catch (err) {
      setError(err.message)
      setState(helpful ? 'ask' : 'comment')
    }
  }

  return (
    <aside className="pfb" aria-label="Page feedback">
      <div className="pfb-inner">
        {state === 'done' ? (
          <p className="pfb-thanks" role="status">
            <span className="pfb-tick"><Icon name="check" size={14} /></span>
            Thanks for your feedback!
          </p>
        ) : state === 'comment' || (state === 'sending' && comment) ? (
          <form
            className="pfb-form"
            onSubmit={(e) => { e.preventDefault(); send(false, comment) }}
          >
            <label htmlFor="pfb-comment">What could be better? (optional)</label>
            <textarea
              id="pfb-comment"
              rows="3"
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Please don't include personal details."
            />
            {error && <p className="pfb-error" role="alert">{error}</p>}
            <div className="pfb-actions">
              <button type="button" className="pfb-skip" onClick={() => send(false, '')} disabled={state === 'sending'}>
                Skip
              </button>
              <button type="submit" className="pfb-send" disabled={state === 'sending'}>
                {state === 'sending' ? 'Sending…' : 'Send feedback'}
              </button>
            </div>
          </form>
        ) : (
          <div className="pfb-ask">
            <p>Was this page helpful?</p>
            <div className="pfb-buttons">
              <button type="button" onClick={() => send(true)} disabled={state === 'sending'}>Yes</button>
              <button type="button" onClick={() => setState('comment')} disabled={state === 'sending'}>No</button>
            </div>
            {error && <p className="pfb-error" role="alert">{error}</p>}
          </div>
        )}
      </div>
    </aside>
  )
}

export function PageFeedback() {
  const { pathname } = useLocation()
  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null
  // Keyed by page, so it resets when you move to another page.
  return <FeedbackBox key={pathname} page={pathname} />
}
