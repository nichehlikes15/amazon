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

