import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './assistant.css'
import { api } from './api'
import { useAuth } from './auth'
import { Icon } from './icons'
import { canSpeak, findVoice, savedVoiceURI, speakNatural } from './voice'

/*
  Ask Launchpad: a help chat in the corner of every page. It answers
  questions about T Levels and the site using only facts from Launchpad, with
  the local AI if it's running. Nothing typed here is saved. Answers can be
  read aloud for people with sight loss.

  Two views: Home (greeting, suggested questions, popular pages) and the chat.
  The Home button goes back to the start; your chat is kept until you start a
  new one.
*/

// On /interview it shows on the set-up and results screens, and is hidden
// only while the practice call is running (see interview.jsx and assistant.css).
const HIDDEN_ON = ['/admin']

const SUGGESTIONS = [
  'How long is a placement?',
  'Which pathway suits me?',
  'How do I book a coffee chat?',
  'Is there help for parents?',
  'How do I track my applications?',
  'Can the page be read aloud?',
]

const POPULAR = [
  { to: '/opportunities', label: 'Opportunities', icon: 'search' },
  { to: '/quiz', label: 'Career quiz', icon: 'all' },
  { to: '/interview', label: 'Interview practice', icon: 'video' },
  { to: '/alumni/coffee-chats', label: 'Coffee chats', icon: 'users' },
  { to: '/community', label: 'Question board', icon: 'chat' },
  { to: '/help', label: 'Help', icon: 'book' },
]

