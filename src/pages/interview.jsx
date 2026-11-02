import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import './interview.css'
import { api, setApiInterviewer } from '../modules/api'
import { useAuth } from '../modules/auth'
import { Icon, PathwayIcon } from '../modules/icons'
import InterviewerVideo from './interviewer-video'
import PeccyVideo from './peccy-video'
import { createVoiceDetector } from '../modules/voice-activity'
import { canSpeak, useVoices, findVoice, speakNatural, sentences, voiceLabel, isNatural, savedVoiceURI, saveVoiceURI } from '../modules/voice'
import { SignInLink } from '../modules/return-to'
import { useScript, useSecretWord } from '../modules/interview-script'
import ScriptPanel from './interview-script-panel'

/*
  Interview practice "call".
  - The interviewer (Alex) reads each question out loud with the browser's
    built-in voice (speechSynthesis).
  - You answer out loud (the browser's speech-to-text) or by typing.
  - Your camera can show as a preview so it feels like a real call. Nothing is
    recorded or uploaded - the video never leaves your device.
  - After each answer, the backend scores it with fixed rules (the same answer
    always gets the same score). If the AI is running (a local LLM through
    Ollama - see backend/AI_SETUP.md), Alex's replies, follow-up questions and
    the end summary are written by the AI from what you actually said.
    If it isn't, Alex uses the standard rule-based replies.
  - Hidden "scripted replies" (modules/interview-script.js) can replace what
    Alex says with lines written in advance, e.g. for a demo. When they're on,
    the "Interview practice" label ends with a full stop and the live dot is a ring.
  - Answers are checked on our server and not saved.
*/

const PATHWAYS = ['Digital', 'Business', 'Media', 'Finance', 'Engineering']
// Who runs the call. Both ask the same questions and give the same feedback;
// only the name, the face and how the AI talks change.
const INTERVIEWERS = [
  { id: 'alex', name: 'Alex', blurb: 'A friendly practice interviewer' },
  { id: 'peccy', name: 'Peccy', blurb: "Amazon's cheerful orange mascot" },
]
const FACES = { alex: InterviewerVideo, peccy: PeccyVideo }
const INTERVIEWER_KEY = 'launchpad-interviewer'
const InterviewerContext = createContext(INTERVIEWERS[0])
const useInterviewer = () => useContext(InterviewerContext)

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
const previewLine = (name) => `Hi, I'm ${name}. Thanks for joining me. This is how I'll sound in your practice interview.`

