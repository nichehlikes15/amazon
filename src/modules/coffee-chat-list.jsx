import { useState } from 'react'
import './coffee-chat-list.css'
import { api } from './api'
import { Icon } from './icons'
import { STATUS_HELP, formatChatTime, downloadChatIcs } from './mentors'

// A student's own coffee chat requests: status, the confirmed time and
// meeting link once the team adds them, and a cancel option while waiting.
// Used on the Coffee chats page and on My Profile.
export function CoffeeChatList({ items, onUpdate }) {
  const [confirming, setConfirming] = useState(null)
  const [busy, setBusy] = useState(null)
  const [errors, setErrors] = useState({})

  const cancel = async (id) => {
    setBusy(id)
    setErrors((e) => ({ ...e, [id]: '' }))
    try {
      const data = await api.cancelMyCoffeeChat(id)
      onUpdate(data.request)
      setConfirming(null)
    } catch (err) {
      setErrors((e) => ({ ...e, [id]: err.message }))
    } finally {
      setBusy(null)
    }
  }

  return (
    <ul className="ccl">
      {items.map((r) => {
        const status = r.status || 'Requested'
        const tone = status.toLowerCase()
        const when = formatChatTime(r.confirmedTime)
        // Only ever link to https:// addresses.
        const link = r.meetingLink && r.meetingLink.startsWith('https://') ? r.meetingLink : null
        const showMeeting = (status === 'Confirmed' || status === 'Completed') && (when || link)
        const help = status === 'Confirmed' && when ? null : STATUS_HELP[status]

        return (
          <li key={r.id} className={`ccl-item is-${tone}`}>
            <span className="ccl-avatar" aria-hidden="true">{r.mentor.charAt(0)}</span>

            <div className="ccl-main">
              <div className="ccl-top">
                <strong>Coffee chat with {r.mentor}</strong>
                <span className={`ccl-status is-${tone}`}>{status}</span>
              </div>
              <span className="ccl-sub">
                You asked for {r.preferredTime}{r.topic ? ` · ${r.topic}` : ''}
              </span>
              {help && <span className="ccl-help">{help}</span>}

              {showMeeting && (
                <div className="ccl-meeting">
                  {when && (
                    <span className="ccl-when">
                      <Icon name="calendar" size={15} />
                      {when}
                    </span>
                  )}
                  {status === 'Confirmed' && (
                    <span className="ccl-meeting-actions">
                      {r.confirmedTime && (
                        <button type="button" className="ccl-cal" onClick={() => downloadChatIcs(r)}>
                          <Icon name="calendar" size={14} /> Add to calendar
                        </button>
                      )}
                      {link && (
                        <a className="ccl-join" href={link} target="_blank" rel="noopener noreferrer">
                          Join chat <Icon name="external" size={14} />
                        </a>
                      )}
                    </span>
                  )}
                </div>
              )}

              {status === 'Requested' && (
                confirming === r.id ? (
                  <div className="ccl-confirm" role="group" aria-label="Confirm cancelling this request">
                    <span>Cancel this request?</span>
                    <button
                      type="button"
                      className="ccl-yes"
                      onClick={() => cancel(r.id)}
                      disabled={busy === r.id}
                    >
                      {busy === r.id ? 'Cancelling…' : 'Yes, cancel'}
                    </button>
                    <button type="button" className="ccl-no" onClick={() => setConfirming(null)}>
                      Keep it
                    </button>
                  </div>
                ) : (
                  <button type="button" className="ccl-cancel" onClick={() => setConfirming(r.id)}>
                    Cancel request
                  </button>
                )
              )}

              {errors[r.id] && <span className="ccl-error" role="alert">{errors[r.id]}</span>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
