import { useEffect, useRef } from 'react'

/*
  The interviewer's "video feed": an illustrated, animated character drawn in
  SVG. It blinks, breathes and sways, moves its mouth while it speaks (in time
  with the browser voice where the browser reports word timings), raises its
  eyebrows when it asks something, and nods while you answer.

  It's drawn on purpose as an illustration rather than a real-looking person.
*/

const SKIN = '#d9a07b'
const SKIN_SHADE = '#c48a66'
const HAIR = '#3a2a22'
const SHIRT = '#2f6f73'
const SHIRT_SHADE = '#285f63'

export default function InterviewerVideo({ speaking, listening, asking, wordTick }) {
  const mouthRef = useRef(null)
  const smileRef = useRef(null)
  const kick = useRef(0)
  const speakingRef = useRef(speaking)
  speakingRef.current = speaking

  // Each spoken word gives the mouth a little "kick" open.
  useEffect(() => { kick.current = 1 }, [wordTick])

  // Mouth movement - updated straight on the SVG so React doesn't re-render 60 times a second.
  useEffect(() => {
    let frame
    let open = 0
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(64, now - last) / 1000
      last = now
      let goal = 0
      if (speakingRef.current) {
        const t = now / 1000
        const wobble = Math.abs(Math.sin(t * 9.1) * Math.sin(t * 4.7 + 1.3))
        goal = Math.min(1, 0.18 + 0.55 * wobble + 0.45 * kick.current)
      }
      kick.current = Math.max(0, kick.current - dt * 5)
      open += (goal - open) * Math.min(1, dt * 20)
      const ry = open * 8
      if (mouthRef.current) mouthRef.current.setAttribute('ry', ry.toFixed(2))
      if (smileRef.current) smileRef.current.style.opacity = String(Math.max(0, 1 - ry / 3.5))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  const state = [
    'iv-person',
    speaking ? 'is-speaking' : '',
    listening ? 'is-listening' : '',
    asking ? 'is-asking' : '',
  ].join(' ')

  return (
    <svg className={state} viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" role="img"
      aria-label="Alex, the practice interviewer">
      <defs>
        <filter id="iv-bg-blur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <linearGradient id="iv-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfe6ef" />
          <stop offset="1" stopColor="#c9d3df" />
        </linearGradient>
        <radialGradient id="iv-vignette" cx="50%" cy="45%" r="75%">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
        <radialGradient id="iv-light" cx="20%" cy="10%" r="70%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background: an office, out of focus like a real camera */}
      <g filter="url(#iv-bg-blur)">
        <rect width="640" height="360" fill="url(#iv-wall)" />
        {/* window */}
        <rect x="40" y="40" width="170" height="190" rx="6" fill="#f4f8fc" />
        <rect x="40" y="40" width="170" height="190" rx="6" fill="#bcd6ee" opacity="0.55" />
        <rect x="122" y="40" width="6" height="190" fill="#e6edf4" />
        {/* shelf with books */}
        <rect x="455" y="92" width="150" height="8" rx="2" fill="#a88b6c" />
        <rect x="468" y="52" width="16" height="40" rx="2" fill="#ff9900" />
        <rect x="488" y="58" width="14" height="34" rx="2" fill="#2f6f73" />
        <rect x="506" y="48" width="18" height="44" rx="2" fill="#7c3aed" opacity="0.7" />
        <rect x="528" y="62" width="14" height="30" rx="2" fill="#232f3e" />
        {/* plant */}
        <rect x="560" y="210" width="40" height="46" rx="6" fill="#e9e1d6" />
        <ellipse cx="580" cy="196" rx="34" ry="30" fill="#5f9e6e" />
        <ellipse cx="560" cy="182" rx="18" ry="22" fill="#4f8a5d" />
        {/* desk edge */}
        <rect x="0" y="300" width="640" height="60" fill="#b9c3cf" />
        <rect width="640" height="360" fill="url(#iv-light)" />
      </g>

      {/* Body (breathes gently) */}
      <g className="iv-body">
        <path d="M166 362 C172 302 224 264 320 260 C416 264 468 302 474 362 Z" fill={SHIRT} />
        <path d="M232 290 C252 312 280 330 320 332 C360 330 388 312 408 290 C380 300 352 304 320 304 C288 304 260 300 232 290 Z" fill={SHIRT_SHADE} opacity="0.6" />
        {/* neck + collar */}
        <path d="M292 214 L348 214 L352 270 C340 286 300 286 288 270 Z" fill={SKIN_SHADE} />
        <path d="M282 258 L320 300 L358 258 L372 266 L320 316 L268 266 Z" fill="#f2f5f8" />
        {/* lanyard + badge */}
        <path d="M296 270 L312 340" stroke="#ff9900" strokeWidth="5" strokeLinecap="round" />
        <path d="M344 270 L328 340" stroke="#ff9900" strokeWidth="5" strokeLinecap="round" />
        <rect x="300" y="334" width="40" height="30" rx="4" fill="#ffffff" />
        <path d="M309 352 Q320 359 331 352" stroke="#232f3e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>

      {/* Head (sways, nods) */}
      <g className="iv-head">
        {/* inner group carries the size; the outer one is animated with CSS */}
        <g transform="translate(320 170) scale(1.14) translate(-320 -170)">
        <ellipse cx="258" cy="168" rx="12" ry="18" fill={SKIN_SHADE} />
        <ellipse cx="382" cy="168" rx="12" ry="18" fill={SKIN_SHADE} />
        <ellipse cx="320" cy="160" rx="62" ry="74" fill={SKIN} />
        {/* hair */}
        <path d="M257 160 C246 98 286 70 324 72 C368 74 398 104 384 162 C380 140 370 124 352 116 C338 128 312 132 290 128 C276 134 264 146 257 160 Z" fill={HAIR} />
        {/* cheeks */}
        <ellipse cx="284" cy="186" rx="13" ry="8" fill="#e07d6a" opacity="0.22" />
        <ellipse cx="356" cy="186" rx="13" ry="8" fill="#e07d6a" opacity="0.22" />
        {/* eyebrows */}
        <g className="iv-brows" stroke={HAIR} strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M284 138 Q297 131 310 137" />
          <path d="M330 137 Q343 131 356 138" />
        </g>
        {/* eyes */}
        <g className="iv-eyes">
          <ellipse cx="297" cy="158" rx="6.5" ry="7.5" fill="#2b2220" />
          <ellipse cx="343" cy="158" rx="6.5" ry="7.5" fill="#2b2220" />
          <circle cx="299" cy="155.5" r="2" fill="#fff" />
          <circle cx="345" cy="155.5" r="2" fill="#fff" />
        </g>
        {/* eyelids for blinking */}
        <rect className="iv-lid" x="288" y="149" width="19" height="18" rx="6" fill={SKIN} />
        <rect className="iv-lid" x="334" y="149" width="19" height="18" rx="6" fill={SKIN} />
        {/* nose */}
        <path d="M320 162 Q313 182 322 186" stroke={SKIN_SHADE} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        {/* mouth: smile when quiet, opens while talking */}
        <path ref={smileRef} d="M303 204 Q320 214 337 204" stroke="#8a3b2e" strokeWidth="4" fill="none" strokeLinecap="round" />
        <ellipse ref={mouthRef} cx="320" cy="207" rx="13" ry="0" fill="#5c2320" />
        </g>
      </g>

      <rect width="640" height="360" fill="url(#iv-vignette)" pointerEvents="none" />
    </svg>
  )
}
