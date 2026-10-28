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
                <span>{SpeechRecognition ? 'Answer out loud - Alex listens after each question' : 'Not supported in this browser - try Chrome, Edge or Safari'}</span>
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
const GREETING = `Hi, I'm ${INTERVIEWER}. Thanks for joining me today. Don't worry, this is just practice, so take your time. After each answer I'll give you some quick feedback. Okay, let's get started.`
const NEXT_LEADS = ['Okay, next question.', "Right, here's the next one.", 'Okay, moving on.', 'Great. Next question.']
const RETRY_LINE = "Sure. Have another go whenever you're ready."
// When you stop talking for this long (after saying enough), Alex takes that as your answer.
const SILENCE_MS = 5000
const MIN_WORDS = 12

const MIC_ERRORS = {
  'not-allowed': 'Your microphone is blocked for this site. Allow it in your browser (look for the microphone icon in the address bar), then press Answer. Or type your answer below.',
  'service-not-allowed': "This browser won't let the page turn speech into text. Try Chrome or Edge, or type your answer below.",
  'audio-capture': 'No microphone was found. Check one is connected and allowed, then press Answer. Or type your answer below.',
  network: 'Speech-to-text needs an internet connection in this browser. Check your connection and press Answer, or type your answer below.',
  'language-not-supported': "Speech-to-text isn't available in English in this browser. Try Chrome or Edge, or type your answer below.",
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Short feedback shown straight after each answer.
function LiveFeedback({ review, answer, onRetry }) {
  if (review.error) {
    return (
      <div className="iv-live-fb is-error" role="alert">
        <p>We couldn't get feedback for that answer: {review.error}</p>
        <button type="button" className="iv-retry" onClick={onRetry}>
          <Icon name="motion" size={14} /> Try this answer again
        </button>
      </div>
    )
  }
  const tone = review.score >= 75 ? 'good' : review.score >= 50 ? 'ok' : 'low'
  return (
    <div className="iv-live-fb" role="status">
      <div className="iv-live-fb-head">
        <span className={`iv-review-score is-${tone}`}>{review.score}</span>
        <strong>Quick feedback</strong>
        <button type="button" className="iv-retry" onClick={onRetry}>
          <Icon name="motion" size={14} /> Try this answer again
        </button>
      </div>
      {answer ? (
        <blockquote className="iv-live-fb-answer">{answer}</blockquote>
      ) : (
        <p className="iv-live-fb-empty">No answer was picked up for this question.</p>
      )}
      <div className="iv-review-cols">
        {review.strengths.length > 0 && (
          <div>
            <h4 className="is-good">What went well</h4>
            <ul>{review.strengths.slice(0, 2).map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
        )}
        {review.tips.length > 0 && (
          <div>
            <h4 className="is-tip">Try this</h4>
            <ul>{review.tips.slice(0, 2).map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  )
}

function Call({ questions, mode, voiceOn, setVoiceOn, voiceURI, cameraDefault, onFinish, onQuit }) {
  const canListen = mode === 'speak' && Boolean(SpeechRecognition)

  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState(() => questions.map(() => ''))
  const [reviews, setReviews] = useState(() => questions.map(() => null))
  // asking -> answering -> checking -> feedback, for each question
  const [phase, setPhaseState] = useState('asking')
  const [listening, setListening] = useState(false)
  const [hearing, setHearing] = useState(false)
  const [quietTooLong, setQuietTooLong] = useState(false)
  const [micError, setMicError] = useState('')
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

  const mounted = useRef(true)
  const phaseRef = useRef('asking')
  const indexRef = useRef(0)
  const answersRef = useRef(answers)
  const voiceRef = useRef(voiceOn)
  indexRef.current = index
  voiceRef.current = voiceOn

  // Interviewer speech
  const speechStop = useRef(null)
  const lineToken = useRef(null)
  const lineDone = useRef(null)
  const fakeTimer = useRef(null)
  const safetyTimer = useRef(null)
  const captionTimer = useRef(null)
  const askTimer = useRef(null)

  // Listening to you
  const recRef = useRef(null)
  const wantListening = useRef(false)
  const fatal = useRef(false)
  const restarts = useRef(0)
  const baseRef = useRef('')
  const sessionRef = useRef('')
  const lastHeard = useRef(0)
  const listenStart = useRef(0)
  const answerStart = useRef(null)
  const timings = useRef(questions.map(() => 0))

  // Camera
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const startedAt = useRef(Date.now())

  const q = questions[index]
  const last = index === questions.length - 1
  const review = reviews[index]

  const setPhase = (p) => {
    phaseRef.current = p
    setPhaseState(p)
  }
  const setAnswer = (i, text) => {
    answersRef.current = answersRef.current.map((a, n) => (n === i ? text : a))
    setAnswers(answersRef.current)
  }
  const setReview = (i, r) => setReviews((prev) => prev.map((x, n) => (n === i ? r : x)))

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

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

  /* ---- Interviewer speech ---- */
  const stopSpeech = () => {
    lineToken.current = null
    lineDone.current = null
    clearTimeout(safetyTimer.current)
    clearTimeout(fakeTimer.current)
    speechStop.current?.()
    speechStop.current = null
    setSpeaking(false)
  }

  const finishLine = () => {
    setSpeaking(false)
    clearTimeout(captionTimer.current)
    captionTimer.current = setTimeout(() => setCaption(''), 2200)
  }

  // Say a line. `onDone` runs when it finishes (not if it's interrupted).
  const speakLine = (text, onDone) => {
    stopSpeech()
    clearTimeout(captionTimer.current)
    setCaption(text)
    setAsking(true)
    clearTimeout(askTimer.current)
    askTimer.current = setTimeout(() => setAsking(false), 1400)

    const token = {}
    lineToken.current = token
    const done = () => {
      if (lineToken.current !== token) return
      lineToken.current = null
      lineDone.current = null
      clearTimeout(safetyTimer.current)
      clearTimeout(fakeTimer.current)
      speechStop.current = null
      finishLine()
      if (mounted.current) onDone?.()
    }
    lineDone.current = done
    const words = text.split(/\s+/).length

    if (canSpeak && voiceRef.current) {
      speechStop.current = speakNatural(text, {
        voice: findVoice(voiceURI),
        onStart: () => setSpeaking(true),
        onWord: () => setWordTick((n) => n + 1),
        onEnd: done,
      })
      // If the browser's voice gets stuck, carry on anyway.
      safetyTimer.current = setTimeout(() => {
        speechStop.current?.()
        done()
      }, Math.max(8000, words * 700 + 5000))
    } else {
      // Voice off: Alex still "talks" silently with captions.
      setSpeaking(true)
      fakeTimer.current = setTimeout(done, Math.max(1800, (words / 2.6) * 1000))
    }
  }

  // Turning the voice off mid-line skips to the end of it
  useEffect(() => {
    if (!voiceOn && speechStop.current) {
      speechStop.current()
      speechStop.current = null
      lineDone.current?.()
    }
  }, [voiceOn])

  /* ---- Listening to your answer ---- */
  const pauseListening = () => {
    wantListening.current = false
    try { recRef.current?.stop() } catch { /* already stopped */ }
    setListening(false)
    setHearing(false)
    if (answerStart.current) {
      timings.current[indexRef.current] += (Date.now() - answerStart.current) / 1000
      answerStart.current = null
    }
  }

  const startListening = () => {
    if (!SpeechRecognition) return
    const i = indexRef.current
    setMicError('')
    setQuietTooLong(false)
    const old = recRef.current
    recRef.current = null
    try { old?.abort() } catch { /* ignore */ }

    const rec = new SpeechRecognition()
    rec.lang = 'en-GB'
    rec.continuous = true
    rec.interimResults = true
    recRef.current = rec
    baseRef.current = answersRef.current[i] || ''
    sessionRef.current = ''
    fatal.current = false
    restarts.current = 0
    wantListening.current = true
    lastHeard.current = Date.now()
    listenStart.current = Date.now()
    answerStart.current = Date.now()

    rec.onresult = (e) => {
      if (recRef.current !== rec) return
      // Rebuild everything heard so far, so no words get lost (even if the
      // browser never marks them as final).
      let heard = ''
      for (let k = 0; k < e.results.length; k += 1) heard += `${e.results[k][0].transcript} `
      heard = heard.replace(/\s+/g, ' ').trim()
      sessionRef.current = heard
      setAnswer(i, `${baseRef.current} ${heard}`.trim())
      lastHeard.current = Date.now()
      restarts.current = 0
      setHearing(true)
    }
    rec.onerror = (e) => {
      if (recRef.current !== rec) return
      if (e.error === 'no-speech' || e.error === 'aborted') return
      fatal.current = true
      wantListening.current = false
      setMicError(MIC_ERRORS[e.error] || `Speech-to-text stopped working (${e.error}). Press Answer to try again, or type your answer below.`)
    }
    rec.onend = () => {
      if (recRef.current !== rec) return
      // Keep what was heard, then carry on listening if we still want to
      // (browsers stop by themselves after a pause).
      baseRef.current = `${baseRef.current} ${sessionRef.current}`.trim()
      sessionRef.current = ''
      if (wantListening.current && !fatal.current && restarts.current < 25) {
        restarts.current += 1
        try {
          rec.start()
          return
        } catch { /* fall through */ }
      }
      wantListening.current = false
      setListening(false)
      setHearing(false)
    }

    try {
      rec.start()
      setListening(true)
    } catch {
      wantListening.current = false
      setListening(false)
      setMicError('The microphone could not start. Press Answer to try again, or type your answer below.')
    }
  }

  /* ---- Flow ---- */
  const beginAnswer = () => {
    if (!mounted.current) return
    setPhase('answering')
    if (canListen) startListening()
    else setTimeout(() => document.getElementById('iv-answer')?.focus(), 60)
  }

  const skipToAnswer = () => {
    stopSpeech()
    finishLine()
    beginAnswer()
  }

  const finishAnswer = async () => {
    if (phaseRef.current !== 'answering') return
    const i = indexRef.current
    setPhase('checking')
    pauseListening()
    if (canListen) await wait(700) // let the last few words arrive
    recRef.current = null
    if (!mounted.current || indexRef.current !== i) return
    const text = answersRef.current[i] || ''
    const seconds = canListen && timings.current[i] > 0 ? Math.round(timings.current[i]) : null
    try {
      const r = await api.reviewAnswer({ id: questions[i].id, answer: text, seconds })
      if (!mounted.current || indexRef.current !== i || phaseRef.current !== 'checking') return
      setReview(i, r)
      setPhase('feedback')
      if (r.say) speakLine(r.say)
    } catch (err) {
      if (!mounted.current || indexRef.current !== i) return
      setReview(i, { error: err.message })
      setPhase('feedback')
    }
  }

  const tryAgain = () => {
    const i = indexRef.current
    stopSpeech()
    setAnswer(i, '')
    setReview(i, null)
    timings.current[i] = 0
    setPhase('asking')
    speakLine(RETRY_LINE, beginAnswer)
  }

  const goNext = () => {
    pauseListening()
    recRef.current = null
    stopSpeech()
    if (last) {
      onFinish(questions.map((qq, i) => ({
        id: qq.id,
        answer: answersRef.current[i],
        seconds: canListen && timings.current[i] > 0 ? Math.round(timings.current[i]) : null,
      })))
    } else {
      setIndex((n) => n + 1)
    }
  }

  const repeat = () => {
    const p = phaseRef.current
    if (p === 'checking') return
    if (p === 'feedback') {
      if (review?.say) speakLine(review.say)
      return
    }
    if (p === 'answering') pauseListening()
    setPhase('asking')
    speakLine(q.text, beginAnswer)
  }

  // Ask each question once the call has connected, then start listening
  useEffect(() => {
    if (connecting) return undefined
    setPhase('asking')
    const lead = index === 0 ? GREETING : NEXT_LEADS[(index - 1) % NEXT_LEADS.length]
    const t = setTimeout(() => speakLine(`${lead} ${q.text}`, beginAnswer), index === 0 ? 350 : 500)
    return () => { clearTimeout(t); stopSpeech() }
  }, [index, connecting]) // eslint-disable-line react-hooks/exhaustive-deps

  // While listening: show when you're being heard, warn if nothing is coming
  // through, and finish the answer after a pause.
  useEffect(() => {
    if (phase !== 'answering' || !listening) return undefined
    const t = setInterval(() => {
      const now = Date.now()
      const quiet = now - lastHeard.current
      setHearing(quiet < 1300)
      const said = (answersRef.current[indexRef.current] || '').split(/\s+/).filter(Boolean).length
      setQuietTooLong(said === 0 && now - listenStart.current > 7000)
      if (said >= MIN_WORDS && quiet > SILENCE_MS) finishAnswer()
    }, 400)
    return () => clearInterval(t)
  }, [phase, listening]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- Your camera (only shown on your screen) ---- */
  const startCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      setCameraOn(true)
    } catch {
      setCameraError("We couldn't turn on your camera. You can still do the practice without it.")
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
    const rec = recRef.current
    recRef.current = null
    try { rec?.abort() } catch { /* ignore */ }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    speechStop.current?.()
    if (canSpeak) window.speechSynthesis.cancel()
    clearTimeout(fakeTimer.current)
    clearTimeout(safetyTimer.current)
    clearTimeout(captionTimer.current)
    clearTimeout(askTimer.current)
  }, [])

  const words = (answers[index] || '').split(/\s+/).filter(Boolean).length

  let status = null
  if (!connecting) {
    if (phase === 'asking') status = { tone: 'speak', text: `${INTERVIEWER} is speaking` }
    else if (phase === 'answering') {
      if (listening) status = hearing ? { tone: 'hear', text: 'Listening · I can hear you' } : { tone: 'listen', text: 'Listening · start talking' }
      else status = { tone: 'idle', text: canListen ? 'Microphone paused' : 'Type your answer below' }
    } else if (phase === 'checking') status = { tone: 'think', text: `${INTERVIEWER} is thinking…` }
    else status = { tone: 'speak', text: 'Feedback' }
  }

  const primary = {
    asking: { label: 'Answer now', onClick: skipToAnswer, disabled: connecting },
    answering: { label: 'Done answering', onClick: finishAnswer, disabled: false },
    checking: { label: `${INTERVIEWER} is thinking…`, onClick: undefined, disabled: true },
    feedback: { label: last ? 'Finish and see results' : 'Next question', onClick: goNext, disabled: false },
  }[phase]

  return (
    <section className="iv-call" aria-label="Practice interview call">
      <div className="iv-call-bar">
        <span className="iv-live"><span className="iv-live-dot" /> Practice call</span>
        <span className="iv-progress-text">Question {index + 1} of {questions.length}</span>
        <span className="iv-clock" aria-label="Call length">{formatClock(elapsed)}</span>
      </div>
      <div className="iv-progress" aria-hidden="true">
        <span style={{ width: `${((index + (phase === 'feedback' ? 1 : 0.5)) / questions.length) * 100}%` }} />
      </div>

      {/* Video feed */}
      <div className={speaking ? 'iv-stage is-speaking' : 'iv-stage'}>
        <InterviewerVideo
          speaking={speaking}
          listening={phase === 'answering' && listening}
          asking={asking}
          wordTick={wordTick}
        />

        <span className="iv-tag">
          <span className={speaking ? 'iv-bars is-on' : 'iv-bars'} aria-hidden="true"><span /><span /><span /></span>
          {INTERVIEWER} · Practice interviewer
        </span>

        {status && (
          <span className={`iv-status is-${status.tone}`} role="status" aria-live="polite">
            <span className="iv-status-dot" aria-hidden="true" />
            {status.text}
          </span>
        )}

        {/* Your camera, picture-in-picture */}
        <div className={listening && hearing ? 'iv-pip is-listening' : 'iv-pip'}>
          {cameraOn ? (
            <video ref={videoRef} className="iv-video" autoPlay playsInline muted />
          ) : (
            <div className="iv-pip-off">
              <Icon name="video" size={20} />
              <span>Camera off</span>
            </div>
          )}
          <span className="iv-pip-name">You{listening && hearing ? ' · speaking' : ''}</span>
        </div>

        {captionsOn && caption && (
          <p className="iv-caption" aria-live="polite">{caption}</p>
        )}

        <div className={connecting ? 'iv-connecting' : 'iv-connecting is-done'} aria-hidden={!connecting}>
          <span className="iv-spinner" />
          <span>Connecting to {INTERVIEWER}…</span>
        </div>
      </div>

      {/* Question, your answer, and feedback */}
      <div className="iv-qa" key={q.id}>
        <p className="iv-asks">{INTERVIEWER} asks</p>
        <h2 className="iv-question">{q.text}</h2>
        <p className="iv-focus"><Icon name="check" size={14} /> {q.focus}</p>

        {(phase === 'asking' || phase === 'answering') && (
          <>
            <label className="iv-answer-label" htmlFor="iv-answer">
              Your answer
              <span className="iv-answer-hint">
                {canListen
                  ? listening ? ' - pause the mic if you want to edit it' : ' - you can edit it, or press Answer to keep talking'
                  : ' - press Done answering when you have finished'}
              </span>
            </label>
            <div className={listening ? 'iv-answer-wrap is-listening' : 'iv-answer-wrap'}>
              <textarea
                id="iv-answer"
                className="iv-answer"
                rows={6}
                value={answers[index]}
                onChange={(e) => setAnswer(index, e.target.value)}
                placeholder={
                  canListen
                    ? phase === 'asking' ? `${INTERVIEWER} will start listening when the question is finished…` : 'Start talking - your words will appear here…'
                    : 'Type your answer here…'
                }
                readOnly={listening}
              />
              <span className="iv-words">{words} words</span>
            </div>
            {canListen && phase === 'answering' && listening && (
              <p className="iv-auto-note">
                When you've finished, stop talking for a few seconds or press Done answering.
              </p>
            )}
          </>
        )}

        {micError && <p className="iv-warn" role="alert">{micError}</p>}
        {!micError && quietTooLong && phase === 'answering' && listening && (
          <p className="iv-warn" role="status">
            {INTERVIEWER} can't hear anything yet. Check your microphone is on and allowed for this site, and try
            speaking a little louder. You can also pause the mic and type your answer.
          </p>
        )}
        {cameraError && <p className="iv-warn" role="status">{cameraError}</p>}

        {phase === 'checking' && (
          <div className="iv-thinking" role="status">
            <span className="iv-dots" aria-hidden="true"><span /><span /><span /></span>
            {INTERVIEWER} is thinking about your answer…
          </div>
        )}

        {phase === 'feedback' && review && (
          <LiveFeedback review={review} answer={answers[index]} onRetry={tryAgain} />
        )}
      </div>

      {/* Call controls */}
      <div className="iv-controls">
        {canListen && (
          <button
            type="button"
            className={listening ? 'iv-ctrl is-on' : 'iv-ctrl'}
            onClick={phase === 'answering' ? (listening ? pauseListening : startListening) : skipToAnswer}
            disabled={connecting || phase === 'checking' || phase === 'feedback'}
            aria-pressed={listening}
          >
            <span className="iv-ctrl-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" />
              </svg>
            </span>
            {listening ? 'Pause mic' : 'Answer'}
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
        <button type="button" className="iv-ctrl" onClick={repeat} disabled={connecting || phase === 'checking'}>
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
        <button type="button" className="primary-button iv-next" onClick={primary.onClick} disabled={primary.disabled}>
          {primary.label}
          {!primary.disabled && <Icon name="arrowRight" size={15} />}
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
      // Ask for the microphone now, while you're clicking, so Alex can listen during the call.
      if (mode === 'speak' && navigator.mediaDevices?.getUserMedia) {
        try {
          const mic = await navigator.mediaDevices.getUserMedia({ audio: true })
          mic.getTracks().forEach((track) => track.stop())
        } catch {
          setError(`${INTERVIEWER} needs your microphone to hear your answers. Allow it in your browser and try again, or choose Type.`)
          return
        }
      }
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
              give you quick feedback after each answer, and a full summary at the end.
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
