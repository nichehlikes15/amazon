import { useEffect, useMemo, useRef } from 'react'

/*
  Brings an interviewer drawing to life (used by Alex and Peccy).

  One animation loop moves every part of the face, and every movement is
  smoothed, so the character blends from one thing to the next instead of
  snapping between fixed CSS loops:
  - breathes and sways a little, all the time
  - blinks every few seconds (sometimes twice), and when something changes
  - glances around with quick eye movements, mostly looking at you
  - while speaking: mouth moves with the words, the odd nod and eyebrow lift
  - while you answer: tilts its head, leans in slightly and nods now and then
  - while thinking: looks up and away, one eyebrow up
  - after your answer: smiles for a strong answer, looks concerned for a weak one
  One-off gestures, sent by the call as { kind, id } (a new id plays it again):
  - wave: hello at the start          - bye: wave goodbye at the end
  - thumbs: thumbs-up for a strong answer
  - nod: a quick double nod ("mm-hmm", "okay")
  - offer: "over to you" when it's your turn (Peccy holds out an arm)
  Alex raises a hand into the picture for the wave and thumbs-up; Peccy uses
  his arms, gestures as he talks and taps his side while he thinks.
  With reduced motion on, only blinks, the mouth and expressions change (the
  thumbs-up fades in without moving).
*/

// How long each gesture lasts (ms).
const GESTURES = { wave: 2400, bye: 2600, thumbs: 2100, nod: 900, offer: 1500 }
const HAND_GESTURES = ['wave', 'bye', 'thumbs']

const PART_NAMES = ['head', 'body', 'eyes', 'lidL', 'lidR', 'browL', 'browR', 'mouth', 'smile', 'cheeks', 'armL', 'armR', 'thumbR', 'hand', 'handOpen', 'handThumb']

function reducedMotion() {
  if (typeof window === 'undefined') return true
  if (document.documentElement.getAttribute('data-reduced-motion') === 'on') return true
  return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

// Move `cur` towards `target` smoothly. Higher rate = quicker.
const ease = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt))
// 0 -> 1 -> 0 as p goes from 0 to 1.
const pulse = (p) => (p <= 0 || p >= 1 ? 0 : Math.sin(Math.PI * p))
const rand = (a, b) => a + Math.random() * (b - a)
const f = (n, d = 2) => n.toFixed(d)