export function AskLaunchpad() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('home') // home | chat
  const [large, setLarge] = useState(false)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [speaking, setSpeaking] = useState(null)
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const stopRef = useRef(null)

  const stopSpeaking = () => {
    stopRef.current?.()
    stopRef.current = null
    setSpeaking(null)
  }

  // Keep the newest message in view
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, busy, view])

  useEffect(() => {
    if (!open) return undefined
    inputRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') { stopRef.current?.(); setOpen(false) } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, view])

  useEffect(() => () => stopRef.current?.(), [])

  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null

  const close = () => {
    stopSpeaking()
    setOpen(false)
  }

  const goHome = () => {
    stopSpeaking()
    setView('home')
  }

  const newChat = () => {
    stopSpeaking()
    setMessages([])
    setView('home')
  }

  const send = async (question) => {
    const q = question.trim()
    if (!q || busy) return
    const history = messages.slice(-6).map((m) => ({ role: m.role, text: m.text }))
    setView('chat')
    setMessages((list) => [...list, { role: 'user', text: q }])
    setText('')
    setBusy(true)
    try {
      const r = await api.askAssistant({ message: q, history })
      setMessages((list) => [...list, { role: 'assistant', text: r.answer, links: r.links || [], ai: r.source === 'ai', safety: r.safety }])
    } catch (err) {
      setMessages((list) => [...list, { role: 'assistant', text: err.message || "Sorry, I couldn't answer that just now.", links: [] }])
    } finally {
      setBusy(false)
    }
  }

  const readAloud = (i, words) => {
    if (speaking === i) { stopSpeaking(); return }
    stopSpeaking()
    setSpeaking(i)
    stopRef.current = speakNatural(words, {
      voice: findVoice(savedVoiceURI()),
      onEnd: () => { stopRef.current = null; setSpeaking(null) },
    })
  }

  const firstName = user?.fullName?.split(' ')[0]

  return (
    <div className="ask-lp">
      {open && (
        <section className={large ? 'ask-lp-panel is-large' : 'ask-lp-panel'} role="dialog" aria-label="Ask Launchpad">
          <header className="ask-lp-head">
            <span className="ask-lp-head-icon"><Icon name="chat" size={18} /></span>
            <div className="ask-lp-head-text">
              <strong>Ask Launchpad</strong>
              <span>Questions about T Levels and this site</span>
            </div>
            <div className="ask-lp-head-actions">
              {view === 'chat' && (
                <button type="button" className="ask-lp-head-btn" onClick={goHome} aria-label="Go to the Ask Launchpad home screen" title="Home">
                  <Icon name="home" size={17} />
                </button>
              )}
              <button type="button" className="ask-lp-head-btn ask-lp-size" onClick={() => setLarge((v) => !v)}
                aria-label={large ? 'Make the chat smaller' : 'Make the chat bigger'} title={large ? 'Smaller' : 'Bigger'}>
                <Icon name={large ? 'shrink' : 'expand'} size={16} />
              </button>
              <button type="button" className="ask-lp-head-btn" onClick={close} aria-label="Close Ask Launchpad" title="Close">
                <Icon name="close" size={18} />
              </button>
            </div>
          </header>

          {view === 'home' ? (
            <div className="ask-lp-home" key="home">
              <h2>{firstName ? `Hi ${firstName}, how can I help?` : 'Hi, how can I help?'}</h2>
              <p>Ask me anything about T Levels, placements or how to use Launchpad.</p>

              {messages.length > 0 && (
                <div className="ask-lp-resume">
                  <button type="button" className="ask-lp-resume-main" onClick={() => setView('chat')}>
                    <Icon name="chat" size={16} />
                    <span>
                      <strong>Carry on with your chat</strong>
                      <small>{messages.filter((m) => m.role === 'user').length} questions so far</small>
                    </span>
                    <Icon name="arrowRight" size={15} />
                  </button>
                  <button type="button" className="ask-lp-text-btn" onClick={newChat}>Start a new chat</button>
                </div>
              )}

              <h3>Try asking</h3>
              <div className="ask-lp-chips">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)}>{s}</button>
                ))}
              </div>

              <h3>Popular pages</h3>
              <ul className="ask-lp-pages">
                {POPULAR.map((p) => (
                  <li key={p.to}>
                    <Link to={p.to} onClick={close}>
                      <Icon name={p.icon} size={16} />
                      <span>{p.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="ask-lp-list" ref={listRef} aria-live="polite" key="chat">
              {messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'ask-lp-msg is-you' : `ask-lp-msg${m.safety ? ' is-safety' : ''}`}>
                  <p>{m.text}</p>
                  {m.role === 'assistant' && (
                    <div className="ask-lp-msg-foot">
                      {m.links?.map((l) => (
                        <Link key={l.to} to={l.to} onClick={close}>{l.label} <Icon name="arrowRight" size={12} /></Link>
                      ))}
                      {canSpeak && (
                        <button type="button" className="ask-lp-read" onClick={() => readAloud(i, m.text)}
                          aria-label={speaking === i ? 'Stop reading' : 'Read this answer aloud'}>
                          <Icon name={speaking === i ? 'pause' : 'volume'} size={14} />
                        </button>
                      )}
                      {m.ai && <span className="ask-lp-ai">AI</span>}
                    </div>
                  )}
                </div>
              ))}
              {busy && <div className="ask-lp-msg is-typing" aria-label="Thinking"><span /><span /><span /></div>}
            </div>
          )}

          <form className="ask-lp-form" onSubmit={(e) => { e.preventDefault(); send(text) }}>
            <label className="visually-hidden" htmlFor="ask-lp-input">Your question</label>
            <input id="ask-lp-input" ref={inputRef} value={text} onChange={(e) => setText(e.target.value)}
              maxLength={500} placeholder="Type a question…" autoComplete="off" />
            <button type="submit" disabled={!text.trim() || busy} aria-label="Send">
              <Icon name="send" size={17} />
            </button>
          </form>
          <p className="ask-lp-note">Answers use Launchpad&apos;s own pages and can be wrong. Please don&apos;t share personal details.</p>
        </section>
      )}

      <button
        type="button"
        className={open ? 'ask-lp-btn is-open' : 'ask-lp-btn'}
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
      >
        <Icon name={open ? 'close' : 'chat'} size={20} />
        <span>{open ? 'Close' : 'Ask Launchpad'}</span>
      </button>
    </div>
  )
}
