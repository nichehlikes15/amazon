import { OfficeBackdrop } from './interviewer-video'
import { useInterviewerRig } from './interviewer-rig'

/*
  Peccy, Amazon's orange mascot, as the practice interviewer. Our own simple
  drawing: a round orange blob with nub arms and a smile shaped like the Amazon
  smile, wearing a lanyard and badge. The movement comes from
  interviewer-rig.js, like Alex - plus Peccy squashes and stretches as he
  talks, waves hello and goodbye, gestures with his arms, gives a thumbs-up
  and hops when you do well.
*/

const ORANGE = '#FF9900'
const BROW = '#b8540a'
const INK = '#232F3E'
const BLOB = 'M182 372 C178 300 188 236 208 184 C234 116 274 72 320 72 C366 72 406 116 432 184 C452 236 462 300 458 372 Z'

const PECCY_RIG = {
  pivot: [320, 368], // he's one blob, so he sways and squashes from the bottom
  bodyPivot: [320, 368],
  bodyFollows: true,
  sway: 0.7,
  listenTilt: 3,
  nod: 3.5,
  gaze: 6,
  browL: [284, 121],
  browR: [356, 121],
  browWorry: 10,
  smilePivot: [322, 222],
  smileFade: 4,
  mouthMax: 9,
  squash: true,
  hop: 7,
  happyLids: 0, // his big round eyes look sleepy half-closed
  armL: [212, 248], // where each arm joins the body
  armR: [428, 248],
}

export default function PeccyVideo({ speaking, listening, asking, thinking, mood, wordTick, gesture }) {
  const part = useInterviewerRig({ speaking, listening, asking, thinking, mood, wordTick, gesture }, PECCY_RIG)

  return (
    <svg className="iv-person is-rigged" viewBox="0 0 640 360"
      preserveAspectRatio="xMidYMid slice" role="img" aria-label="Peccy, the practice interviewer">
      <OfficeBackdrop />
      <defs>
        <radialGradient id="pc-shine" cx="38%" cy="22%" r="62%">
          <stop offset="0" stopColor="#ffc35c" stopOpacity="0.9" />
          <stop offset="0.55" stopColor="#ffb02e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pc-shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.55" stopColor="#d9670b" stopOpacity="0" />
          <stop offset="1" stopColor="#d9670b" stopOpacity="0.55" />
        </linearGradient>
      </defs>

      {/* Nub arms (behind the body) */}
      <g className="iv-body" ref={part.body}>
        <g ref={part.armL}>
          <ellipse cx="178" cy="286" rx="30" ry="52" transform="rotate(34 178 286)" fill="#f59000" />
        </g>
        <g ref={part.armR}>
          {/* thumb, only shown for a thumbs-up */}
          <ellipse ref={part.thumbR} cx="500" cy="318" rx="15" ry="9" transform="rotate(14 500 318)" fill="#e27a00" opacity="0" />
          <ellipse cx="462" cy="286" rx="30" ry="52" transform="rotate(-34 462 286)" fill="#e27a00" />
        </g>
      </g>

      {/* Peccy himself */}
      <g className="iv-head" ref={part.head}>
        <path d={BLOB} fill={ORANGE} />
        <path d={BLOB} fill="url(#pc-shade)" />
        <path d={BLOB} fill="url(#pc-shine)" />

        {/* eyebrows */}
        <g className="iv-brows" stroke={BROW} strokeWidth="6" strokeLinecap="round" fill="none">
          <path ref={part.browL} d="M266 126 Q284 116 302 124" />
          <path ref={part.browR} d="M338 124 Q356 116 374 126" />
        </g>
        {/* eye whites, then the pupils (which look around) */}
        <ellipse cx="286" cy="164" rx="23" ry="27" fill="#fff" />
        <ellipse cx="354" cy="164" rx="23" ry="27" fill="#fff" />
        <g className="iv-eyes" ref={part.eyes}>
          <circle cx="290" cy="169" r="11.5" fill={INK} />
          <circle cx="350" cy="169" r="11.5" fill={INK} />
          <circle cx="294" cy="164" r="4" fill="#fff" />
          <circle cx="354" cy="164" r="4" fill="#fff" />
        </g>
        {/* eyelids for blinking */}
        <rect className="iv-lid" ref={part.lidL} x="261" y="135" width="50" height="58" rx="24" fill={ORANGE} />
        <rect className="iv-lid" ref={part.lidR} x="329" y="135" width="50" height="58" rx="24" fill={ORANGE} />
        {/* cheeks */}
        <g ref={part.cheeks} opacity="0.28">
          <ellipse cx="258" cy="210" rx="16" ry="9" fill="#ff6a3d" />
          <ellipse cx="382" cy="210" rx="16" ry="9" fill="#ff6a3d" />
        </g>
        {/* smile when quiet, opens while talking */}
        <g ref={part.smile}>
          <path d="M280 214 Q322 248 364 212" stroke={INK} strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M358 205 Q370 210 368 222" stroke={INK} strokeWidth="6" fill="none" strokeLinecap="round" />
        </g>
        <ellipse ref={part.mouth} cx="322" cy="226" rx="24" ry="0" fill="#3b1c0c" />

        {/* lanyard and badge */}
        <path d="M290 250 L306 326" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        <path d="M352 250 L336 326" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        <rect x="300" y="318" width="42" height="32" rx="5" fill="#ffffff" />
        <path d="M310 336 Q321 343 332 336" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>

      <rect width="640" height="360" fill="url(#iv-vignette)" pointerEvents="none" />
    </svg>
  )
}
