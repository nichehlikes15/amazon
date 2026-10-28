import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Icon } from './icons'
import { canSpeak, findVoice, savedVoiceURI, speakNatural } from './voice'

/*
  Read this page aloud - for people with sight loss.
  Start it from the accessibility menu (or the Accessibility page). It reads the
  main part of the page one block at a time, highlights the bit being read and
  scrolls it into view. Uses the browser's own voice, like the interviewer.
*/

const EVENT = 'launchpad-read-aloud'
export const readAloudSupported = canSpeak

export function startReadAloud() {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: 'start' }))
}

export function stopReadAloud() {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: 'stop' }))
}

// What counts as readable text, and what to leave out (menus, buttons, hidden bits).
const BLOCKS = 'h1, h2, h3, h4, p, li, blockquote, dt, dd, figcaption, summary, th, td, legend'
const SKIP = 'nav, footer, button, select, textarea, [aria-hidden="true"], [hidden], .ra-player, .no-read'

function collectBlocks() {
  const root = document.getElementById('main-content') || document.body
  const blocks = []
  root.querySelectorAll(BLOCKS).forEach((el) => {
    if (el.closest(SKIP)) return
    // Read the outer block only (e.g. a list item, not the paragraph inside it).
    const outer = el.parentElement && el.parentElement.closest(BLOCKS)
    if (outer && root.contains(outer)) return
    // Skip things that aren't on screen (closed tabs, hidden panels).
    if (!el.getClientRects().length) return
    const details = el.closest('details')
    if (details && !details.open && el.tagName !== 'SUMMARY') return
    const text = (el.innerText || '').replace(/\s+/g, ' ').trim()
    if (text.length < 2) return
    blocks.push({ el, text })
  })
  return blocks
}

export function ReadAloudPlayer() {
  const { pathname } = useLocation()
  const [status, setStatus] = useState('idle') // idle | playing | paused
  const blocksRef = useRef([])
  const indexRef = useRef(0)
  const stopRef = useRef(null)
  const currentEl = useRef(null)

  const unhighlight = () => {
    currentEl.current?.classList.remove('is-reading-aloud')
    currentEl.current = null
  }

  const stop = () => {
    stopRef.current?.()
    stopRef.current = null
    if (canSpeak) window.speechSynthesis.cancel()
    unhighlight()
    setStatus('idle')
  }

  const readFrom = (i) => {
    const blocks = blocksRef.current
    unhighlight()
    if (i >= blocks.length) {
      stop()
      return
    }
    indexRef.current = i
    const { el, text } = blocks[i]
    el.classList.add('is-reading-aloud')
    currentEl.current = el
    const reduce = document.documentElement.getAttribute('data-reduced-motion') === 'on' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
    stopRef.current = speakNatural(text, {
      voice: findVoice(savedVoiceURI()),
      onEnd: () => readFrom(i + 1),
    })
  }

  const start = () => {
    if (!canSpeak) return
    stop()
    blocksRef.current = collectBlocks()
    if (!blocksRef.current.length) return
    setStatus('playing')
    readFrom(0)
  }

  const togglePause = () => {
    if (status === 'playing') {
      window.speechSynthesis.pause()
      setStatus('paused')
    } else if (status === 'paused') {
      window.speechSynthesis.resume()
      setStatus('playing')
    }
  }

  const skip = () => {
    stopRef.current?.()
    stopRef.current = null
    window.speechSynthesis.cancel()
    setStatus('playing')
    readFrom(indexRef.current + 1)
  }

  // Start / stop requests from the menu
  useEffect(() => {
    const onRequest = (e) => (e.detail === 'stop' ? stop() : start())
    window.addEventListener(EVENT, onRequest)
    return () => window.removeEventListener(EVENT, onRequest)
  }) // re-bind each render so the handlers see the latest state

  // A new page stops the reading
  useEffect(() => { stop() }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Escape stops it too
  useEffect(() => {
    if (status === 'idle') return undefined
    const onKey = (e) => { if (e.key === 'Escape') stop() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => stop(), []) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'idle') return null

  return (
    <div className={status === 'paused' ? 'ra-player is-paused' : 'ra-player'} role="region" aria-label="Read aloud controls">
      <span className="ra-label" aria-live="polite">
        <span className="ra-bars" aria-hidden="true"><span /><span /><span /></span>
        {status === 'paused' ? 'Paused' : 'Reading this page'}
      </span>
      <button type="button" className="ra-btn" onClick={togglePause}>
        <Icon name={status === 'paused' ? 'play' : 'pause'} size={14} />
        {status === 'paused' ? 'Resume' : 'Pause'}
      </button>
      <button type="button" className="ra-btn" onClick={skip}>
        <Icon name="arrowRight" size={14} /> Skip
      </button>
      <button type="button" className="ra-btn" onClick={stop}>
        <Icon name="close" size={14} /> Stop
      </button>
    </div>
  )
}
