import { useEffect, useState } from 'react'

/*
  Secret "scripted replies" for interview practice (handy for a demo).

  When it's on, the interviewer says the lines written in the hidden panel
  instead of the AI's (or the rules') replies:
  - followUp: the follow-up question after the first answer
  - feedback: what the interviewer says after the answer
  - summary:  the short summary at the end
  Any box left empty uses the normal AI / rule-based reply. Scores always come
  from the normal scoring rules.

  Open the panel on the interview page by typing the word "script" (not in a
  text box), or by clicking the small "Interview practice" label 5 times.
  Only saved in this browser (localStorage) - nothing goes to the server.

  How to tell it's on (only you know to look):
  - the small "Interview practice" label ends with a full stop
  - in the call, the red "live" dot is a ring instead of a solid dot
*/

const KEY = 'launchpad-iv-script'
const EVENT = 'launchpad-iv-script'
const EMPTY = { on: false, items: {}, summary: '' }

export function loadScript() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!s || typeof s !== 'object') return { ...EMPTY }
    return {
      on: Boolean(s.on),
      items: s.items && typeof s.items === 'object' ? s.items : {},
      summary: typeof s.summary === 'string' ? s.summary : '',
    }
  } catch {
    return { ...EMPTY }
  }
}

export function saveScript(next) {
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private mode */ }
  window.dispatchEvent(new Event(EVENT))
}

export function clearScript() {
  saveScript({ ...EMPTY })
}

const clean = (text) => (typeof text === 'string' ? text.trim() : '')

// The scripted line for a question ('followUp' or 'feedback'), or '' to use the normal reply.
export function scriptedLine(qid, kind) {
  const s = loadScript()
  if (!s.on) return ''
  return clean(s.items[qid]?.[kind])
}

export function scriptedSummary() {
  const s = loadScript()
  return s.on ? clean(s.summary) : ''
}

// How many boxes have something in them.
export function filledCount(s) {
  let n = clean(s.summary) ? 1 : 0
  Object.values(s.items).forEach((item) => {
    if (clean(item?.followUp)) n += 1
    if (clean(item?.feedback)) n += 1
  })
  return n
}

// The current script, kept up to date when it changes (here or in another tab).
export function useScript() {
  const [script, setScript] = useState(loadScript)
  useEffect(() => {
    const update = () => setScript(loadScript())
    window.addEventListener(EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [])
  return script
}

// Calls onFound when the secret word is typed on the page (not inside a text box).
export function useSecretWord(word, onFound) {
  useEffect(() => {
    let typed = ''
    const onKey = (e) => {
      const el = e.target
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName))) return
      if (e.key.length !== 1) return
      typed = (typed + e.key.toLowerCase()).slice(-word.length)
      if (typed === word) {
        typed = ''
        onFound()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [word, onFound])
}
