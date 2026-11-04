import { useInterviewerRig } from './interviewer-rig'

/*
  The interviewer's "video feed": Alex, an illustrated character drawn in SVG.
  All the movement (breathing, blinking, glances, talking, nodding, thinking,
  smiling or looking concerned after your answer) comes from interviewer-rig.js.

  It's drawn on purpose as an illustration rather than a real-looking person.
*/

const SKIN = '#d9a07b'
const SKIN_SHADE = '#c48a66'
const HAIR = '#3a2a22'
const SHIRT = '#2f6f73'
const SHIRT_SHADE = '#285f63'

// Where Alex's parts are, for the animation (see interviewer-rig.js).
// Numbers are in the drawing's own units (it's 640 x 360).
const ALEX_RIG = {
  pivot: [320, 232], // bottom of the head, where it turns and nods
  bodyPivot: [320, 362],
  bodyFollows: false,
  sway: 1,
  listenTilt: 2.6,
  nod: 2.6,
  gaze: 1.8,
  browL: [297, 134],
  browR: [343, 134],
  browWorry: 9,
  smilePivot: [320, 206],
  smileFade: 3.5,
  mouthMax: 8,
  squash: false,
  hop: 0,
  hand: [492, 300], // Alex's wrist, when his hand is up
  handScale: 1.2,
}