/*
  state: { speaking, listening, asking, thinking, mood: 'happy' | 'concerned' | null, wordTick, gesture }
  rig: where the parts are in the drawing (see ALEX_RIG / PECCY_RIG).
  Returns ref callbacks to put on the SVG parts: ref={parts.head} etc.
*/
export function useInterviewerRig(state, rig) {
  const els = useRef({})
  const parts = useMemo(
    () => Object.fromEntries(PART_NAMES.map((n) => [n, (el) => { els.current[n] = el }])),
    [],
  )
  const stateRef = useRef(state)
  const kick = useRef(0)
  const gestureRef = useRef(null)
  const gestureId = state.gesture?.id || 0
  const gestureKind = state.gesture?.kind || ''

  useEffect(() => { stateRef.current = state })
  useEffect(() => {
    if (gestureId && GESTURES[gestureKind]) gestureRef.current = { kind: gestureKind, at: performance.now() }
  }, [gestureId, gestureKind])
  // Each spoken word gives the mouth a little "kick" open.
  useEffect(() => { kick.current = 1 }, [state.wordTick])

  useEffect(() => {
    const p = els.current
    const s = {
      rot: 0, tilt: 0, ty: 0, lean: 1,
      gx: 0, gy: 0, gtx: 0, gty: 0, nextGaze: 0,
      blinkAt: -1e9, nextBlink: performance.now() + rand(1200, 3000), double: false,
      nodAt: -1e9, nextNod: 0,
      emph: 0, emphSide: 1, lastKick: 0,
      bL: 0, bR: 0, bRot: 0, smile: 1, cheek: 0.22, lidRest: 0, open: 0,
      armL: 0, armR: 0, thumb: 0, up: 0, handRot: 0,
      wasSpeaking: false, wasThinking: false, mood: null, moodAt: -1e9,
    }
    let last = performance.now()
    let frame

    const tick = (now) => {
      const dt = Math.min(64, now - last) / 1000
      last = now
      const st = stateRef.current
      const still = reducedMotion()
      const t = now / 1000
      const breath = still ? 0 : Math.sin(t * 1.3)

      // Something changed: blink, like people do when they switch attention.
      if (st.speaking && !s.wasSpeaking) s.nextBlink = Math.min(s.nextBlink, now + 120)
      if (Boolean(st.thinking) !== s.wasThinking) s.nextBlink = Math.min(s.nextBlink, now + 80)
      if ((st.mood || null) !== s.mood) {
        s.mood = st.mood || null
        s.moodAt = now
      }
      s.wasSpeaking = Boolean(st.speaking)
      s.wasThinking = Boolean(st.thinking)

      // Now and then a word gets a little emphasis: a nod, eyebrows up, a gesture.
      if (kick.current > 0.95 && now - s.lastKick > 140) {
        s.lastKick = now
        if (Math.random() < 0.28) {
          s.emph = 1
          s.emphSide = Math.random() < 0.5 ? -1 : 1
        }
      }
      s.emph = Math.max(0, s.emph - dt * 2.6)

      // The gesture playing now (if any), and how far through it we are.
      const g = gestureRef.current
      const gt = g ? now - g.at : 1e9
      const gk = g && gt < GESTURES[g.kind] ? g.kind : ''
      const gLen = gk ? GESTURES[gk] : 1
      // 0 -> 1 at the start, 1 -> 0 at the end
      const gEnv = gk ? Math.max(0, Math.min(1, gt / 300, (gLen - gt) / 400)) : 0

      // ---- Where everything should be right now ----
      let rot = still ? 0 : (Math.sin(t * 0.45) * 1.1 + Math.sin(t * 0.21 + 1.3) * 0.6) * rig.sway
      let tilt = 0
      let ty = -breath * 0.6
      let lean = 1
      let brow = 0
      let browR = 0
      let browRot = 0
      let smile = 1
      let cheek = 0.22
      let lidRest = 0

      if (st.speaking && !still) {
        rot += (Math.sin(t * 1.7) * 1.2 + s.emph * 1.4 * s.emphSide) * rig.sway
        ty -= s.emph * 1.6
        brow += s.emph * 2.2
      }
      if (st.asking) brow += 3.5
      if (st.listening) {
        tilt = rig.listenTilt
        lean = 1.015
        brow += 1.2
      }
      if (st.thinking) {
        tilt = -rig.listenTilt * 0.8
        browR += 3.5
        smile = 0.6
      }
      if (st.mood === 'happy') {
        smile = 1.35
        cheek = 0.42
        brow += 1
        lidRest = rig.happyLids ?? 0.14 // smiling eyes
      } else if (st.mood === 'concerned') {
        browRot = rig.browWorry
        smile = 0.35
        tilt += rig.listenTilt * 0.5
        brow += 0.8
      }

      // A little hop when pleased (Peccy).
      const sinceMood = now - s.moodAt
      const hop = st.mood === 'happy' && !still ? pulse(sinceMood / 320) + 0.6 * pulse((sinceMood - 360) / 300) : 0
      ty -= hop * rig.hop

      // Nods while you're answering.
      if (st.listening && !still && now > s.nextNod) {
        s.nodAt = now
        s.nextNod = now + rand(2400, 4600)
      }
      const nod = still ? 0 : pulse((now - s.nodAt) / 650)
      ty += nod * rig.nod
      rot += nod * 0.6
      // "Mm-hmm": a quick double nod.
      const nod2 = gk === 'nod' && !still ? pulse(gt / 380) + 0.7 * pulse((gt - 420) / 380) : 0
      ty += nod2 * rig.nod * 1.3
      rot += nod2 * 0.5

      // Eyes: quick little glances, mostly at you. Up and away while thinking.
      let gtx = 0
      let gty = 0
      if (st.thinking && !still) {
        gtx = -rig.gaze * 1.3
        gty = -rig.gaze * 1.1
      } else {
        if (now > s.nextGaze) {
          const r = rig.gaze
          const atYou = still || Math.random() < (st.speaking || st.listening ? 0.7 : 0.4)
          s.gtx = atYou ? 0 : rand(-r, r)
          s.gty = atYou ? 0 : rand(-r * 0.6, r * 0.5)
          s.nextGaze = now + rand(900, 3200)
        }
        gtx = s.gtx
        gty = s.gty
      }

      // Blinks: every few seconds, sometimes a double blink.
      if (now > s.nextBlink && now - s.blinkAt > 600) {
        s.blinkAt = now
        s.double = Math.random() < 0.18
        s.nextBlink = now + rand(2600, 6200)
      }
      const bt = now - s.blinkAt
      const blink = Math.max(pulse(bt / 140), s.double ? pulse((bt - 230) / 140) : 0)

      // ---- Smooth it all, so nothing snaps ----
      s.rot = ease(s.rot, rot, 5, dt)
      s.tilt = ease(s.tilt, tilt, 3.2, dt)
      s.ty = ease(s.ty, ty, 9, dt)
      s.lean = ease(s.lean, lean, 3, dt)
      s.gx = ease(s.gx, gtx, 28, dt)
      s.gy = ease(s.gy, gty, 28, dt)
      s.bL = ease(s.bL, brow, 10, dt)
      s.bR = ease(s.bR, brow + browR, 10, dt)
      s.bRot = ease(s.bRot, browRot, 6, dt)
      s.smile = ease(s.smile, smile, 6, dt)
      s.cheek = ease(s.cheek, cheek, 4, dt)
      s.lidRest = ease(s.lidRest, lidRest, 6, dt)

      // Mouth: opens and closes with the words.
      let goal = 0
      if (st.speaking) {
        const wobble = Math.abs(Math.sin(t * 9.1) * Math.sin(t * 4.7 + 1.3))
        goal = Math.min(1, 0.18 + 0.55 * wobble + 0.45 * kick.current)
      }
      const word = kick.current
      kick.current = Math.max(0, kick.current - dt * 5)
      s.open += (goal - s.open) * Math.min(1, dt * 20)
      const ry = s.open * rig.mouthMax

      // Squash and stretch (Peccy): breathing, a bounce on each word, the hop.
      const sq = rig.squash && !still ? breath * 0.006 + word * 0.012 * (st.speaking ? 1 : 0) + hop * 0.03 : 0

      // ---- Draw ----
      const [px, py] = rig.pivot
      const angle = s.rot + s.tilt
      if (p.head) {
        p.head.setAttribute('transform',
          `translate(${px} ${f(py + s.ty)}) rotate(${f(angle)}) scale(${f(s.lean * (1 - sq), 4)} ${f(s.lean * (1 + sq), 4)}) translate(${-px} ${-py})`)
      }
      if (p.body) {
        const [bx, by] = rig.bodyPivot
        const bodyAngle = rig.bodyFollows ? angle : s.rot * 0.2
        const bodyY = rig.bodyFollows ? s.ty : 0
        p.body.setAttribute('transform',
          `translate(${bx} ${f(by + bodyY)}) rotate(${f(bodyAngle)}) scale(1 ${f(1 + breath * 0.007, 4)}) translate(${-bx} ${-by})`)
      }
      if (p.eyes) p.eyes.setAttribute('transform', `translate(${f(s.gx)} ${f(s.gy)})`)
      const lid = `scaleY(${f(Math.max(blink, s.lidRest), 3)})`
      if (p.lidL) p.lidL.style.transform = lid
      if (p.lidR) p.lidR.style.transform = lid
      const [lx, ly] = rig.browL
      const [rx, rY] = rig.browR
      if (p.browL) p.browL.setAttribute('transform', `translate(0 ${f(-s.bL)}) rotate(${f(-s.bRot)} ${lx} ${ly})`)
      if (p.browR) p.browR.setAttribute('transform', `translate(0 ${f(-s.bR)}) rotate(${f(s.bRot)} ${rx} ${rY})`)
      if (p.mouth) p.mouth.setAttribute('ry', f(ry))
      if (p.smile) {
        const [sx, sy] = rig.smilePivot
        p.smile.setAttribute('transform', `translate(${sx} ${sy}) scale(1 ${f(s.smile, 3)}) translate(${-sx} ${-sy})`)
        p.smile.style.opacity = f(Math.max(0, 1 - ry / rig.smileFade), 3)
      }
      if (p.cheeks) p.cheeks.setAttribute('opacity', f(s.cheek, 3))

      // Peccy's arms
      if (p.armL || p.armR) {
        const swing = still ? 0 : Math.sin(t * 0.9) * 3
        let aL = swing
        let aR = -swing
        let rateR = 8
        let thumb = 0
        if (st.speaking && !still) {
          aL += s.emph * (s.emphSide > 0 ? 14 : 4)
          aR -= s.emph * (s.emphSide < 0 ? 14 : 4)
        }
        if (st.mood === 'happy') {
          aL += 18
          aR -= 18
        }
        // Thinking: arm up, tapping his side. "Hmm..."
        if (st.thinking && !still) aR = -48 + Math.sin(t * 6) * 6
        if (!still && gk) {
          if (gk === 'wave' || gk === 'bye') {
            aR = aR * (1 - gEnv) + (-115 + Math.sin((gt / 1000) * 11) * 18) * gEnv
            rateR = 16
          } else if (gk === 'thumbs') {
            aR = aR * (1 - gEnv) + (-100 + Math.sin((gt / 1000) * 7) * 4) * gEnv
            thumb = gEnv
            rateR = 12
          } else if (gk === 'offer') {
            aL = aL * (1 - gEnv) + 42 * gEnv
          }
        } else if (still && gk === 'thumbs') {
          thumb = gEnv
        }
        s.armL = ease(s.armL, aL, 8, dt)
        s.armR = ease(s.armR, aR, rateR, dt)
        s.thumb = ease(s.thumb, thumb, 12, dt)
        if (p.armL) p.armL.setAttribute('transform', `rotate(${f(s.armL)} ${rig.armL[0]} ${rig.armL[1]})`)
        if (p.armR) p.armR.setAttribute('transform', `rotate(${f(s.armR)} ${rig.armR[0]} ${rig.armR[1]})`)
        if (p.thumbR) p.thumbR.setAttribute('opacity', f(s.thumb, 3))
      }

      // Alex's hand: comes up into the picture to wave or give a thumbs-up.
      if (p.hand) {
        const handGesture = HAND_GESTURES.includes(gk)
        const target = handGesture && gt < gLen - 380 ? 1 : 0
        s.up = still ? gEnv * (handGesture ? 1 : 0) : ease(s.up, target, 9, dt)
        let hr = 0
        if (!still && (gk === 'wave' || gk === 'bye')) hr = Math.sin((gt / 1000) * 11) * 16
        else if (!still && gk === 'thumbs') hr = -6 + Math.sin((gt / 1000) * 7) * 3
        s.handRot = ease(s.handRot, hr, 14, dt)
        if (handGesture) {
          // Pick the hand shape while it's coming up.
          const thumbs = gk === 'thumbs'
          if (p.handOpen) p.handOpen.style.display = thumbs ? 'none' : ''
          if (p.handThumb) p.handThumb.style.display = thumbs ? '' : 'none'
        }
        const [hx, hy] = rig.hand
        const drop = still ? 0 : (1 - s.up) * 250
        p.hand.style.display = s.up < 0.01 ? 'none' : ''
        p.hand.setAttribute('opacity', still ? f(s.up, 3) : '1')
        p.hand.setAttribute('transform', `translate(${hx} ${f(hy + drop)}) rotate(${f(s.handRot)}) scale(${rig.handScale})`)
      }

      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [rig])

  return parts
}
