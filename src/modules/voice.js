// Interviewer voice: picks the most natural-sounding voice the browser has,
// and speaks one sentence at a time with short, human-like pauses.
//
// Which voices exist depends on the browser and device:
//  - Microsoft Edge has very natural "Online (Natural)" voices built in.
//  - Chrome has "Google UK English" voices, which are also good.
//  - Safari / macOS uses the Mac's own voices. Better "Enhanced" and
//    "Premium" voices can be downloaded in System Settings.

import { useEffect, useState } from 'react'

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

// Novelty voices on macOS that should never be offered.
const NOVELTY = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|junior|ralph|fred|kathy|deranged|hysterical|princess|pipe organ)\b/i
// Older, more robotic-sounding voices: allowed, but ranked low.
const BASIC = /\b(eddy|flo|reed|rocko|sandy|shelley|grandma|grandpa|espeak)\b/i
// Mac voices that sound good in British English.
const GOOD_MAC = /\b(daniel|serena|kate|stephanie|jamie|martha|arthur|oliver)\b/i

function score(v) {
  const name = v.name || ''
  let s = 0
  if (/natural|neural/i.test(name)) s += 100
  if (/premium/i.test(name)) s += 80
  if (/enhanced/i.test(name)) s += 70
  if (/siri/i.test(name)) s += 65
  if (/google/i.test(name)) s += 60
  if (GOOD_MAC.test(name)) s += 15
  if (BASIC.test(name)) s -= 40
  if (v.lang === 'en-GB') s += 20
  else if ((v.lang || '').startsWith('en')) s += 10
  return s
}

// English voices only, best first.
export function rankedVoices() {
  if (!canSpeak) return []
  return window.speechSynthesis
    .getVoices()
    .filter((v) => (v.lang || '').toLowerCase().startsWith('en') && !NOVELTY.test(v.name))
    .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))
}

export function isNatural(v) {
  return Boolean(v) && score(v) >= 60
}

export function findVoice(uri) {
  const list = rankedVoices()
  return list.find((v) => v.voiceURI === uri) || list[0] || null
}

const ACCENTS = {
  'en-GB': 'British', 'en-US': 'American', 'en-AU': 'Australian', 'en-IE': 'Irish',
  'en-IN': 'Indian', 'en-ZA': 'South African', 'en-NZ': 'New Zealand', 'en-CA': 'Canadian',
  'en-SC': 'Scottish', 'en-GB-u-sd-gbsct': 'Scottish',
}

export function voiceLabel(v) {
  const name = v.name
    .replace(/^Microsoft\s+/i, '')
    .replace(/\s*Online\s*\(Natural\)/i, '')
    .replace(/\s*-\s*English.*$/i, '')
    .replace(/^Google\s+/i, 'Google ')
    .trim()
  const accent = ACCENTS[v.lang] || ACCENTS[(v.lang || '').slice(0, 5)] || ''
  return [name, accent, isNatural(v) ? 'Natural' : null].filter(Boolean).join(' · ')
}

// React hook: the ranked voice list, updated when the browser finishes loading voices.
export function useVoices() {
  const [voices, setVoices] = useState(() => rankedVoices())
  useEffect(() => {
    if (!canSpeak) return undefined
    const update = () => setVoices(rankedVoices())
    update()
    window.speechSynthesis.addEventListener?.('voiceschanged', update)
    // Some browsers load voices late without telling us.
    const t = setTimeout(update, 700)
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', update)
      clearTimeout(t)
    }
  }, [])
  return voices
}

// Split into sentences so each one can have its own pause and pace.
// (This also avoids a Chrome bug that cuts off long speech after ~15 seconds.)
export function sentences(text) {
  const clean = text.replace(/\s+-\s+/g, ', ').replace(/\s+/g, ' ').trim()
  const parts = clean.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || [clean]
  return parts.map((p) => p.trim()).filter(Boolean)
}

/*
  Speak text in a more natural way.
  Returns a function that stops the speech.
  Callbacks: onStart (first sound), onSentence (each sentence as it starts -
  used for the captions), onWord (each word, if the browser reports it - used
  for the mouth), onEnd (finished, or speech failed).
*/
export function speakNatural(text, { voice, onStart, onSentence, onWord, onEnd, volume = 1 } = {}) {
  if (!canSpeak) {
    onEnd?.()
    return () => {}
  }
  const synth = window.speechSynthesis
  synth.cancel()

  const parts = sentences(text)
  const natural = isNatural(voice)
  let i = 0
  let started = false
  let stopped = false
  let timer = null

  const next = () => {
    if (stopped) return
    if (i >= parts.length) {
      onEnd?.()
      return
    }
    const part = parts[i]
    i += 1
    onSentence?.(part, i - 1)
    const u = new SpeechSynthesisUtterance(part)
    if (voice) {
      u.voice = voice
      u.lang = voice.lang
    } else {
      u.lang = 'en-GB'
    }
    // Natural voices already sound human at normal speed. Older voices sound
    // less robotic a touch slower and lower, with a little variation.
    const wobble = (Math.random() - 0.5) * 0.04
    u.rate = natural ? 0.98 + wobble / 2 : 0.92 + wobble
    u.pitch = natural ? 1 : 0.97 + wobble
    u.volume = volume

    u.onstart = () => {
      if (!started) {
        started = true
        onStart?.()
      }
    }
    u.onboundary = (e) => {
      if (!e.name || e.name === 'word') onWord?.()
    }
    u.onend = () => {
      if (stopped) return
      // A short breath between sentences; a little longer after a question.
      const pause = /\?["')\]]*$/.test(part) ? 480 : /[.!]["')\]]*$/.test(part) ? 360 : 200
      timer = setTimeout(next, pause)
    }
    u.onerror = (e) => {
      if (stopped || e.error === 'interrupted' || e.error === 'canceled') return
      stopped = true
      onEnd?.()
    }
    synth.speak(u)
  }

  next()

  return () => {
    stopped = true
    clearTimeout(timer)
    synth.cancel()
  }
}

const STORE = 'launchpad-interview-voice'

export function savedVoiceURI() {
  try { return localStorage.getItem(STORE) || '' } catch { return '' }
}

export function saveVoiceURI(uri) {
  try { localStorage.setItem(STORE, uri) } catch { /* private mode */ }
}