export default function InterviewerVideo({ speaking, listening, asking, thinking, mood, wordTick, gesture }) {
  const part = useInterviewerRig({ speaking, listening, asking, thinking, mood, wordTick, gesture }, ALEX_RIG)

  return (
    <svg className="iv-person is-rigged" viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" role="img"
      aria-label="Alex, the practice interviewer">
      <OfficeBackdrop />

      {/* Body (breathes gently) */}
      <g className="iv-body" ref={part.body}>
        <path d="M166 362 C172 302 224 264 320 260 C416 264 468 302 474 362 Z" fill={SHIRT} />
        <path d="M232 290 C252 312 280 330 320 332 C360 330 388 312 408 290 C380 300 352 304 320 304 C288 304 260 300 232 290 Z" fill={SHIRT_SHADE} opacity="0.6" />
        {/* neck + collar */}
        <path d="M292 214 L348 214 L352 270 C340 286 300 286 288 270 Z" fill={SKIN_SHADE} />
        <path d="M282 258 L320 300 L358 258 L372 266 L320 316 L268 266 Z" fill="#f2f5f8" />
        {/* lanyard + badge */}
        <path d="M296 270 L312 340" stroke="#FF9900" strokeWidth="5" strokeLinecap="round" />
        <path d="M344 270 L328 340" stroke="#FF9900" strokeWidth="5" strokeLinecap="round" />
        <rect x="300" y="334" width="40" height="30" rx="4" fill="#ffffff" />
        <path d="M309 352 Q320 359 331 352" stroke="#232F3E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>

      {/* Hand: hidden below the picture until Alex waves or gives a thumbs-up.
          Drawn with the wrist at 0,0 and the fingers pointing up. */}
      <g ref={part.hand} style={{ display: 'none' }}>
        <path d="M-24 6 L24 6 L30 90 L-30 90 Z" fill={SHIRT} />
        <rect x="-25" y="-2" width="50" height="14" rx="5" fill="#f2f5f8" />
        <g ref={part.handOpen}>
          <rect x="-22" y="-52" width="44" height="56" rx="16" fill={SKIN} />
          <rect x="-21" y="-86" width="10" height="46" rx="5" fill={SKIN} />
          <rect x="-9.5" y="-94" width="10" height="54" rx="5" fill={SKIN} />
          <rect x="2" y="-91" width="10" height="51" rx="5" fill={SKIN} />
          <rect x="13" y="-80" width="9" height="40" rx="4.5" fill={SKIN} />
          <rect x="-44" y="-50" width="11" height="36" rx="5.5" fill={SKIN} transform="rotate(-38 -24 -16)" />
          <path d="M-8 -22 Q0 -16 10 -22" stroke={SKIN_SHADE} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
        <g ref={part.handThumb} style={{ display: 'none' }}>
          <rect x="-15" y="-88" width="15" height="50" rx="7.5" fill={SKIN} />
          <rect x="-24" y="-50" width="48" height="56" rx="16" fill={SKIN} />
          <path d="M-2 -38 Q14 -38 20 -32 M-2 -24 Q14 -24 21 -18 M-2 -10 Q12 -10 19 -5"
            stroke={SKIN_SHADE} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M-14 -44 Q-8 -40 -2 -44" stroke={SKIN_SHADE} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      </g>

      {/* Head (sways, nods) */}
      <g className="iv-head" ref={part.head}>
        {/* inner group carries the size; the outer one is moved by the animation */}
        <g transform="translate(320 170) scale(1.14) translate(-320 -170)">
        <ellipse cx="258" cy="168" rx="12" ry="18" fill={SKIN_SHADE} />
        <ellipse cx="382" cy="168" rx="12" ry="18" fill={SKIN_SHADE} />
        <ellipse cx="320" cy="160" rx="62" ry="74" fill={SKIN} />
        {/* hair */}
        <path d="M257 160 C246 98 286 70 324 72 C368 74 398 104 384 162 C380 140 370 124 352 116 C338 128 312 132 290 128 C276 134 264 146 257 160 Z" fill={HAIR} />
        {/* cheeks */}
        <g ref={part.cheeks} opacity="0.22">
          <ellipse cx="284" cy="186" rx="13" ry="8" fill="#e07d6a" />
          <ellipse cx="356" cy="186" rx="13" ry="8" fill="#e07d6a" />
        </g>
        {/* eyebrows */}
        <g className="iv-brows" stroke={HAIR} strokeWidth="5" strokeLinecap="round" fill="none">
          <path ref={part.browL} d="M284 138 Q297 131 310 137" />
          <path ref={part.browR} d="M330 137 Q343 131 356 138" />
        </g>
        {/* eyes */}
        <g className="iv-eyes" ref={part.eyes}>
          <ellipse cx="297" cy="158" rx="6.5" ry="7.5" fill="#2b2220" />
          <ellipse cx="343" cy="158" rx="6.5" ry="7.5" fill="#2b2220" />
          <circle cx="299" cy="155.5" r="2" fill="#fff" />
          <circle cx="345" cy="155.5" r="2" fill="#fff" />
        </g>
        {/* eyelids for blinking */}
        <rect className="iv-lid" ref={part.lidL} x="288" y="149" width="19" height="18" rx="6" fill={SKIN} />
        <rect className="iv-lid" ref={part.lidR} x="334" y="149" width="19" height="18" rx="6" fill={SKIN} />
        {/* nose */}
        <path d="M320 162 Q313 182 322 186" stroke={SKIN_SHADE} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        {/* mouth: smile when quiet, opens while talking */}
        <path ref={part.smile} d="M303 204 Q320 214 337 204" stroke="#8a3b2e" strokeWidth="4" fill="none" strokeLinecap="round" />
        <ellipse ref={part.mouth} cx="320" cy="207" rx="13" ry="0" fill="#5c2320" />
        </g>
      </g>

      <rect width="640" height="360" fill="url(#iv-vignette)" pointerEvents="none" />
    </svg>
  )
}

// The blurred office behind the interviewer, plus the shared gradients
// (both characters use the same room).
export function OfficeBackdrop() {
  return (
    <>
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
      <rect x="468" y="52" width="16" height="40" rx="2" fill="#FF9900" />
      <rect x="488" y="58" width="14" height="34" rx="2" fill="#232F3E" />
      <rect x="506" y="48" width="18" height="44" rx="2" fill="#FF9900" opacity="0.7" />
      <rect x="528" y="62" width="14" height="30" rx="2" fill="#232F3E" />
      {/* plant */}
      <rect x="560" y="210" width="40" height="46" rx="6" fill="#e9e1d6" />
      <ellipse cx="580" cy="196" rx="34" ry="30" fill="#5f9e6e" />
      <ellipse cx="560" cy="182" rx="18" ry="22" fill="#4f8a5d" />
      {/* desk edge */}
      <rect x="0" y="300" width="640" height="60" fill="#b9c3cf" />
      <rect width="640" height="360" fill="url(#iv-light)" />
    </g>
    </>
  )
}
