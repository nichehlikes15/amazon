import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './interview.css'
import { api } from '../modules/api'
import { useAuth } from '../modules/auth'
import { Icon, PathwayIcon } from '../modules/icons'
import InterviewerVideo from './interviewer-video'
import { canSpeak, useVoices, findVoice, speakNatural, voiceLabel, isNatural, savedVoiceURI, saveVoiceURI } from '../modules/voice'

/*
  Interview practice "call".
  - The interviewer (Alex) reads each question out loud with the browser's
    built-in voice (speechSynthesis).
  - You answer out loud (the browser's speech-to-text) or by typing.
  - Your camera can show as a preview so it feels like a real call. Nothing is
    recorded or uploaded - the video never leaves your device.
  - At the end your written answers are sent to /api/interview/review for
    feedback. They are checked on our server and not saved.
*/

const PATHWAYS = ['Digital', 'Business', 'Media', 'Finance', 'Engineering']
const INTERVIEWER = 'Alex'

const SpeechRecognition =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
const hasCamera = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function ScoreRing({ value, size = 140 }) {
  const r = (size - 14) / 2
  const c = 2 * Math.PI * r
  const tone = value >= 75 ? 'good' : value >= 50 ? 'ok' : 'low'
  return (
    <div className={`iv-ring is-${tone}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="iv-ring-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="iv-ring-fill"
          strokeDasharray={c}
          style={{ '--offset': c * (1 - value / 100), '--full': c }}
        />
      </svg>
      <span className="iv-ring-num">{value}<small>/100</small></span>
    </div>
  )
}

/* ---------- Voice picker (set up screen) ---------- */
const PREVIEW_LINE = `Hi, I'm ${INTERVIEWER}. Thanks for joining me. This is how I'll sound in your practice interview.`

function VoicePicker({ voiceURI, setVoiceURI }) {
  const voices = useVoices()
  const [playing, setPlaying] = useState(false)
  const stopRef = useRef(null)

  useEffect(() => () => stopRef.current?.(), [])

  if (!voices.length) return null
  const current = voices.find((v) => v.voiceURI === voiceURI) || voices[0]
  const best = voices[0]
  const naturalCount = voices.filter(isNatural).length

  const preview = () => {
    if (playing) {
      stopRef.current?.()
      setPlaying(false)
      return
    }
    setPlaying(true)
    stopRef.current = speakNatural(PREVIEW_LINE, { voice: current, onEnd: () => setPlaying(false) })
  }

  const choose = (uri) => {
    stopRef.current?.()
    setPlaying(false)
    setVoiceURI(uri)
  }

  return (
    <div className="iv-voice">
      <label htmlFor="iv-voice-select">{INTERVIEWER}'s voice</label>
      <div className="iv-voice-row">
        <select id="iv-voice-select" value={current.voiceURI} onChange={(e) => choose(e.target.value)}>
          {naturalCount > 0 && (
            <optgroup label="Most natural">
              {voices.filter(isNatural).map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>{voiceLabel(v)}</option>
              ))}
            </optgroup>
          )}
          <optgroup label={naturalCount > 0 ? 'Other voices' : 'Voices on this device'}>
            {voices.filter((v) => !isNatural(v)).map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>{voiceLabel(v)}</option>
            ))}
          </optgroup>
        </select>
        <button type="button" className={playing ? 'iv-voice-play is-playing' : 'iv-voice-play'} onClick={preview}>
          <Icon name={playing ? 'close' : 'play'} size={14} />
          {playing ? 'Stop' : 'Listen'}
        </button>
      </div>
      <p className="iv-voice-hint">
        {isNatural(best)
          ? 'Voices marked Natural sound the most like a real person.'
          : 'This browser only has basic voices, so they can sound a bit robotic. Microsoft Edge and Google Chrome have more natural voices built in.'}
        {' '}On a Mac you can add better voices in System Settings &gt; Accessibility &gt; Spoken Content &gt;
        System voice &gt; Manage voices, then reload this page.
      </p>
    </div>
  )
}

/* ---------- 1. Set up ---------- */
function Setup({ pathway, setPathway, mode, setMode, voiceOn, setVoiceOn, voiceURI, setVoiceURI, cameraWanted, setCameraWanted, onStart, loading, error }) {
  return (
    <section className="iv-setup">
      <div className="iv-setup-grid">
        <div className="iv-setup-card">
          <h2>Set up your practice</h2>

          <fieldset className="iv-fieldset">
            <legend>Which pathway are you interviewing for?</legend>
            <div className="iv-options">
              {PATHWAYS.map((p) => (
                <label key={p} className={pathway === p ? 'iv-option is-on' : 'iv-option'}>
                  <input type="radio" name="pathway" value={p} checked={pathway === p} onChange={() => setPathway(p)} />
                  <PathwayIcon pathway={p} size={16} />
                  {p}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="iv-fieldset">
            <legend>How do you want to answer?</legend>
            <div className="iv-modes">
              <label className={mode === 'speak' ? 'iv-mode is-on' : 'iv-mode'} aria-disabled={!SpeechRecognition}>
                <input type="radio" name="mode" value="speak" checked={mode === 'speak'} onChange={() => setMode('speak')} disabled={!SpeechRecognition} />
                <span className="iv-mode-icon"><Icon name="video" size={18} /></span>
                <strong>Speak</strong>
                <span>{SpeechRecognition ? 'Answer out loud, like a real call' : 'Not supported in this browser - try Chrome, Edge or Safari'}</span>
              </label>
              <label className={mode === 'type' ? 'iv-mode is-on' : 'iv-mode'}>
                <input type="radio" name="mode" value="type" checked={mode === 'type'} onChange={() => setMode('type')} />
                <span className="iv-mode-icon"><Icon name="text" size={18} /></span>
                <strong>Type</strong>
                <span>Write your answers - good for a quiet place</span>
              </label>
            </div>
          </fieldset>

          <div className="iv-checks">
            {canSpeak && (
              <label className="iv-check">
                <input type="checkbox" checked={voiceOn} onChange={(e) => setVoiceOn(e.target.checked)} />
                <span className="iv-check-box" aria-hidden="true"><Icon name="check" size={12} /></span>
                Read the questions out loud
              </label>
            )}
            {canSpeak && voiceOn && <VoicePicker voiceURI={voiceURI} setVoiceURI={setVoiceURI} />}
            {hasCamera && (
              <label className="iv-check">
                <input type="checkbox" checked={cameraWanted} onChange={(e) => setCameraWanted(e.target.checked)} />
                <span className="iv-check-box" aria-hidden="true"><Icon name="check" size={12} /></span>
                Show my camera (only you can see it)
              </label>
            )}
          </div>

          {error && <div className="iv-error" role="alert">{error}</div>}

          <button type="button" className="primary-button iv-start" onClick={onStart} disabled={loading}>
            {loading ? 'Connecting…' : 'Start the call'}
            {!loading && <Icon name="arrowRight" size={15} />}
          </button>
          <p className="iv-small">
            5 questions · about 10 minutes · video call · nothing is recorded or saved
          </p>
        </div>

        <aside className="iv-tips">
          <p className="iv-kicker">Before you start</p>
          <h3>Use the STAR method</h3>
          <ol className="iv-star">
            <li><strong>S</strong><span><b>Situation</b> - set the scene. When and where?</span></li>
            <li><strong>T</strong><span><b>Task</b> - what needed to happen?</span></li>
            <li><strong>A</strong><span><b>Action</b> - what did <em>you</em> do? Say "I", not "we".</span></li>
            <li><strong>R</strong><span><b>Result</b> - how did it end, and what did you learn?</span></li>
          </ol>
          <p className="iv-small">
            Take a moment to think before you answer - that's normal in a real interview too.
          </p>
        </aside>
      </div>
    </section>
  )
}

/* ---------- 2. The call ---------- */
const GREETING = `Hi, I'm ${INTERVIEWER}. Thanks for joining me today. Don't worry, this is just practice, so take your time. Okay, let's get started.`
const ACKS = ['Thanks, that\'s really helpful.', 'Great, thank you.', 'Okay, thanks for sharing that.', 'Lovely, thank you.']

function Call({ questions, mode, voiceOn, setVoiceOn, voiceURI, cameraDefault, onFinish, onQuit }) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState(() => questions.map(() => ''))
  const [interim, setInterim] = useState('')
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [asking, setAsking] = useState(false)
  const [wordTick, setWordTick] = useState(0)
  const [caption, setCaption] = useState('')
  const [captionsOn, setCaptionsOn] = useState(true)
  const [connecting, setConnecting] = useState(true)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [showStar, setShowStar] = useState(false)

  const recRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const startedAt = useRef(Date.now())
  const timings = useRef(questions.map(() => 0))
  const answerStart = useRef(null)
  const wantListening = useRef(false)
  const voiceRef = useRef(voiceOn)
  const fakeTimer = useRef(null)
  const captionTimer = useRef(null)
  const askTimer = useRef(null)
  const speechStop = useRef(null)
  voiceRef.current = voiceOn

  const q = questions[index]
  const last = index === questions.length - 1

  // Call timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((Date.now() - startedAt.current) / 1000), 1000)
    return () => clearInterval(t)
  }, [])

  // "Connecting..." for a moment, like joining a real call
  useEffect(() => {
    const t = setTimeout(() => setConnecting(false), 1600)
    return () => clearTimeout(t)
  }, [])

  // ---- Interviewer speech (with moving mouth + captions) ----
  const stopSpeech = () => {
    speechStop.current?.()
    speechStop.current = null
    clearTimeout(fakeTimer.current)
    setSpeaking(false)
  }

  const finishLine = () => {
    setSpeaking(false)
    clearTimeout(captionTimer.current)
    captionTimer.current = setTimeout(() => setCaption(''), 2200)
  }

  const speakLine = (text) => {
    stopSpeech()
    clearTimeout(captionTimer.current)
    setCaption(text)
    setAsking(true)
    clearTimeout(askTimer.current)
    askTimer.current = setTimeout(() => setAsking(false), 1400)

    if (canSpeak && voiceRef.current) {
      // One sentence at a time with natural pauses, in the chosen voice.
      speechStop.current = speakNatural(text, {
        voice: findVoice(voiceURI),
        onStart: () => setSpeaking(true),
        onWord: () => setWordTick((n) => n + 1),
        onEnd: () => {
          speechStop.current = null
          finishLine()
        },
      })
    } else {
      // Voice off: the interviewer still "talks" silently with captions.
      const words = text.split(/\s+/).length
      setSpeaking(true)
      fakeTimer.current = setTimeout(finishLine, Math.max(1800, (words / 2.6) * 1000))
    }
  }

  // Ask each question once the call has connected
  useEffect(() => {
    if (connecting) return undefined
    const lead = index === 0 ? GREETING : ACKS[(index - 1) % ACKS.length]
    const t = setTimeout(() => speakLine(`${lead} ${q.text}`), index === 0 ? 350 : 500)
    return () => { clearTimeout(t); stopSpeech() }
  }, [index, connecting]) // eslint-disable-line react-hooks/exhaustive-deps

  // Turning the voice off mid-question stops the speech
  useEffect(() => {
    if (!voiceOn && speechStop.current) {
      speechStop.current()
      speechStop.current = null
      finishLine()
    }
  }, [voiceOn]) // eslint-disable-line react-hooks/exhaustive-deps

  const repeat = () => speakLine(q.text)

  // ---- Speech-to-text ----
  const stopListening = () => {
    wantListening.current = false
    try { recRef.current?.stop() } catch { /* already stopped */ }
    setListening(false)
    setInterim('')
    if (answerStart.current) {
      timings.current[index] += (Date.now() - answerStart.current) / 1000
      answerStart.current = null
    }
  }

  const startListening = () => {
    if (!SpeechRecognition) return
    stopSpeech()
    const rec = new SpeechRecognition()
    rec.lang = 'en-GB'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (e) => {
      let finalText = ''
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interimText += r[0].transcript
      }
      if (finalText) {
        setAnswers((prev) => prev.map((a, i) => (i === index ? `${a} ${finalText}`.trim() : a)))
      }
      setInterim(interimText)
    }
    // Browsers stop listening after a pause - carry on until the user stops.
    rec.onend = () => {
      if (wantListening.current) {
        try { rec.start() } catch { setListening(false) }
      } else setListening(false)
    }
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        wantListening.current = false
        setListening(false)
        setCameraError('Microphone access was blocked. Allow it in your browser, or type your answer.')
      }
    }
    recRef.current = rec
    wantListening.current = true
    answerStart.current = Date.now()
    try {
      rec.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }

  // ---- Your camera (only shown on your screen) ----
  const startCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      setCameraOn(true)
    } catch {
      setCameraError('We couldn\'t turn on your camera. You can still do the practice without it.')
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }

  useEffect(() => {
    if (cameraDefault && navigator.mediaDevices?.getUserMedia) startCamera()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current
  }, [cameraOn])

  // Tidy up when leaving the call
  useEffect(() => () => {
    wantListening.current = false
    try { recRef.current?.stop() } catch { /* ignore */ }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    speechStop.current?.()
    if (canSpeak) window.speechSynthesis.cancel()
    clearTimeout(fakeTimer.current)
    clearTimeout(captionTimer.current)
    clearTimeout(askTimer.current)
  }, [])

  const goNext = () => {
    if (listening) stopListening()
    stopSpeech()
    if (last) {
      const payload = questions.map((qq, i) => ({
        id: qq.id,
        answer: answers[i],
        seconds: mode === 'speak' && timings.current[i] > 0 ? Math.round(timings.current[i]) : null,
      }))
      onFinish(payload)
    } else {
      setIndex((i) => i + 1)
      setInterim('')
    }
  }

  const words = answers[index].split(/\s+/).filter(Boolean).length

  return (
    <section className="iv-call" aria-label="Practice interview call">
      <div className="iv-call-bar">
        <span className="iv-live"><span className="iv-live-dot" /> Practice call</span>
        <span className="iv-progress-text">Question {index + 1} of {questions.length}</span>
        <span className="iv-clock" aria-label="Call length">{formatClock(elapsed)}</span>
      </div>
      <div className="iv-progress" aria-hidden="true">
        <span style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
      </div>

      {/* Video feed */}
      <div className={speaking ? 'iv-stage is-speaking' : 'iv-stage'}>
        <InterviewerVideo speaking={speaking} listening={listening} asking={asking} wordTick={wordTick} />

        <span className="iv-tag">
          <span className={speaking ? 'iv-bars is-on' : 'iv-bars'} aria-hidden="true"><span /><span /><span /></span>
          {INTERVIEWER} · Practice interviewer
        </span>

        {/* Your camera, picture-in-picture */}
        <div className={listening ? 'iv-pip is-listening' : 'iv-pip'}>
          {cameraOn ? (
            <video ref={videoRef} className="iv-video" autoPlay playsInline muted />
          ) : (
            <div className="iv-pip-off">
              <Icon name="video" size={20} />
              <span>Camera off</span>
            </div>
          )}
          <span className="iv-pip-name">You{listening ? ' · speaking' : ''}</span>
        </div>

        {captionsOn && caption && (
          <p className="iv-caption" aria-live="polite">{caption}</p>
        )}

        <div className={connecting ? 'iv-connecting' : 'iv-connecting is-done'} aria-hidden={!connecting}>
          <span className="iv-spinner" />
          <span>Connecting to {INTERVIEWER}…</span>
        </div>
      </div>

      {/* Question + answer */}
      <div className="iv-qa" key={q.id}>
        <p className="iv-asks">{INTERVIEWER} asks</p>
        <h2 className="iv-question">{q.text}</h2>
        <p className="iv-focus"><Icon name="check" size={14} /> {q.focus}</p>

        <label className="iv-answer-label" htmlFor="iv-answer">
          Your answer {mode === 'speak' && '(you can also edit it)'}
        </label>
        <div className={listening ? 'iv-answer-wrap is-listening' : 'iv-answer-wrap'}>
          <textarea
            id="iv-answer"
            className="iv-answer"
            rows={6}
            value={answers[index] + (interim ? ` ${interim}` : '')}
            onChange={(e) => {
              const v = e.target.value
              setAnswers((prev) => prev.map((a, i) => (i === index ? v : a)))
            }}
            placeholder={mode === 'speak' ? 'Press Answer and start talking…' : 'Type your answer here…'}
            readOnly={listening}
          />
          <span className="iv-words">{words} words</span>
        </div>
        {cameraError && <p className="iv-warn" role="status">{cameraError}</p>}
      </div>

      {/* Call controls */}
      <div className="iv-controls">
        {mode === 'speak' && SpeechRecognition && (
          <button
            type="button"
            className={listening ? 'iv-ctrl is-on' : 'iv-ctrl'}
            onClick={listening ? stopListening : startListening}
            aria-pressed={listening}
          >
            <span className="iv-ctrl-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" />
              </svg>
            </span>
            {listening ? 'Stop' : 'Answer'}
          </button>
        )}
        <button type="button" className={cameraOn ? 'iv-ctrl' : 'iv-ctrl is-on-soft'} onClick={cameraOn ? stopCamera : startCamera} aria-pressed={cameraOn}>
          <span className="iv-ctrl-icon"><Icon name="video" size={20} /></span>
          {cameraOn ? 'Camera on' : 'Camera off'}
        </button>
        {canSpeak && (
          <button type="button" className={voiceOn ? 'iv-ctrl' : 'iv-ctrl is-on-soft'} onClick={() => setVoiceOn(!voiceOn)} aria-pressed={voiceOn}>
            <span className="iv-ctrl-icon"><Icon name={voiceOn ? 'volume' : 'mute'} size={20} /></span>
            {voiceOn ? 'Voice on' : 'Voice off'}
          </button>
        )}
        <button type="button" className={captionsOn ? 'iv-ctrl' : 'iv-ctrl is-on-soft'} onClick={() => setCaptionsOn((c) => !c)} aria-pressed={captionsOn}>
          <span className="iv-ctrl-icon"><Icon name="captions" size={20} /></span>
          Captions
        </button>
        <button type="button" className="iv-ctrl" onClick={repeat} disabled={connecting}>
          <span className="iv-ctrl-icon"><Icon name="motion" size={20} /></span>
          Repeat
        </button>
        <button type="button" className="iv-ctrl" onClick={() => setShowStar((s) => !s)} aria-expanded={showStar}>
          <span className="iv-ctrl-icon"><Icon name="book" size={20} /></span>
          STAR tips
        </button>
        <button type="button" className="iv-ctrl iv-ctrl-end" onClick={onQuit}>
          <span className="iv-ctrl-icon"><Icon name="close" size={20} /></span>
          End call
        </button>
        <button type="button" className="primary-button iv-next" onClick={goNext} disabled={connecting}>
          {last ? 'Finish and get feedback' : 'Next question'}
          <Icon name="arrowRight" size={15} />
        </button>
      </div>

      {showStar && (
        <div className="iv-star-pop" role="note">
          <strong>STAR:</strong> Situation (when/where) · Task (what was needed) · Action (what <em>you</em> did) · Result (how it ended, what you learned)
        </div>
      )}
    </section>
  )
}