function VoicePicker({ voiceURI, setVoiceURI }) {
  const INTERVIEWER = useInterviewer().name
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
    stopRef.current = speakNatural(previewLine(INTERVIEWER), { voice: current, onEnd: () => setPlaying(false) })
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
// Green only when the AI has actually replied. Orange while it's being checked
// or when Alex is using his standard replies.
function AiStatus({ status }) {
  const INTERVIEWER = useInterviewer().name
  if (!status) return null
  if (status.available) {
    return (
      <p className="iv-ai is-on" role="status">
        <span className="iv-ai-dot" aria-hidden="true" />
        <span>
          <strong>{INTERVIEWER}'s AI is on.</strong> He'll reply to what you actually say. The AI runs on the
          Launchpad server itself, not with an outside AI company.
        </span>
      </p>
    )
  }
  if (status.checking) {
    return (
      <p className="iv-ai is-checking" role="status">
        <span className="iv-ai-dot" aria-hidden="true" />
        <span>
          <strong>Checking {INTERVIEWER}'s AI…</strong> This can take up to a minute the first time. You can start
          now - {INTERVIEWER} will use standard replies until it's ready.
          {import.meta.env.DEV && status.reason && <span className="iv-ai-dev">Developer note: {status.reason}</span>}
        </span>
      </p>
    )
  }
  return (
    <p className="iv-ai is-off" role="status">
      <span className="iv-ai-dot" aria-hidden="true" />
      <span>
        <strong>{INTERVIEWER} will use standard replies today</strong> because his AI isn't working. Your scores
        and feedback work the same.
        {import.meta.env.DEV && status.reason && <span className="iv-ai-dev">Developer note: {status.reason}</span>}
      </span>
    </p>
  )
}

// The STAR method, shown under the set-up steps.
const STAR = [
  { letter: 'S', word: 'Situation', text: 'Set the scene. When and where did it happen?' },
  { letter: 'T', word: 'Task', text: 'What needed to happen, and why?' },
  { letter: 'A', word: 'Action', text: 'What did you do yourself? Say "I", not "we".' },
  { letter: 'R', word: 'Result', text: 'How did it end, and what did you learn?' },
]

function Setup({ interviewerId, setInterviewerId, pathway, setPathway, mode, setMode, voiceOn, setVoiceOn, voiceURI, setVoiceURI, cameraWanted, setCameraWanted, bargeIn, setBargeIn, aiStatus, signedIn, hasCv, useCv, setUseCv, onStart, loading, error }) {
  const INTERVIEWER = useInterviewer().name
  return (
    <>
      <section className="iv-setup" aria-label="Set up your practice call">
        {/* 01 Interviewer */}
        <div className="iv-step" role="group" aria-labelledby="iv-step-who">
          <span className="iv-step-n" aria-hidden="true">01</span>
          <h2 id="iv-step-who">Choose your interviewer</h2>
          <p className="iv-step-intro">
            Both ask the same questions and give the same feedback. Pick who you&apos;d like to talk to.
          </p>
          <div className="iv-who" role="radiogroup" aria-labelledby="iv-step-who">
            {INTERVIEWERS.map((w) => {
              const Preview = FACES[w.id]
              return (
                <label key={w.id} className={interviewerId === w.id ? 'iv-who-card is-on' : 'iv-who-card'}>
                  <input type="radio" name="interviewer" value={w.id} checked={interviewerId === w.id}
                    onChange={() => setInterviewerId(w.id)} />
                  <span className="iv-who-face" aria-hidden="true">
                    <Preview speaking={false} listening={false} asking={false} wordTick={0} />
                  </span>
                  <span className="iv-who-text">
                    <strong>{w.name}</strong>
                    <span>{w.blurb}</span>
                  </span>
                  <span className="iv-who-tick" aria-hidden="true"><Icon name="check" size={12} /></span>
                </label>
              )
            })}
          </div>
        </div>

        {/* 02 Pathway */}
        <div className="iv-step" role="group" aria-labelledby="iv-step-1">
          <span className="iv-step-n" aria-hidden="true">02</span>
          <h2 id="iv-step-1">Choose your pathway</h2>
          <p className="iv-step-intro">
            {INTERVIEWER} will ask one question about this pathway, plus four general interview questions.
          </p>
          <div className="iv-options" role="radiogroup" aria-labelledby="iv-step-1">
            {PATHWAYS.map((p) => (
              <label key={p} className={pathway === p ? 'iv-option is-on' : 'iv-option'}>
                <input type="radio" name="pathway" value={p} checked={pathway === p} onChange={() => setPathway(p)} />
                <PathwayIcon pathway={p} size={16} />
                {p}
              </label>
            ))}
          </div>
        </div>

        {/* 03 Speak or type */}
        <div className="iv-step" role="group" aria-labelledby="iv-step-2">
          <span className="iv-step-n" aria-hidden="true">03</span>
          <h2 id="iv-step-2">How do you want to answer?</h2>
          <p className="iv-step-intro">
            Speaking is the closest to a real interview. You can pause the microphone at any point to type or edit.
          </p>
          <div className="iv-modes" role="radiogroup" aria-labelledby="iv-step-2">
            <label className={mode === 'speak' ? 'iv-mode is-on' : 'iv-mode'} aria-disabled={!SpeechRecognition}>
              <input type="radio" name="mode" value="speak" checked={mode === 'speak'} onChange={() => setMode('speak')} disabled={!SpeechRecognition} />
              <span className="iv-mode-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" />
                </svg>
              </span>
              <strong>Speak</strong>
              <span>{SpeechRecognition ? `Answer out loud - ${INTERVIEWER} listens and replies` : 'Not supported in this browser - try Chrome, Edge or Safari'}</span>
            </label>
            <label className={mode === 'type' ? 'iv-mode is-on' : 'iv-mode'}>
              <input type="radio" name="mode" value="type" checked={mode === 'type'} onChange={() => setMode('type')} />
              <span className="iv-mode-icon"><Icon name="text" size={20} /></span>
              <strong>Type</strong>
              <span>Write your answers - good for a quiet place</span>
            </label>
          </div>
        </div>

        {/* 04 Settings */}
        <div className="iv-step" role="group" aria-labelledby="iv-step-3">
          <span className="iv-step-n" aria-hidden="true">04</span>
          <h2 id="iv-step-3">Call settings</h2>
          <p className="iv-step-intro">You can turn {INTERVIEWER}'s voice and your camera on or off during the call too.</p>
          <div className="iv-checks">
            {canSpeak && (
              <label className="iv-check">
                <input type="checkbox" checked={voiceOn} onChange={(e) => setVoiceOn(e.target.checked)} />
                <span className="iv-check-box" aria-hidden="true"><Icon name="check" size={12} /></span>
                <span>Read the questions out loud</span>
              </label>
            )}
            {canSpeak && voiceOn && <VoicePicker voiceURI={voiceURI} setVoiceURI={setVoiceURI} />}
            {mode === 'speak' && SpeechRecognition && (
              <label className="iv-check">
                <input type="checkbox" checked={bargeIn} onChange={(e) => setBargeIn(e.target.checked)} />
                <span className="iv-check-box" aria-hidden="true"><Icon name="check" size={12} /></span>
                <span>
                  Notice if I talk over {INTERVIEWER}
                  <span className="iv-check-hint">
                    {INTERVIEWER} will ask you to let him finish, and it takes points off, like in a real interview.
                    Works best with headphones.
                  </span>
                </span>
              </label>
            )}
            {signedIn && hasCv && (
              <label className="iv-check">
                <input type="checkbox" checked={useCv} onChange={(e) => setUseCv(e.target.checked)} />
                <span className="iv-check-box" aria-hidden="true"><Icon name="check" size={12} /></span>
                <span>
                  Ask me about my CV
                  <span className="iv-check-hint">
                    {INTERVIEWER} swaps one question for one about something on the CV you uploaded. Your CV stays on
                    the Launchpad server.
                  </span>
                </span>
              </label>
            )}
            {signedIn && !hasCv && (
              <p className="iv-cv-tip">
                <Icon name="file" size={15} />
                <span><Link to="/profile#cv">Upload your CV</Link> and {INTERVIEWER} can ask you about it.</span>
              </p>
            )}
            {hasCamera && (
              <label className="iv-check">
                <input type="checkbox" checked={cameraWanted} onChange={(e) => setCameraWanted(e.target.checked)} />
                <span className="iv-check-box" aria-hidden="true"><Icon name="check" size={12} /></span>
                <span>
                  Show my camera
                  <span className="iv-check-hint">Only you can see it. It isn't recorded.</span>
                </span>
              </label>
            )}
          </div>
        </div>

        {/* Start */}
        <div className="iv-launch">
          <AiStatus status={aiStatus} />
          {error && <div className="iv-error" role="alert">{error}</div>}
          <button type="button" className="primary-button iv-start" onClick={onStart} disabled={loading}>
            {loading ? (useCv && hasCv ? `${INTERVIEWER} is reading your CV…` : 'Connecting…') : 'Start the call'}
            {!loading && <Icon name="arrowRight" size={16} />}
          </button>
          <p className="iv-small">Your answers aren't saved. If you're signed in, your scores are saved to your profile.</p>
        </div>
      </section>

      {/* STAR method */}
      <section className="iv-star-band" aria-labelledby="iv-star-title">
        <p className="iv-kicker">Before you start</p>
        <h2 id="iv-star-title">Use the STAR method</h2>
        <p className="iv-star-lead">
          When {INTERVIEWER} asks about a time something happened, tell a short story in four parts.
        </p>
        <ol className="iv-star">
          {STAR.map((s, n) => (
            <li key={s.letter} style={{ '--n': n }}>
              <span className="iv-star-l" aria-hidden="true">{s.letter}</span>
              <h3>{s.word}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="iv-small">Take a moment to think before you answer. That's normal in a real interview too.</p>
      </section>
    </>
  )
}

/* ---------- 2. The call ---------- */
// Signed-in users are greeted by their first name. Only plain names are used,
// so the voice never reads out odd characters.
function spokenFirstName(fullName) {
  const first = (fullName || '').trim().split(/\s+/)[0] || ''
  if (!/^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F'-]{0,29}$/.test(first)) return ''
  return first.charAt(0).toUpperCase() + first.slice(1)
}

const greeting = (canInterrupt, name, pathway, roleContext, who) =>
  `Hi${name ? ` ${name}` : ''}, I'm ${who}. Thanks for joining me today. ` +
  (pathway ? `Today we're practising for a ${pathway} T Level placement at Amazon. ` : '') +
  (roleContext ? `${roleContext.split('. ')[0].replace(/\.$/, '')}. ` : '') +
  "Don't worry, this is just practice, so take your time. " +
  "I might ask a follow-up question or two, and after each answer I'll give you some quick feedback. " +
  (canInterrupt ? "Please let me finish each question before you answer, just like in a real interview. " : '') +
  "Okay, let's get started."
const NEXT_LEADS = ['Okay, next question.', "Right, here's the next one.", 'Okay, moving on.', 'Great. Next question.']
// "This one's about working with others..." so you know why Alex is asking.
const aboutLine = (focus) => (focus ? `This one's about ${focus.charAt(0).toLowerCase()}${focus.slice(1).replace(/\.$/, '')}.` : '')
const RETRY_LINE = "Sure. Have another go whenever you're ready."

// Turn-taking, in milliseconds. Like a person, Alex waits less after a finished
// sentence than after one that trails off ("...and so").
const END_COMPLETE_MS = 1300
const END_UNSURE_MS = 3000
const END_SHORT_MS = 3200
const NO_NEW_WORDS_MS = 6000
const BACKCHANNEL_AFTER_MS = 750
// How loud-for-how-long counts as your voice (not Alex's echo) while he talks.
const BARGE_IN_MS = 350
// Talking over Alex: he only stops if you say several words, not one.
const TALK_OVER_WORDS = 3
// No speech-to-text while he talks: about this long of talking instead.
const TALK_OVER_FALLBACK_MS = 1500
// What he says when you talk over him, before carrying on where he was.
const NUDGE_LINES = ['Sorry, please let me finish.', 'Just a moment, please let me finish.', 'Please let me finish first.']
// Ignore the first moment of each line, while Alex's own voice settles.
const BARGE_IN_GRACE_MS = 450
const MIN_WORDS = 8
// Follow-up answers can be short ("It worked, and we came first."), so Alex needs fewer words.
const FOLLOW_MIN_WORDS = 4
const COMMAND_WAIT_MS = 7000
// After Alex's feedback, move on by himself after this many seconds (can be cancelled).
const AUTO_SECONDS = 6
const AUTO_KEY = 'launchpad-interview-auto'

// Quick spoken reactions, so there's no dead air while Alex works out what to say.
const ACK_LINES = ['Mm, okay.', 'Okay, thanks.', 'Right, thank you.', 'Okay.', 'Mm, got it.', 'Thanks.']
// Said quietly if you pause part-way through an answer. Only "mm" sounds, so
// they can be filtered out if the microphone picks them up.
const BACKCHANNELS = ['Mm-hmm.', 'Mm.', 'Mm-hmm.']
const ALEX_SOUNDS = /\b(m+-?h?m+|mhm+|uh[- ]?huh)\b/gi
// A short "mm" while Alex works out his reply to something you asked him.
const ASIDE_ACKS = ['Mm.', 'Mm-hmm.']
// Things that sound like you're talking TO Alex, not answering: a question,
// "can you repeat that?", "I don't know"... The backend makes the final call.
const ASIDE_START = /^(?:(?:sorry|so|um+|uh+|erm?|okay|ok|right|wait|alex|peccy|hmm+|actually)[,.!]?\s+)*(what|what's|whats|how|why|who|where|which|is|are|can|could|do|does|will|would|should|am|have you|tell me|repeat|pardon|say that again|come again|i don'?t (know|understand|get)|not sure|no idea|skip|pass)\b/i
const SAFETY_WORDS = /\b(hurt(s|ing)? me|hit(s|ting)? me|not safe|unsafe|abus(e|ed|ing)|kill myself|suicid\w*|self.?harm|want to die|bull(y|ied|ying))\b/i
function mightBeAside(text, qid) {
  const t = (text || '').trim()
  const n = t.split(/\s+/).filter(Boolean).length
  if (!n) return false
  if (SAFETY_WORDS.test(t)) return true
  if (qid === 'close') return false // on the last question you're meant to ask Alex things
  return n <= 30 && (/\?\s*$/.test(t) || ASIDE_START.test(t))
}
const cleanHeard = (text) => text.replace(ALEX_SOUNDS, ' ').replace(/\s+/g, ' ').trim()
const normWord = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, '')
// Without headphones the microphone also hears Alex. Take his words out (in
// order) from the start of what was heard. As soon as a word isn't his, it's
// you talking, so everything from there on is kept (better a stray word of
// his than losing yours - he stops talking as soon as you cut in anyway).
function stripEcho(heard, line) {
  if (!heard || !line) return heard
  const alex = line.split(/\s+/).map(normWord).filter(Boolean)
  const words = heard.split(/\s+/).filter((w) => normWord(w))
  let p = 0
  let j = 0
  for (; j < words.length; j += 1) {
    const w = normWord(words[j])
    let hit = -1
    for (let k = p; k < Math.min(alex.length, p + 12); k += 1) {
      if (alex[k] === w) { hit = k; break }
    }
    // Heard from part-way through his line: the first two words must both match.
    if (hit < 0 && p === 0) {
      const next = words[j + 1] ? normWord(words[j + 1]) : null
      hit = alex.findIndex((a, k) => a === w && next !== null && alex[k + 1] === next)
    }
    if (hit < 0) break
    p = hit + 1
  }
  return words.slice(j).join(' ')
}

// Endings that suggest you haven't finished your sentence yet.
const TRAILING = /\b(and|but|so|because|cause|then|or|which|that|when|while|if|the|a|an|to|of|with|for|my|our|i|we|um+|uh+|er+|erm|like)$/i

const MIC_ERRORS = {
  'not-allowed': 'Your microphone is blocked for this site. Allow it in your browser (look for the microphone icon in the address bar), then press Answer. Or type your answer below.',
  'service-not-allowed': "This browser won't let the page turn speech into text. Try Chrome or Edge, or type your answer below.",
  'audio-capture': 'No microphone was found. Check one is connected and allowed, then press Answer. Or type your answer below.',
  network: 'Speech-to-text needs an internet connection in this browser. Check your connection and press Answer, or type your answer below.',
  'language-not-supported': "Speech-to-text isn't available in English in this browser. Try Chrome or Edge, or type your answer below.",
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const wordCount = (text) => (text || '').split(/\s+/).filter(Boolean).length

// Things you can say during the feedback.
function parseCommand(text) {
  const t = ` ${(text || '').toLowerCase()} `
  if (/\b(repeat|say (that|it) again|pardon|come again|what was that)\b/.test(t)) return 'repeat'
  if (/\b(try (that |it |this )?again|have another go|another go|redo|do (that|it) again|start (that|it) again)\b/.test(t)) return 'retry'
  if (/\b(next( question)?|move on|carry on|continue|go on|skip|i'?m ready)\b/.test(t) && !/\bnext time\b/.test(t)) return 'next'
  if (/\b(wait|hang on|hold on|one sec(ond)?|pause|stop)\b/.test(t)) return 'stay'
  return null
}

// Short feedback shown straight after each question (and its follow-up).
// Something you shouldn't say in a real interview (a question about pay,
// swearing, "I don't know"...). Shown in red above the rest of the feedback.
function AnswerWarning({ text }) {
  if (!text) return null
  return (
    <p className="iv-warning" role="alert">
      <Icon name="flag" size={16} />
      <span><strong>Avoid this in a real interview.</strong> {text}</span>
    </p>
  )
}

// The interviewer's face after your answer: pleased for a strong one,
// concerned for a weak one or something to avoid in an interview.
const faceMood = (phase, review) => {
  if (phase !== 'feedback' || !review || review.error) return null
  if (review.warning || review.score < 40) return 'concerned'
  return review.score >= 70 ? 'happy' : null
}

// What the interviewer says at the end of the call, while waving goodbye.
const goodbyeLine = (firstName) =>
  `That's the end of our practice${firstName ? `, ${firstName}` : ''}. Thanks for your time!`

const scoreTone = (score) => (score >= 75 ? 'good' : score >= 50 ? 'ok' : 'low')

function LiveFeedback({ review, answer, followUp, followAnswer, onRetry }) {
  const INTERVIEWER = useInterviewer().name
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
  const tone = scoreTone(review.score)
  const boost = review.scoreBefore != null ? review.score - review.scoreBefore : 0
  const tips = review.tips.filter((s) => s !== review.warning)
  return (
    <div className="iv-live-fb" role="status">
      <div className="iv-live-fb-head">
        <span className={`iv-review-score is-${tone}`}>{review.score}</span>
        <strong>Quick feedback</strong>
        <button type="button" className="iv-retry" onClick={onRetry}>
          <Icon name="motion" size={14} /> Try this answer again
        </button>
      </div>

      <AnswerWarning text={review.warning} />

      {answer ? (
        <blockquote className="iv-live-fb-answer">{answer}</blockquote>
      ) : (
        <p className="iv-live-fb-empty">No answer was picked up for this question.</p>
      )}

      {followUp && (
        <div className="iv-live-fb-follow">
          <span className="iv-live-fb-label">
            <Icon name="motion" size={13} /> Follow-up: {followUp.text}
          </span>
          {followAnswer.trim() ? (
            <blockquote className="iv-live-fb-answer">{followAnswer}</blockquote>
          ) : (
            <p className="iv-live-fb-empty">You skipped the follow-up.</p>
          )}
        </div>
      )}

      {review.say && (
        <p className="iv-live-fb-say">
          <span className="iv-live-fb-who">
            {INTERVIEWER} said
            {review.source === 'ai' && <span className="iv-ai-tag">AI</span>}
          </span>
          {review.say}
        </p>
      )}

      {review.interruptPenalty > 0 && (
        <p className="iv-fb-penalty">
          <Icon name="flag" size={14} /> {review.interruptPenalty} points off for talking over {INTERVIEWER}.
        </p>
      )}

      {boost > 0 && (
        <p className="iv-fb-boost">
          <Icon name="check" size={14} /> Your follow-up answer added {boost} {boost === 1 ? 'point' : 'points'}.
        </p>
      )}

      <div className="iv-review-cols">
        {review.strengths.length > 0 && (
          <div>
            <h4 className="is-good">What went well</h4>
            <ul>{review.strengths.slice(0, 2).map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
        )}
        {tips.length > 0 && (
          <div>
            <h4 className="is-tip">Try this</h4>
            <ul>{tips.slice(0, 2).map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  )
}

function Call({ questions, mode, voiceOn, setVoiceOn, voiceURI, cameraDefault, bargeIn, firstName = '', pathway = '', roleContext = '', aiStatus = null, onFinish, onQuit }) {
  const interviewer = useInterviewer()
  const INTERVIEWER = interviewer.name
  const Face = FACES[interviewer.id] || InterviewerVideo
  const canListen = mode === 'speak' && Boolean(SpeechRecognition)
  const blank = () => questions.map(() => '')

  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState(blank)
  const [followAnswers, setFollowAnswers] = useState(blank)
  const [followUps, setFollowUps] = useState(() => questions.map(() => null))
  const [reviews, setReviews] = useState(() => questions.map(() => null))
  // For each question: asking -> answering -> checking -> (follow-up: asking ->
  // answering -> checking) -> feedback
  const [phase, setPhaseState] = useState('asking')
  const [step, setStepState] = useState('main') // main | follow
  const [listening, setListening] = useState(false) // turning your speech into text
  const [hearing, setHearing] = useState(false) // you're making sound right now
  const [commandMode, setCommandMode] = useState(false) // listening for "next", "try again"...
  const [quietTooLong, setQuietTooLong] = useState(false)
  const [micError, setMicError] = useState('')
  const [vadOn, setVadOn] = useState(false)
  const [cutIn, setCutIn] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [asking, setAsking] = useState(false)
  const [wordTick, setWordTick] = useState(0)
  const script = useScript()
  // One-off gestures for the interviewer: wave, bye, thumbs, nod, offer
  const [gesture, setGesture] = useState({ kind: '', id: 0 })
  const gestureNow = (kind) => setGesture((g) => ({ kind, id: g.id + 1 }))
  const leaving = useRef(false)
  const [caption, setCaption] = useState('')
  const [captionsOn, setCaptionsOn] = useState(true)
  const [connecting, setConnecting] = useState(true)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [showStar, setShowStar] = useState(false)
  const [autoNext, setAutoNextState] = useState(() => {
    try { return localStorage.getItem(AUTO_KEY) !== 'off' } catch { return true }
  })
  const [countdown, setCountdown] = useState(null)
  // Something you said to Alex (not an answer) and what he said back.
  const [aside, setAside] = useState(null)
  const [safety, setSafety] = useState(false)

  const mounted = useRef(true)
  const phaseRef = useRef('asking')
  const stepRef = useRef('main')
  const indexRef = useRef(0)
  const answersRef = useRef(answers)
  const followAnswersRef = useRef(followAnswers)
  const followUpsRef = useRef(followUps)
  const voiceRef = useRef(voiceOn)
  const autoNextRef = useRef(autoNext)
  const bargeRef = useRef(bargeIn)
  const handlersRef = useRef({})
  indexRef.current = index
  voiceRef.current = voiceOn
  autoNextRef.current = autoNext
  bargeRef.current = bargeIn && canListen

  // Interviewer speech
  const speechStop = useRef(null)
  const lineToken = useRef(null)
  const lineDone = useRef(null)
  const lineKind = useRef('line') // line | backchannel
  const alexTalking = useRef(false)
  const alexSince = useRef(0)
  const fakeTimer = useRef(null)
  const safetyTimer = useRef(null)
  const captionTimer = useRef(null)
  const askTimer = useRef(null)

  // Turning your speech into text
  const recRef = useRef(null)
  const recMode = useRef(null) // answer | command
  const wantListening = useRef(false)
  const fatal = useRef(false)
  const restarts = useRef(0)
  const baseRef = useRef('')
  const sessionRef = useRef('')
  const lastHeard = useRef(0)
  const listenStart = useRef(0)
  const answerStart = useRef(null)
  const commandTimer = useRef(null)
  const timings = useRef(questions.map(() => 0))
  const targetRef = useRef({ i: 0, s: 'main' }) // which answer box the words go in
  const heardParts = useRef([]) // everything heard in this listening session
  const preCount = useRef(0) // results heard before Alex stopped talking
  const preLine = useRef('') // what Alex was saying then (to take out his echo)
  const preDrop = useRef(false) // ignore those words completely
  const cutInPending = useRef(false)
  const cmdHeard = useRef('')
  const beforeTurn = useRef('') // your answer before this turn (so a question can be taken back out)
  const earlyEnd = useRef(false)
  const turnBusy = useRef(false)
  const bgFailed = useRef(false)
  const spokenLines = useRef([])

  // Hearing your voice (microphone volume)
  const vadRef = useRef(null)
  const tickRef = useRef(null)
  const meterRef = useRef(null)
  const floorRef = useRef(0.01)
  const echoRef = useRef(0.02)
  const aboveMs = useRef(0)
  const lastVoice = useRef(0)
  const hearingRef = useRef(false)
  const quietRef = useRef(false)
  const lastBackchannel = useRef(0)
  const bcDecided = useRef(0)
  const cutInAt = useRef(0)
  const cutInTimer = useRef(null)
  // Talking over Alex: how many times for each question, and where he was in his line.
  const interruptsRef = useRef(questions.map(() => 0))
  const lineRef = useRef(null) // { token, parts, k (sentence he's on), onDone, nudged }
  const talkBase = useRef(0) // words heard before this line started don't count

  // Camera
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const startedAt = useRef(Date.now())

  const q = questions[index]
  const last = index === questions.length - 1
  const review = reviews[index]
  const followUp = followUps[index]

  const setPhase = (p) => {
    phaseRef.current = p
    setPhaseState(p)
  }
  const setStep = (s) => {
    stepRef.current = s
    setStepState(s)
  }
  const setAnswer = (i, text) => {
    answersRef.current = answersRef.current.map((a, n) => (n === i ? text : a))
    setAnswers(answersRef.current)
  }
  const setFollowAnswer = (i, text) => {
    followAnswersRef.current = followAnswersRef.current.map((a, n) => (n === i ? text : a))
    setFollowAnswers(followAnswersRef.current)
  }
  const setFollowUp = (i, f) => {
    followUpsRef.current = followUpsRef.current.map((x, n) => (n === i ? f : x))
    setFollowUps(followUpsRef.current)
  }
  // The answer box shows the first answer, or the follow-up answer during a follow-up.
  const currentText = (i, s) => (s === 'follow' ? followAnswersRef.current[i] : answersRef.current[i]) || ''
  const setCurrentText = (i, s, text) => (s === 'follow' ? setFollowAnswer(i, text) : setAnswer(i, text))
  // Just what you said in this turn (not the earlier part of your answer).
  const turnText = (i, s) => {
    const all = currentText(i, s)
    const b = beforeTurn.current
    return (b && all.startsWith(b) ? all.slice(b.length) : all).trim()
  }
  // The questions and answers before this one (sent with each request, not saved).
  const historyFor = (i) => questions.slice(0, i).map((qq, j) => ({
    q: qq.text,
    a: [answersRef.current[j], followAnswersRef.current[j]].filter((x) => x && x.trim()).join(' '),
  })).filter((h) => h.a).slice(-3)
  const askedText = (i, s) => (s === 'follow' && followUpsRef.current[i] ? followUpsRef.current[i].text : questions[i].text)
  const setReview = (i, r) => setReviews((prev) => prev.map((x, n) => (n === i ? r : x)))
  const stillChecking = (i) => mounted.current && indexRef.current === i && phaseRef.current === 'checking'
  const setHearingOnce = (on) => {
    if (hearingRef.current !== on) {
      hearingRef.current = on
      setHearing(on)
    }
  }
  const setQuietOnce = (on) => {
    if (quietRef.current !== on) {
      quietRef.current = on
      setQuietTooLong(on)
    }
  }

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
  const setAlexSpeaking = (on) => {
    if (on && !alexTalking.current) {
      alexSince.current = Date.now()
      aboveMs.current = 0
      echoRef.current = Math.max(echoRef.current * 0.8, floorRef.current * 2)
    }
    alexTalking.current = on
    setSpeaking(on)
  }

  const stopSpeech = () => {
    lineToken.current = null
    lineDone.current = null
    clearTimeout(safetyTimer.current)
    clearTimeout(fakeTimer.current)
    speechStop.current?.()
    speechStop.current = null
    setAlexSpeaking(false)
  }

  const finishLine = () => {
    setAlexSpeaking(false)
    clearTimeout(captionTimer.current)
    captionTimer.current = setTimeout(() => setCaption(''), 2200)
  }

  // Say a line. `onDone` runs when it finishes (not if it's interrupted).
  const rememberLine = (text) => {
    const now = Date.now()
    spokenLines.current = [...spokenLines.current.filter((l) => now - l.at < 12000), { text, at: now }]
  }

  const speakLine = (text, onDone, { nudged = false } = {}) => {
    stopSpeech()
    rememberLine(text)
    // Keep listening while Alex talks, so you can cut in and he hears what you say.
    if (recMode.current === 'command') {
      recMode.current = 'background'
      setCommandMode(false)
      setListening(false)
    }
    if (canListen && bargeRef.current && !recRef.current && !bgFailed.current) startListening('background')
    lineKind.current = 'line'
    clearTimeout(captionTimer.current)
    // Captions show one sentence at a time, in step with what Alex is saying.
    const parts = sentences(text)
    if (!parts.length) parts.push(text)
    setCaption(parts[0])
    setAsking(true)
    clearTimeout(askTimer.current)
    askTimer.current = setTimeout(() => setAsking(false), 1400)

    const token = {}
    lineToken.current = token
    lineRef.current = { token, parts, k: 0, onDone, nudged }
    talkBase.current = heardParts.current.length
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
        onStart: () => setAlexSpeaking(true),
        onSentence: (s, idx) => {
          if (lineToken.current !== token) return
          setCaption(s)
          lineRef.current.k = idx
        },
        onWord: () => setWordTick((n) => n + 1),
        onEnd: done,
      })
      // If the browser's voice gets stuck, carry on anyway.
      safetyTimer.current = setTimeout(() => {
        speechStop.current?.()
        done()
      }, Math.max(8000, words * 700 + 5000))
    } else {
      // Voice off: Alex still "talks" silently, one caption sentence at a time.
      setAlexSpeaking(true)
      let k = 0
      const step = () => {
        if (lineToken.current !== token) return
        const part = parts[k]
        lineRef.current.k = k
        k += 1
        setCaption(part)
        const ms = Math.max(1400, (part.split(/\s+/).length / 2.6) * 1000)
        fakeTimer.current = setTimeout(k < parts.length ? step : done, ms)
      }
      step()
    }
  }

  // A quiet "mm-hmm" while you pause, so you know Alex is still with you.
  const backchannel = () => {
    if (!canSpeak || !voiceRef.current || alexTalking.current) return
    lastBackchannel.current = Date.now()
    gestureNow('nod')
    lineKind.current = 'backchannel'
    const text = BACKCHANNELS[Math.floor(Math.random() * BACKCHANNELS.length)]
    rememberLine(text)
    const stop = speakNatural(text, {
      voice: findVoice(voiceURI),
      volume: 0.6,
      onStart: () => setAlexSpeaking(true),
      onWord: () => setWordTick((n) => n + 1),
      onEnd: () => {
        if (speechStop.current === stop) speechStop.current = null
        if (lineKind.current === 'backchannel') setAlexSpeaking(false)
      },
    })
    speechStop.current = stop
  }

  // Turning the voice off mid-line skips to the end of it
  useEffect(() => {
    if (!voiceOn && speechStop.current) {
      speechStop.current()
      speechStop.current = null
      lineDone.current?.()
    }
  }, [voiceOn])

  /* ---- Turning your speech into text ---- */
  // Stop listening, but let the last few words arrive.
  const pauseListening = () => {
    wantListening.current = false
    clearTimeout(commandTimer.current)
    try { recRef.current?.stop() } catch { /* already stopped */ }
    setListening(false)
    setCommandMode(false)
    if (answerStart.current) {
      timings.current[indexRef.current] += (Date.now() - answerStart.current) / 1000
      answerStart.current = null
    }
  }

  // Stop straight away and ignore anything still on its way.
  const dropListening = () => {
    pauseListening()
    const rec = recRef.current
    recRef.current = null
    recMode.current = null
    try { rec?.abort() } catch { /* ignore */ }
  }

  // Alex's recent lines, so his own voice coming back through the speakers
  // can be told apart from yours.
  const echoText = () => {
    const now = Date.now()
    return spokenLines.current.filter((l) => now - l.at < 12000).map((l) => l.text).join(' ')
  }

  // Use what the speech-to-text has heard so far, for the current mode.
  const handleHeard = () => {
    const kind = recMode.current
    if (kind === 'background') {
      handlersRef.current.checkTalkOver?.()
      return
    }
    if (!kind) return
    const parts = heardParts.current
    const cut = Math.min(preCount.current, parts.length)
    // Words heard while Alex was still talking: keep only yours.
    const pre = cut && !preDrop.current ? stripEcho(cleanHeard(parts.slice(0, cut).join(' ')), preLine.current) : ''
    const heard = cleanHeard(`${pre} ${parts.slice(cut).join(' ')}`)
    if (!heard || heard === sessionRef.current) return
    sessionRef.current = heard
    lastHeard.current = Date.now()
    if (kind === 'command') {
      cmdHeard.current = heard
      const cmd = parseCommand(heard)
      if (cmd) handlersRef.current.runCommand(cmd)
      else handlersRef.current.holdCountdown()
      return
    }
    const { i, s } = targetRef.current
    setCurrentText(i, s, `${baseRef.current} ${heard}`.trim())
    if (!vadRef.current) setHearingOnce(true)
  }

  // kind: answer | command | background (while Alex talks, so you can cut in)
  const startListening = (kind = 'answer') => {
    if (!SpeechRecognition) return
    const i = indexRef.current
    const s = stepRef.current
    if (kind !== 'background') {
      setMicError('')
      setQuietOnce(false)
    }
    clearTimeout(commandTimer.current)
    const old = recRef.current
    recRef.current = null
    try { old?.abort() } catch { /* ignore */ }

    const rec = new SpeechRecognition()
    rec.lang = 'en-GB'
    rec.continuous = true
    rec.interimResults = true
    recRef.current = rec
    recMode.current = kind
    targetRef.current = { i, s }
    baseRef.current = kind === 'answer' ? currentText(i, s) : ''
    sessionRef.current = ''
    cmdHeard.current = ''
    heardParts.current = []
    preCount.current = 0
    preLine.current = ''
    preDrop.current = false
    fatal.current = false
    restarts.current = 0
    wantListening.current = true
    lastHeard.current = Date.now()
    listenStart.current = Date.now()
    if (kind === 'answer') answerStart.current = Date.now()

    rec.onresult = (e) => {
      if (recRef.current !== rec) return
      // Rebuild everything heard so far, so no words get lost (even if the
      // browser never marks them as final).
      const parts = []
      for (let k = 0; k < e.results.length; k += 1) parts.push(e.results[k][0].transcript)
      heardParts.current = parts
      restarts.current = 0
      handleHeard()
    }
    rec.onerror = (e) => {
      if (recRef.current !== rec) return
      if (e.error === 'no-speech' || e.error === 'aborted') return
      fatal.current = true
      wantListening.current = false
      // Listening while Alex talks is a bonus - don't show an error for it.
      if (recMode.current === 'background') {
        bgFailed.current = true
        return
      }
      setMicError(MIC_ERRORS[e.error] || `Speech-to-text stopped working (${e.error}). Press Answer to try again, or type your answer below.`)
    }
    rec.onend = () => {
      if (recRef.current !== rec) return
      // Keep what was heard, then carry on listening if we still want to
      // (browsers stop by themselves after a pause).
      if (recMode.current === 'answer') baseRef.current = `${baseRef.current} ${sessionRef.current}`.trim()
      sessionRef.current = ''
      heardParts.current = []
      preCount.current = 0
      if (wantListening.current && !fatal.current && restarts.current < 25) {
        restarts.current += 1
        try {
          rec.start()
          return
        } catch { /* fall through */ }
      }
      wantListening.current = false
      recRef.current = null
      setListening(false)
      setCommandMode(false)
      setHearingOnce(false)
    }

    try {
      rec.start()
      setListening(kind !== 'background')
      setCommandMode(kind === 'command')
    } catch {
      wantListening.current = false
      recRef.current = null
      setListening(false)
      setCommandMode(false)
      if (kind === 'background') bgFailed.current = true
      else setMicError('The microphone could not start. Press Answer to try again, or type your answer below.')
    }
  }

  // Switch to listening for an answer or a command. If the microphone is
  // already on (it listens while Alex talks), keep it going, so nothing you
  // said when you cut in is lost.
  const listen = (kind) => {
    const rec = recRef.current
    // Only carry on the session that was running while Alex talked if you cut in
    // (so your first words aren't lost). Otherwise start fresh: a session that
    // has been hearing Alex's voice mishears more of what you say.
    if (rec && wantListening.current && !fatal.current && !cutInPending.current && recMode.current === 'background') {
      startListening(kind)
      return
    }
    if (rec && wantListening.current && !fatal.current) {
      if (recMode.current === kind) return
      const i = indexRef.current
      const s = stepRef.current
      clearTimeout(commandTimer.current)
      targetRef.current = { i, s }
      recMode.current = kind
      preCount.current = heardParts.current.length
      preLine.current = echoText()
      // Words heard while Alex talked only count if you cut in, or for an answer
      // (you might start a moment before he finishes). Otherwise his own voice
      // could be taken as "next" or a question.
      preDrop.current = kind === 'command' && !cutInPending.current
      cutInPending.current = false
      baseRef.current = kind === 'answer' ? currentText(i, s) : ''
      sessionRef.current = ''
      cmdHeard.current = ''
      lastHeard.current = Date.now()
      listenStart.current = Date.now()
      if (kind === 'answer') answerStart.current = Date.now()
      setMicError('')
      setQuietOnce(false)
      setListening(true)
      setCommandMode(kind === 'command')
      handleHeard() // words you'd already said count straight away
      return
    }
    startListening(kind)
  }

  /* ---- Flow ---- */
  const beginAnswer = () => {
    gestureNow('offer')
    if (!mounted.current) return
    setPhase('answering')
    bcDecided.current = 0
    beforeTurn.current = currentText(indexRef.current, stepRef.current)
    earlyEnd.current = false
    if (canListen) listen('answer')
    else setTimeout(() => document.getElementById('iv-answer')?.focus(), 60)
  }

  const skipToAnswer = () => {
    stopSpeech()
    finishLine()
    beginAnswer()
  }

  /* ---- Talking over Alex ---- */
  // Like a real interviewer, he stops for a moment, asks you to let him
  // finish, then carries on from the sentence he was on. It takes points off
  // this question (see INTERRUPT_PENALTY in the backend).
  const flashTalkOver = () => {
    setCutIn(true)
    clearTimeout(cutInTimer.current)
    cutInTimer.current = setTimeout(() => setCutIn(false), 2600)
  }

  // Already given feedback for this question: show the points off straight away
  // (the same sum as the backend: 10 a time, up to 30).
  const penaliseReview = (i, n) => setReviews((prev) => prev.map((r, k) => {
    if (k !== i || !r || r.error) return r
    const base = r.baseScore ?? r.score
    const penalty = Math.min(30, 10 * n)
    const times = n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`
    const tip = `You talked over ${INTERVIEWER} ${times} while he was speaking. In a real interview, let the interviewer finish before you start - it shows you're listening.`
    const rest = (r.tips || []).filter((s) => s !== r.warning && !s.startsWith('You talked over'))
    return {
      ...r,
      score: Math.max(0, base - penalty),
      baseScore: base,
      interruptions: n,
      interruptPenalty: penalty,
      tips: [...(r.warning ? [r.warning] : []), tip, ...rest].slice(0, 3),
    }
  }))

  const nudgeTalkOver = () => {
    const line = lineRef.current
    if (!line || line.nudged) return
    const i = indexRef.current
    const n = (interruptsRef.current[i] || 0) + 1
    interruptsRef.current[i] = n
    if (phaseRef.current === 'feedback') penaliseReview(i, n)
    flashTalkOver()
    const nudge = NUDGE_LINES[(n - 1) % NUDGE_LINES.length]
    const rest = line.parts.slice(line.k).join(' ')
    speakLine(rest ? `${nudge} ${rest}` : nudge, line.onDone, { nudged: true })
  }

  // Several of your words (not his echo) while he's talking = talking over him.
  const checkTalkOver = (now = Date.now()) => {
    if (!alexTalking.current || lineKind.current !== 'line' || !bargeRef.current) return
    if (phaseRef.current !== 'asking' && phaseRef.current !== 'feedback') return
    const line = lineRef.current
    if (!line || line.nudged || line.token !== lineToken.current) return
    if (now - alexSince.current < BARGE_IN_GRACE_MS) return
    const wordsOn = recRef.current && recMode.current === 'background' && !bgFailed.current
    if (wordsOn) {
      // With the volume meter, the words must come with your voice louder than his echo.
      if (vadRef.current && !(lastVoice.current > alexSince.current && now - lastVoice.current < 1200)) return
      const yours = stripEcho(cleanHeard(heardParts.current.slice(talkBase.current).join(' ')), echoText())
      if (wordCount(yours) < TALK_OVER_WORDS) return
    } else if (!vadRef.current || aboveMs.current < TALK_OVER_FALLBACK_MS) {
      return
    }
    nudgeTalkOver()
  }

  // Listen for "next", "try again", "repeat" or "wait".
  const listenForCommand = (withTimeout) => {
    if (!canListen) return
    listen('command')
    clearTimeout(commandTimer.current)
    if (withTimeout) {
      commandTimer.current = setTimeout(() => {
        if (phaseRef.current !== 'feedback' || recMode.current !== 'command') return
        if (autoNextRef.current) setCountdown(AUTO_SECONDS) // still listening while it counts down
      }, COMMAND_WAIT_MS)
    }
  }

  // You started talking during the countdown: wait for you instead of moving on.
  const holdCountdown = () => {
    setCountdown(null)
    clearTimeout(commandTimer.current)
    commandTimer.current = setTimeout(() => {
      if (phaseRef.current !== 'feedback' || turnBusy.current || alexTalking.current) return
      if (autoNextRef.current) setCountdown(AUTO_SECONDS)
    }, COMMAND_WAIT_MS)
  }

  // After the feedback, something you said that wasn't "next" or "try again",
  // like a question. Alex answers it, then waits for you again.
  const handleFeedbackTurn = async (text) => {
    const i = indexRef.current
    turnBusy.current = true
    setCountdown(null)
    dropListening()
    setAside({ i, you: text, alex: null })
    let r = null
    try {
      r = await api.interviewTurn({
        id: questions[i].id,
        asked: questions[i].text,
        utterance: text,
        context: 'feedback',
        pathway,
        tip: reviews[i]?.tips?.[0] || '',
      })
    } catch { /* use the line below */ }
    turnBusy.current = false
    if (!mounted.current || indexRef.current !== i || phaseRef.current !== 'feedback') return
    const say = r?.say || "Sorry, I didn't quite catch that. Say next when you're ready, or try again to have another go."
    setAside({ i, you: text, alex: say })
    if (r?.type === 'safeguard') setSafety(true)
    if (r?.type === 'skip') {
      speakLine(say, goNext)
      return
    }
    speakLine(say, () => listenForCommand(true))
  }


  // Feedback on this question: the first answer plus the follow-up answer (if any).
  const getFeedback = async (i, afterAck) => {
    const fu = followUpsRef.current[i]
    const fa = followAnswersRef.current[i] || ''
    const seconds = canListen && timings.current[i] > 0 ? Math.round(timings.current[i]) : null
    try {
      const r = await api.reviewAnswer({
        id: questions[i].id,
        answer: answersRef.current[i] || '',
        followUp: fu && fa.trim() ? { question: fu.text, answer: fa } : null,
        followUpAsked: Boolean(fu),
        asked: questions[i].text,
        seconds,
        interruptions: interruptsRef.current[i] || 0,
        pathway,
        history: historyFor(i),
      })
      if (!stillChecking(i)) return
      setReview(i, r)
      setPhase('feedback')
      if (!r.warning && r.score >= 80) gestureNow('thumbs')
      if (r.say) {
        // Let the quick "Okay." finish, then give the feedback, then count down.
        const asked = Date.now()
        if (afterAck) await afterAck()
        if (!mounted.current || indexRef.current !== i || phaseRef.current !== 'feedback') return
        if (cutInAt.current > asked) return // you cut in - Alex waits for you instead
        speakLine(r.say, () => startCountdown(i))
      } else {
        startCountdown(i)
      }
    } catch (err) {
      if (!mounted.current || indexRef.current !== i) return
      setReview(i, { error: err.message })
      setPhase('feedback')
    }
  }

  const finishAnswer = async () => {
    if (phaseRef.current !== 'answering') return
    const i = indexRef.current
    const s = stepRef.current
    setPhase('checking')
    pauseListening()
    setHearingOnce(false)
    // React straight away, like a real person would.
    let ackDone
    const acked = new Promise((resolve) => { ackDone = resolve })
    const asideLikely = mightBeAside(turnText(i, s), questions[i].id)
    const acks = asideLikely ? ASIDE_ACKS : ACK_LINES
    gestureNow('nod')
    speakLine(acks[Math.floor(Math.random() * acks.length)], ackDone)
    const afterAck = () => Promise.race([acked, wait(1800)])
    if (canListen) await wait(300) // let the last few words arrive
    if (recMode.current === 'answer') {
      const rec = recRef.current
      recRef.current = null
      recMode.current = null
      try { rec?.abort() } catch { /* ignore */ }
    }
    if (!stillChecking(i)) return

    // Was that an answer, or were you talking to Alex ("What is the apprenticeship?",
    // "Can you repeat that?")? If you were, he replies and then listens again.
    const said = turnText(i, s)
    const wasEarly = earlyEnd.current
    earlyEnd.current = false
    if (mightBeAside(said, questions[i].id)) {
      let turn = null
      try {
        turn = await api.interviewTurn({ id: questions[i].id, asked: askedText(i, s), utterance: said, context: 'answering', pathway })
      } catch { /* treat it as an answer */ }
      if (!stillChecking(i)) return
      if (turn && turn.type !== 'answer' && turn.say) {
        setCurrentText(i, s, beforeTurn.current) // it wasn't part of your answer
        setAside({ i, you: said, alex: turn.say })
        if (turn.type === 'safeguard') setSafety(true)
        await afterAck()
        if (!stillChecking(i)) return
        if (turn.type === 'skip') {
          if (s === 'follow') {
            setFollowAnswer(i, '')
            speakLine(turn.say, () => getFeedback(i))
          } else {
            setPhase('asking')
            speakLine(turn.say, goNext)
          }
          return
        }
        setPhase('asking')
        speakLine(turn.say, beginAnswer)
        return
      }
      // A short start to an answer that Alex jumped in on too soon: keep listening.
      if (wasEarly && wordCount(said) < (s === 'follow' ? FOLLOW_MIN_WORDS : MIN_WORDS)) {
        setPhase('answering')
        if (canListen) listen('answer')
        return
      }
    }

    // After the first answer, Alex may dig deeper with one follow-up question.
    const first = answersRef.current[i] || ''
    if (s === 'main' && questions[i].id !== 'close' && wordCount(first) > 0) {
      try {
        const f = await api.interviewFollowUp({ id: questions[i].id, asked: questions[i].text, answer: first, pathway, history: historyFor(i) })
        if (!stillChecking(i)) return
        if (f.followUp) {
          setFollowUp(i, f.followUp)
          setStep('follow')
          setPhase('asking')
          await afterAck()
          if (!mounted.current || indexRef.current !== i || phaseRef.current !== 'asking') return
          speakLine([f.say, f.followUp.text].filter(Boolean).join(' '), beginAnswer)
          return
        }
      } catch {
        /* no follow-up this time - go straight to feedback */
      }
    }
    await getFeedback(i, afterAck)
  }

  // Skip the follow-up and go straight to feedback on the first answer.
  const skipFollowUp = () => {
    const i = indexRef.current
    dropListening()
    stopSpeech()
    setFollowAnswer(i, '')
    setPhase('checking')
    getFeedback(i)
  }

  /* ---- Moving on by himself after feedback ---- */
  const startCountdown = (i) => {
    if (!mounted.current || indexRef.current !== i || phaseRef.current !== 'feedback') return
    if (autoNextRef.current) setCountdown(AUTO_SECONDS)
    else listenForCommand(false) // no countdown, but Alex still listens for you
  }

  const setAutoNext = (on) => {
    setAutoNextState(on)
    try { localStorage.setItem(AUTO_KEY, on ? 'on' : 'off') } catch { /* private mode */ }
    if (!on) {
      setCountdown(null)
    } else if (phaseRef.current === 'feedback' && !lineToken.current) setCountdown(AUTO_SECONDS)
  }

  const stayHere = () => {
    setCountdown(null)
    clearTimeout(commandTimer.current)
  }

  const tryAgain = () => {
    const i = indexRef.current
    setCountdown(null)
    dropListening()
    stopSpeech()
    setAnswer(i, '')
    setFollowAnswer(i, '')
    setFollowUp(i, null)
    setReview(i, null)
    timings.current[i] = 0
    interruptsRef.current[i] = 0
    setStep('main')
    setPhase('asking')
    speakLine(RETRY_LINE, beginAnswer)
  }

  const finishCall = () => {
    if (!mounted.current) return
    onFinish(questions.map((qq, i) => ({
      id: qq.id,
      asked: qq.text,
      answer: [answersRef.current[i], followAnswersRef.current[i]].filter((a) => a && a.trim()).join(' '),
      seconds: canListen && timings.current[i] > 0 ? Math.round(timings.current[i]) : null,
      interruptions: interruptsRef.current[i] || 0,
    })))
  }

  const goNext = () => {
    setCountdown(null)
    dropListening()
    stopSpeech()
    if (last) {
      // Pressing "Finish" again while Alex says goodbye skips the goodbye.
      if (leaving.current) {
        finishCall()
        return
      }
      // Say goodbye and wave, then show the results.
      leaving.current = true
      gestureNow('bye')
      speakLine(goodbyeLine(firstName), () => setTimeout(finishCall, 500))
    } else {
      setIndex((n) => n + 1)
    }
  }

  const repeat = () => {
    const p = phaseRef.current
    if (p === 'checking') return
    if (p === 'feedback') {
      setCountdown(null)
      dropListening()
      const i = indexRef.current
      if (review?.say) speakLine(review.say, () => startCountdown(i))
      return
    }
    if (p === 'answering') pauseListening()
    setPhase('asking')
    const fu = followUpsRef.current[indexRef.current]
    speakLine(stepRef.current === 'follow' && fu ? fu.text : q.text, beginAnswer)
  }

  const runCommand = (cmd) => {
    if (phaseRef.current !== 'feedback') return
    dropListening()
    if (cmd === 'next') goNext()
    else if (cmd === 'retry') tryAgain()
    else if (cmd === 'repeat') repeat()
    else {
      setCountdown(null)
      speakLine('Sure, take your time.', () => listenForCommand(false))
    }
  }

  // Has your answer finished? Decided from how long you've been quiet, and
  // whether your last sentence sounded finished.
  const checkTurn = (now) => {
    const i = indexRef.current
    const s = stepRef.current
    const text = currentText(i, s).trim()
    const said = wordCount(text)
    setQuietOnce(said === 0 && now - listenStart.current > 7000)
    if (said === 0) return
    const lastSound = Math.max(lastVoice.current, lastHeard.current)
    const quiet = now - lastSound
    const need = s === 'follow' ? FOLLOW_MIN_WORDS : MIN_WORDS
    const trailing = TRAILING.test(text.replace(/[.,!?;:]+$/, ''))
    let endAfter = said < need ? END_SHORT_MS : trailing ? END_UNSURE_MS : END_COMPLETE_MS
    // A short question for Alex ("What's a T Level?") gets a quick reply.
    const turn = turnText(i, s)
    if (!trailing && wordCount(turn) >= 2 && mightBeAside(turn, questions[i].id) && endAfter > END_COMPLETE_MS) {
      endAfter = END_COMPLETE_MS + 200
      earlyEnd.current = true
    }
    if (!vadRef.current) endAfter = Math.max(endAfter, 2000)

    // Pausing part-way through: sometimes a quiet "mm-hmm" to show he's listening.
    if (bcDecided.current !== lastSound && quiet > BACKCHANNEL_AFTER_MS) {
      bcDecided.current = lastSound
      if (endAfter >= END_UNSURE_MS && said >= 6 && now - lastBackchannel.current > 7000 && Math.random() < 0.6) {
        backchannel()
      }
    }
    if (quiet >= endAfter || (said >= need && now - lastHeard.current > NO_NEW_WORDS_MS)) finishAnswer()
  }

  // After the feedback: when you stop talking (and it wasn't a command), Alex replies.
  const checkCommandTurn = (now) => {
    if (turnBusy.current || alexTalking.current) return
    const text = cmdHeard.current
    if (wordCount(text) < 2) return
    const quiet = now - Math.max(lastVoice.current, lastHeard.current)
    const trailing = TRAILING.test(text.replace(/[.,!?;:]+$/, ''))
    const need = trailing ? END_UNSURE_MS : vadRef.current ? END_COMPLETE_MS : 2000
    if (quiet >= need) handleFeedbackTurn(text)
  }

  // Runs about 20 times a second with the microphone volume.
  const onTick = (level, now, dt) => {
    const el = meterRef.current
    if (el) el.style.setProperty('--lvl', Math.min(1, level / 0.1).toFixed(3))

    const alex = alexTalking.current
    const quietThr = Math.max(0.012, floorRef.current * 3)
    const overThr = Math.max(0.03, floorRef.current * 5, echoRef.current * 2.2)
    if (!alex) {
      // Learn the room's background noise (but not your voice).
      const f = floorRef.current
      if (level < f) floorRef.current = f * 0.8 + level * 0.2
      else if (level < quietThr) floorRef.current = f * 0.99 + level * 0.01
    } else {
      // Learn how loud Alex's own voice is through the microphone.
      const loudNow = level > overThr
      echoRef.current = echoRef.current * (loudNow ? 0.995 : 0.96) + level * (loudNow ? 0.005 : 0.04)
    }

    const thr = alex ? overThr : quietThr
    if (level > thr) aboveMs.current += dt
    else aboveMs.current = Math.max(0, aboveMs.current - dt * 2)
    const voiced = alex ? aboveMs.current >= BARGE_IN_MS : aboveMs.current >= 90
    if (voiced) lastVoice.current = now
    if (phaseRef.current === 'answering' || recMode.current === 'command') setHearingOnce(now - lastVoice.current < 450)

    // Talking over Alex (several words, not one): he asks you to let him finish.
    if (alex && voiced) checkTalkOver(now)
    if (phaseRef.current === 'answering' && wantListening.current && recMode.current === 'answer') checkTurn(now)
    if (phaseRef.current === 'feedback' && recMode.current === 'command') checkCommandTurn(now)
  }

  handlersRef.current = { runCommand, checkTurn, checkCommandTurn, holdCountdown, checkTalkOver }
  tickRef.current = onTick

  // Microphone volume, for fast turn-taking and interruptions.
  useEffect(() => {
    if (!canListen || !navigator.mediaDevices?.getUserMedia) return undefined
    let dead = false
    let timer = null
    createVoiceDetector()
      .then((v) => {
        if (dead) { v.stop(); return }
        vadRef.current = v
        setVadOn(true)
        let lastT = performance.now()
        timer = setInterval(() => {
          const t = performance.now()
          const dt = Math.min(200, t - lastT)
          lastT = t
          let level = 0
          try { level = v.read() } catch { return }
          tickRef.current?.(level, Date.now(), dt)
        }, 50)
      })
      .catch(() => { if (!dead) setVadOn(false) })
    return () => {
      dead = true
      clearInterval(timer)
      vadRef.current?.stop()
      vadRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Without the volume reading, decide when you've finished from the speech-to-text.
  useEffect(() => {
    if (vadOn || phase !== 'answering' || !listening) return undefined
    const t = setInterval(() => {
      const now = Date.now()
      setHearingOnce(now - lastHeard.current < 1300)
      handlersRef.current.checkTurn(now)
    }, 300)
    return () => clearInterval(t)
  }, [phase, listening, vadOn]) // eslint-disable-line react-hooks/exhaustive-deps

  // The same after the feedback, for questions and replies.
  useEffect(() => {
    if (vadOn || phase !== 'feedback' || !commandMode) return undefined
    const t = setInterval(() => handlersRef.current.checkCommandTurn(Date.now()), 300)
    return () => clearInterval(t)
  }, [phase, commandMode, vadOn]) // eslint-disable-line react-hooks/exhaustive-deps

  // Count down, then go to the next question (or the results after the last one).
  // While counting down, Alex listens for "next", "try again", "repeat" or "wait".
  useEffect(() => {
    if (countdown === null) return undefined
    if (phase !== 'feedback') {
      setCountdown(null)
      return undefined
    }
    if (canListen && recMode.current !== 'command') listenForCommand(false)
    if (countdown <= 0) {
      goNext()
      return undefined
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000)
    return () => clearTimeout(t)
  }, [countdown, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ask each question once the call has connected, then start listening
  useEffect(() => {
    if (connecting) return undefined
    setStep('main')
    setPhase('asking')
    setAside(null)
    const lead = index === 0 ? greeting(bargeRef.current, firstName, pathway, roleContext, INTERVIEWER) : NEXT_LEADS[(index - 1) % NEXT_LEADS.length]
    const about = index > 0 && q.id !== 'close' ? ` ${aboutLine(q.focus)}` : ''
    const t = setTimeout(() => {
      if (index === 0) gestureNow('wave')
      speakLine(`${lead}${about} ${q.text}`, beginAnswer)
    }, index === 0 ? 350 : 400)
    return () => { clearTimeout(t); stopSpeech() }
  }, [index, connecting]) // eslint-disable-line react-hooks/exhaustive-deps

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
    clearTimeout(commandTimer.current)
    clearTimeout(cutInTimer.current)
  }, [])

  const inFollow = step === 'follow' && Boolean(followUp)
  const showFollowHeader = inFollow && phase !== 'feedback'
  const boxText = (inFollow ? followAnswers[index] : answers[index]) || ''
  const words = wordCount(boxText)
  const answerListening = listening && !commandMode

  let status = null
  if (!connecting) {
    if (cutIn) status = { tone: 'think', text: `Please let ${INTERVIEWER} finish` }
    else if (phase === 'asking') status = { tone: 'speak', text: inFollow ? `${INTERVIEWER} is asking a follow-up` : `${INTERVIEWER} is speaking` }
    else if (phase === 'answering') {
      if (answerListening) status = hearing ? { tone: 'hear', text: 'Listening · I can hear you' } : { tone: 'listen', text: 'Listening · start talking' }
      else status = { tone: 'idle', text: canListen ? 'Microphone paused' : 'Type your answer below' }
    } else if (phase === 'checking') status = { tone: 'think', text: `${INTERVIEWER} is thinking…` }
    else if (commandMode) status = { tone: hearing ? 'hear' : 'listen', text: 'Listening · say "next", "try again" or "repeat"' }
    else status = { tone: 'speak', text: 'Feedback' }
  }

  const primary = {
    asking: { label: 'Answer now', onClick: skipToAnswer, disabled: connecting },
    answering: { label: 'Done answering', onClick: finishAnswer, disabled: false },
    checking: { label: `${INTERVIEWER} is thinking…`, onClick: undefined, disabled: true },
    feedback: { label: last ? 'Finish and see results' : 'Next question', onClick: goNext, disabled: false },
  }[phase]

  const progressStep = phase === 'feedback' ? 1 : inFollow ? 0.75 : 0.5

  // How full each step of the progress bar is
  const segFill = (n) => (n < index ? 1 : n === index ? progressStep : 0)
  const showTools = phase !== 'checking'

  return (
    <section className="iv-call" aria-label="Practice interview call">
      <div className="iv-call-bar">
        <span className="iv-live"><span className={script.on ? 'iv-live-dot is-ring' : 'iv-live-dot'} /> Practice call{pathway ? ` · ${pathway}` : ''}</span>
        <ol className="iv-progress" aria-label={`Question ${index + 1} of ${questions.length}`}>
          {questions.map((qq, n) => (
            <li key={qq.id} className={n === index ? 'is-now' : n < index ? 'is-done' : ''}>
              <span style={{ '--fill': segFill(n) }} />
            </li>
          ))}
        </ol>
        <span className="iv-clock" aria-label="Call length">{formatClock(elapsed)}</span>
      </div>

      <div className="iv-call-grid">
        {/* Left: the video call */}
        <div className="iv-call-main">
          <div className={speaking ? 'iv-stage is-speaking' : 'iv-stage'}>
            <Face
              speaking={speaking}
              listening={phase === 'answering' && answerListening}
              asking={asking}
              thinking={phase === 'checking'}
              mood={faceMood(phase, review)}
              wordTick={wordTick}
              gesture={gesture}
            />

            <span className="iv-tag">
              <span className={speaking ? 'iv-bars is-on' : 'iv-bars'} aria-hidden="true"><span /><span /><span /></span>
              {INTERVIEWER} · Practice interviewer
              <span
                className={aiStatus?.available ? 'iv-tag-ai is-on' : 'iv-tag-ai'}
                title={aiStatus?.available ? `${INTERVIEWER}'s AI is on and replying` : `${INTERVIEWER}'s AI isn't working, so he's using standard replies`}
              >
                <span className="iv-tag-ai-dot" aria-hidden="true" />
                {aiStatus?.available ? 'AI on' : aiStatus?.checking ? 'Checking AI…' : 'Standard replies'}
              </span>
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
              <span className="iv-pip-name">
                {vadOn && (
                  <span className="iv-meter" ref={meterRef} aria-hidden="true">
                    <span /><span /><span /><span /><span />
                  </span>
                )}
                You{listening && hearing ? ' · speaking' : ''}
              </span>
            </div>

            {captionsOn && caption && (
              <p className="iv-caption" aria-live="polite" key={caption}>{caption}</p>
            )}

            <div className={connecting ? 'iv-connecting' : 'iv-connecting is-done'} aria-hidden={!connecting}>
              <span className="iv-spinner" />
              <span>Connecting to {INTERVIEWER}…</span>
            </div>
          </div>

          {/* Call controls, like a video call */}
          <div className="iv-dock" role="toolbar" aria-label="Call controls">
            {canListen && (
              <button
                type="button"
                className={answerListening ? 'iv-dock-btn is-live' : 'iv-dock-btn'}
                onClick={phase === 'answering' ? (answerListening ? pauseListening : () => startListening('answer')) : skipToAnswer}
                disabled={connecting || phase === 'checking' || phase === 'feedback'}
                aria-pressed={answerListening}
              >
                <span className="iv-dock-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" />
                  </svg>
                </span>
                <span className="iv-dock-label">{answerListening ? 'Pause mic' : 'Answer'}</span>
              </button>
            )}
            <button type="button" className={cameraOn ? 'iv-dock-btn' : 'iv-dock-btn is-off'} onClick={cameraOn ? stopCamera : startCamera} aria-pressed={cameraOn}>
              <span className="iv-dock-icon"><Icon name="video" size={22} /></span>
              <span className="iv-dock-label">Camera</span>
            </button>
            {canSpeak && (
              <button type="button" className={voiceOn ? 'iv-dock-btn' : 'iv-dock-btn is-off'} onClick={() => setVoiceOn(!voiceOn)} aria-pressed={voiceOn}>
                <span className="iv-dock-icon"><Icon name={voiceOn ? 'volume' : 'mute'} size={22} /></span>
                <span className="iv-dock-label">Voice</span>
              </button>
            )}
            <button type="button" className={captionsOn ? 'iv-dock-btn' : 'iv-dock-btn is-off'} onClick={() => setCaptionsOn((c) => !c)} aria-pressed={captionsOn}>
              <span className="iv-dock-icon"><Icon name="captions" size={22} /></span>
              <span className="iv-dock-label">Captions</span>
            </button>
            <button type="button" className="iv-dock-btn is-end" onClick={onQuit}>
              <span className="iv-dock-icon"><Icon name="phone" size={22} /></span>
              <span className="iv-dock-label">End call</span>
            </button>
          </div>
        </div>

        {/* Right: the question, your answer and feedback */}
        <div className="iv-qa" key={`${q.id}-${showFollowHeader ? 'follow' : 'main'}`}>
          <div className="iv-q-head">
            <span className="iv-q-n" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <div className="iv-q-text">
              <p className={showFollowHeader ? 'iv-asks is-follow' : 'iv-asks'}>
                {showFollowHeader
                  ? <><Icon name="motion" size={13} /> Follow-up question</>
                  : `Question ${index + 1} of ${questions.length}`}
              </p>
              <h2 className="iv-question">{showFollowHeader ? followUp.text : q.text}</h2>
              {(showFollowHeader ? followUp.why : q.focus) && (
                <p className="iv-focus"><Icon name="check" size={14} /> {showFollowHeader ? followUp.why : q.focus}</p>
              )}
            </div>
          </div>

          {showFollowHeader && answers[index] && (
            <details className="iv-prev">
              <summary>Your first answer</summary>
              <p>{answers[index]}</p>
            </details>
          )}

          {aside && aside.i === index && (
            <div className="iv-aside" role="status" aria-live="polite">
              <p className="iv-aside-line is-you"><span>You</span>{aside.you}</p>
              <p className="iv-aside-line is-alex">
                <span>{INTERVIEWER}</span>
                {aside.alex || <em className="iv-aside-wait">Thinking…</em>}
              </p>
            </div>
          )}

          {safety && (
            <div className="iv-safety" role="alert">
              <Icon name="shield" size={18} />
              <p>
                If you're worried about your safety, talk to a trusted adult or call <strong>Childline free on 0800 1111</strong>.
                If you're in danger right now, call <strong>999</strong>. <Link to="/safeguarding">More help on staying safe</Link>
              </p>
            </div>
          )}

          {(phase === 'asking' || phase === 'answering') && (
            <div className="iv-answer-block">
              <label className="iv-answer-label" htmlFor="iv-answer">
                {inFollow ? 'Your follow-up answer' : 'Your answer'}
                <span className="iv-answer-hint">
                  {canListen
                    ? answerListening ? ' - pause the mic if you want to edit it' : ' - you can edit it, or press Answer to keep talking'
                    : ' - press Done answering when you have finished'}
                </span>
              </label>
              <div className={answerListening ? 'iv-answer-wrap is-listening' : 'iv-answer-wrap'}>
                <textarea
                  id="iv-answer"
                  className="iv-answer"
                  rows={inFollow ? 5 : 7}
                  value={boxText}
                  onChange={(e) => setCurrentText(index, inFollow ? 'follow' : 'main', e.target.value)}
                  placeholder={
                    canListen
                      ? phase === 'asking'
                        ? `${INTERVIEWER} will start listening when he's finished…`
                        : 'Start talking - your words will appear here…'
                      : 'Type your answer here…'
                  }
                  readOnly={answerListening}
                />
                <span className="iv-words">{words} words</span>
              </div>
              {canListen && phase === 'answering' && answerListening && (
                <p className="iv-auto-note">
                  Just talk naturally. When you finish, {INTERVIEWER} will reply after a short pause.
                </p>
              )}
            </div>
          )}

          {micError && <p className="iv-warn" role="alert">{micError}</p>}
          {!micError && quietTooLong && phase === 'answering' && answerListening && (
            <p className="iv-warn" role="status">
              {INTERVIEWER} can't make out any words yet. Check your microphone is on and allowed for this site, and try
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
            <LiveFeedback
              review={review}
              answer={answers[index]}
              followUp={followUp}
              followAnswer={followAnswers[index] || ''}
              onRetry={tryAgain}
            />
          )}

          {phase === 'feedback' && countdown !== null && (
            <div className="iv-auto">
              <span className="iv-auto-bar" style={{ '--secs': `${AUTO_SECONDS}s` }} aria-hidden="true" />
              <span className="iv-auto-text">
                {last ? 'Showing your results' : 'Next question'} in <strong>{countdown}</strong>
                {canListen && <span className="iv-auto-say"> · or say &ldquo;next&rdquo;</span>}
              </span>
              <button type="button" className="iv-auto-stay" onClick={stayHere}>
                Stay on this question
              </button>
            </div>
          )}

          <div className="iv-qa-foot">
            {showTools && (
              <div className="iv-tools">
                <button type="button" className="iv-tool" onClick={repeat} disabled={connecting}>
                  <Icon name="motion" size={15} /> Repeat
                </button>
                <button type="button" className={showStar ? 'iv-tool is-on' : 'iv-tool'} onClick={() => setShowStar((s) => !s)} aria-expanded={showStar}>
                  <Icon name="book" size={15} /> STAR tips
                </button>
                {inFollow && (phase === 'asking' || phase === 'answering') && (
                  <button type="button" className="iv-tool" onClick={skipFollowUp}>
                    <Icon name="arrowRight" size={15} /> Skip follow-up
                  </button>
                )}
                <label className="iv-switch" title="Move on to the next question by itself after the feedback">
                  <input type="checkbox" checked={autoNext} onChange={(e) => setAutoNext(e.target.checked)} />
                  <span className="iv-switch-track" aria-hidden="true" />
                  Move on by itself
                </label>
              </div>
            )}

            {showStar && (
              <div className="iv-star-pop" role="note">
                <strong>STAR:</strong> Situation (when and where) · Task (what was needed) · Action (what <em>you</em> did) · Result (how it ended, what you learned)
              </div>
            )}

            <button type="button" className="primary-button iv-next" onClick={primary.onClick} disabled={primary.disabled}>
              {primary.label}
              {!primary.disabled && <Icon name="arrowRight" size={15} />}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- 3. Feedback ---------- */
function Feedback({ result, pathway, onAgain, signedIn }) {
  const INTERVIEWER = useInterviewer().name
  return (
    <section className="iv-feedback">
      <div className="iv-summary">
        <ScoreRing value={result.overall} />
        <div className="iv-summary-text">
          <p className="iv-kicker">{pathway} practice interview</p>
          <h2>{result.verdict}</h2>
          {result.coachSummary && (
            <p className="iv-coach">
              <span className="iv-live-fb-who">From {INTERVIEWER} <span className="iv-ai-tag">AI</span></span>
              {result.coachSummary}
            </p>
          )}
          {result.bestQuestion && (
            <p className="iv-best"><Icon name="check" size={15} /> Your strongest answer: “{result.bestQuestion}”</p>
          )}
          {result.saved ? (
            <p className="iv-saved">
              <Icon name="check" size={14} /> Score saved to <Link to="/profile#interview-practice">your profile</Link>
            </p>
          ) : !signedIn && (
            <p className="iv-saved is-off">
              <SignInLink>Sign in</SignInLink> to save your scores and see your progress over time.
            </p>
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
          <h3>{['One thing', 'Two things', 'Three things'][Math.min(result.focusOn.length, 3) - 1]} to work on</h3>
          <ol>
            {result.focusOn.map((t, n) => (
              <li key={t} style={{ '--n': n }}>
                <span className="iv-focus-n" aria-hidden="true">{String(n + 1).padStart(2, '0')}</span>
                <p>{t}</p>
              </li>
            ))}
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
              <span className={`iv-review-score is-${scoreTone(r.score)}`}>{r.score}</span>
            </summary>
            <div className="iv-review-body">
              <p className="iv-review-focus">What this question tests: {r.focus.toLowerCase()}</p>
              <AnswerWarning text={r.warning} />
              <blockquote className="iv-review-answer">
                {r.answer || <em>No answer given</em>}
              </blockquote>
              <p className="iv-review-meta">
                {r.words} words{r.pace ? ` · about ${r.pace} words a minute` : ''}
                {r.interruptPenalty > 0 ? ` · ${r.interruptPenalty} points off for talking over ${INTERVIEWER}` : ''}
              </p>
              <div className="iv-review-cols">
                {r.strengths.length > 0 && (
                  <div>
                    <h4 className="is-good">What went well</h4>
                    <ul>{r.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
                  </div>
                )}
                {r.tips.filter((s) => s !== r.warning).length > 0 && (
                  <div>
                    <h4 className="is-tip">How to improve</h4>
                    <ul>{r.tips.filter((s) => s !== r.warning).map((s) => <li key={s}>{s}</li>)}</ul>
                  </div>
                )}
              </div>
            </div>
          </details>
        ))}
      </div>

      <p className="iv-small iv-disclaimer">
        Your scores come from automatic checks for structure, detail and clarity, so the same answer always
        gets the same score. Anything marked AI was written by an AI model, which can misunderstand things.
        It's all a guide to help you practise - it is not used by Amazon and is not a real interview result.
      </p>
    </section>
  )
}

/* ---------- Page ---------- */
function Interview() {
  // Alex or Peccy, remembered on this device.
  const [interviewerId, setInterviewerIdState] = useState(() => {
    try {
      const saved = localStorage.getItem(INTERVIEWER_KEY)
      return INTERVIEWERS.some((w) => w.id === saved) ? saved : 'alex'
    } catch {
      return 'alex'
    }
  })
  const setInterviewerId = (id) => {
    setInterviewerIdState(id)
    try { localStorage.setItem(INTERVIEWER_KEY, id) } catch { /* private mode */ }
  }
  const interviewer = INTERVIEWERS.find((w) => w.id === interviewerId) || INTERVIEWERS[0]
  const INTERVIEWER = interviewer.name
  // The server uses the same name in what the interviewer says.
  useEffect(() => { setApiInterviewer(interviewer.id) }, [interviewer.id])
  const { user } = useAuth()
  const [params] = useSearchParams()
  // ?pathway=Finance (e.g. from the career quiz) picks the pathway straight away.
  const urlPathway = PATHWAYS.includes(params.get('pathway')) ? params.get('pathway') : null
  const [stage, setStage] = useState('setup') // setup | call | reviewing | feedback
  const [pathway, setPathway] = useState(urlPathway || 'Digital')
  const [hasCv, setHasCv] = useState(false)
  const [useCv, setUseCv] = useState(false)
  const [mode, setMode] = useState(SpeechRecognition ? 'speak' : 'type')
  const [voiceOn, setVoiceOn] = useState(canSpeak)
  const [voiceURI, setVoiceURIState] = useState(savedVoiceURI)
  const setVoiceURI = (uri) => { setVoiceURIState(uri); saveVoiceURI(uri) }
  const [cameraWanted, setCameraWanted] = useState(hasCamera)
  const [bargeIn, setBargeInState] = useState(() => {
    try { return localStorage.getItem('launchpad-interview-bargein') !== 'off' } catch { return true }
  })
  const setBargeIn = (on) => {
    setBargeInState(on)
    try { localStorage.setItem('launchpad-interview-bargein', on ? 'on' : 'off') } catch { /* private mode */ }
  }
  const [questions, setQuestions] = useState([])
  const [roleContext, setRoleContext] = useState('')
  const [result, setResult] = useState(null)
  const [aiStatus, setAiStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Hidden "scripted replies" panel: type "script" on the page, or click the
  // "Interview practice" label 5 times. See modules/interview-script.js.
  const script = useScript()
  const [scriptOpen, setScriptOpen] = useState(false)
  const openScript = useCallback(() => setScriptOpen(true), [])
  useSecretWord('script', openScript)
  const kickerClicks = useRef([])
  const kickerClick = () => {
    const now = Date.now()
    kickerClicks.current = [...kickerClicks.current.filter((at) => now - at < 2500), now]
    if (kickerClicks.current.length >= 5) {
      kickerClicks.current = []
      setScriptOpen(true)
    }
  }

  // Is Alex's AI working? Checked on the set-up screen and during the call, so
  // the dot turns orange if the AI stops replying. Asking also loads the model.
  useEffect(() => {
    if (stage !== 'setup' && stage !== 'call') return undefined
    let live = true
    let timer = null
    const check = () => {
      api.interviewAiStatus()
        .then((s) => {
          if (!live) return
          setAiStatus(s)
          timer = setTimeout(check, s.checking ? 3000 : 15000)
        })
        .catch(() => {
          if (!live) return
          setAiStatus({ available: false, checking: false, reason: 'Could not reach the Launchpad server.' })
          timer = setTimeout(check, 15000)
        })
    }
    check()
    return () => { live = false; clearTimeout(timer) }
  }, [stage])

  // Has the signed-in user uploaded a CV? Then Alex can ask about it.
  useEffect(() => {
    if (!user) return undefined
    let live = true
    api.getCv()
      .then((d) => { if (live) { setHasCv(Boolean(d.cv)); setUseCv(Boolean(d.cv)) } })
      .catch(() => {})
    return () => { live = false }
  }, [user])

  // Start with the pathway from the career quiz, if there is one.
  useEffect(() => {
    if (!urlPathway && user?.quizPathway && PATHWAYS.includes(user.quizPathway)) setPathway(user.quizPathway)
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
      const data = await api.interviewQuestions(pathway, useCv && hasCv)
      setQuestions(data.questions)
      setRoleContext(data.context || '')
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
      const data = await api.reviewInterview(answers, pathway)
      setResult(data)
      setStage('feedback')
    } catch (err) {
      setError(err.message)
      setStage('setup')
    }
  }

  return (
    <InterviewerContext.Provider value={interviewer}>
    <main className="iv">
      <header className={stage === 'setup' ? 'iv-hero' : 'iv-hero is-compact'}>
        <div className="iv-hero-inner">
          <p className="iv-kicker" onClick={kickerClick}>Interview practice{script.on ? '.' : ''}</p>
          <h1>Practise with a <span>virtual interviewer</span></h1>
          {stage === 'setup' && (
            <>
              <p className="iv-lead">
                Jump on a practice video call. {INTERVIEWER} will ask you five real interview questions,
                ask follow-up questions like a real interviewer, and give you quick feedback after each answer.
              </p>
              <ul className="iv-facts">
                <li><Icon name="video" size={20} /><strong>5 questions</strong><span>with follow-ups</span></li>
                <li><Icon name="clock" size={20} /><strong>About 10 minutes</strong><span>at your own pace</span></li>
                <li><Icon name="check" size={20} /><strong>Feedback</strong><span>after every answer</span></li>
                <li><Icon name="lock" size={20} /><strong>Private</strong><span>video isn't recorded</span></li>
              </ul>
            </>
          )}
        </div>
      </header>

      <div className="iv-body">
        {stage === 'setup' && (
          <Setup
            interviewerId={interviewerId} setInterviewerId={setInterviewerId}
            pathway={pathway} setPathway={setPathway}
            mode={mode} setMode={setMode}
            voiceOn={voiceOn} setVoiceOn={setVoiceOn}
            voiceURI={voiceURI} setVoiceURI={setVoiceURI}
            cameraWanted={cameraWanted} setCameraWanted={setCameraWanted}
            bargeIn={bargeIn} setBargeIn={setBargeIn}
            aiStatus={aiStatus}
            signedIn={Boolean(user)} hasCv={hasCv} useCv={useCv} setUseCv={setUseCv}
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
            bargeIn={bargeIn}
            firstName={spokenFirstName(user?.fullName)}
            pathway={pathway}
            roleContext={roleContext}
            aiStatus={aiStatus}
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
          <Feedback result={result} pathway={pathway} signedIn={Boolean(user)} onAgain={() => { setResult(null); setStage('setup') }} />
        )}
      </div>

      {scriptOpen && <ScriptPanel pathway={pathway} who={INTERVIEWER} onClose={() => setScriptOpen(false)} />}
    </main>
    </InterviewerContext.Provider>
  )
}

export default Interview