/* ---------- 3. Feedback ---------- */
function Feedback({ result, pathway, onAgain }) {
  return (
    <section className="iv-feedback">
      <div className="iv-summary">
        <ScoreRing value={result.overall} />
        <div className="iv-summary-text">
          <p className="iv-kicker">{pathway} practice interview</p>
          <h2>{result.verdict}</h2>
          {result.bestQuestion && (
            <p className="iv-best"><Icon name="check" size={15} /> Your strongest answer: “{result.bestQuestion}”</p>
          )}
          <div className="iv-summary-actions">
            <button type="button" className="primary-button" onClick={onAgain}>
              Practise again <Icon name="arrowRight" size={15} />
            </button>
            <Link className="secondary-button" to="/alumni/coffee-chats">Talk to someone for real</Link>
          </div>
        </div>
      </div>

      {result.focusOn.length > 0 && (
        <div className="iv-focus-list">
          <h3>Three things to work on</h3>
          <ol>
            {result.focusOn.map((t) => <li key={t}>{t}</li>)}
          </ol>
        </div>
      )}

      <div className="iv-reviews">
        <h3>Question by question</h3>
        {result.reviews.map((r, i) => (
          <details className="iv-review" key={r.id} open={i === 0}>
            <summary>
              <span className="iv-review-n">{String(i + 1).padStart(2, '0')}</span>
              <span className="iv-review-q">{r.question}</span>
              <span className={`iv-review-score is-${r.score >= 75 ? 'good' : r.score >= 50 ? 'ok' : 'low'}`}>{r.score}</span>
            </summary>
            <div className="iv-review-body">
              <p className="iv-review-focus">What this question tests: {r.focus.toLowerCase()}</p>
              <blockquote className="iv-review-answer">
                {r.answer || <em>No answer given</em>}
              </blockquote>
              <p className="iv-review-meta">
                {r.words} words{r.pace ? ` · about ${r.pace} words a minute` : ''}
              </p>
              <div className="iv-review-cols">
                {r.strengths.length > 0 && (
                  <div>
                    <h4 className="is-good">What went well</h4>
                    <ul>{r.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
                  </div>
                )}
                {r.tips.length > 0 && (
                  <div>
                    <h4 className="is-tip">How to improve</h4>
                    <ul>{r.tips.map((s) => <li key={s}>{s}</li>)}</ul>
                  </div>
                )}
              </div>
            </div>
          </details>
        ))}
      </div>

      <p className="iv-small iv-disclaimer">
        This feedback comes from automatic checks for structure, detail and clarity. It is a guide to
        help you practise - it is not used by Amazon and is not a real interview result.
      </p>
    </section>
  )
}

/* ---------- Page ---------- */
function Interview() {
  const { user } = useAuth()
  const [stage, setStage] = useState('setup') // setup | call | reviewing | feedback
  const [pathway, setPathway] = useState('Digital')
  const [mode, setMode] = useState(SpeechRecognition ? 'speak' : 'type')
  const [voiceOn, setVoiceOn] = useState(canSpeak)
  const [voiceURI, setVoiceURIState] = useState(savedVoiceURI)
  const setVoiceURI = (uri) => { setVoiceURIState(uri); saveVoiceURI(uri) }
  const [cameraWanted, setCameraWanted] = useState(hasCamera)
  const [questions, setQuestions] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Start with the pathway from the career quiz, if there is one.
  useEffect(() => {
    if (user?.quizPathway && PATHWAYS.includes(user.quizPathway)) setPathway(user.quizPathway)
  }, [user])

  const start = async () => {
    setError('')
    setLoading(true)
    try {
      const data = await api.interviewQuestions(pathway)
      setQuestions(data.questions)
      setStage('call')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const finish = async (answers) => {
    setStage('reviewing')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    try {
      const data = await api.reviewInterview(answers)
      setResult(data)
      setStage('feedback')
    } catch (err) {
      setError(err.message)
      setStage('setup')
    }
  }

  return (
    <main className="iv">
      <header className={stage === 'setup' ? 'iv-hero' : 'iv-hero is-compact'}>
        <div className="iv-hero-inner">
          <p className="iv-kicker">Interview practice</p>
          <h1>Practise with a <span>virtual interviewer</span></h1>
          {stage === 'setup' && (
            <p className="iv-lead">
              Jump on a practice video call. {INTERVIEWER} will ask you five real interview questions,
              then you'll get feedback on every answer and tips to improve.
            </p>
          )}
        </div>
      </header>

      <div className="iv-body">
        {stage === 'setup' && (
          <Setup
            pathway={pathway} setPathway={setPathway}
            mode={mode} setMode={setMode}
            voiceOn={voiceOn} setVoiceOn={setVoiceOn}
            voiceURI={voiceURI} setVoiceURI={setVoiceURI}
            cameraWanted={cameraWanted} setCameraWanted={setCameraWanted}
            onStart={start} loading={loading} error={error}
          />
        )}

        {stage === 'call' && (
          <Call
            questions={questions}
            mode={mode}
            voiceOn={voiceOn}
            setVoiceOn={setVoiceOn}
            voiceURI={voiceURI}
            cameraDefault={cameraWanted}
            onFinish={finish}
            onQuit={() => setStage('setup')}
          />
        )}

        {stage === 'reviewing' && (
          <div className="iv-reviewing" role="status">
            <span className="iv-spinner" aria-hidden="true" />
            <h2>{INTERVIEWER} is writing your feedback…</h2>
          </div>
        )}

        {stage === 'feedback' && result && (
          <Feedback result={result} pathway={pathway} onAgain={() => { setResult(null); setStage('setup') }} />
        )}
      </div>
    </main>
  )
}

export default Interview
