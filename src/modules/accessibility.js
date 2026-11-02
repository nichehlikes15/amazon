// Accessibility + theme preferences.
// Stored in localStorage and applied as data- attributes on <html> so
// global.css can react. The navbar menu and the Settings page both use
// this, and stay in sync through the 'launchpad-a11y' event.

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'launchpad-accessibility'
const EVENT = 'launchpad-a11y'

const defaults = {
  textSize: 'medium',
  colourBlind: false,
  reducedMotion: false,
  // null = follow the device's light/dark setting until the user picks one
  theme: null,
  // Stronger contrast for people with low vision
  highContrast: false,
}

export function loadSettings() {
  try {
    // Older saves may still have a "zoom" setting; it's no longer used.
    const { zoom, ...saved } = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} // eslint-disable-line no-unused-vars
    return { ...defaults, ...saved }
  } catch {
    return { ...defaults }
  }
}

function systemTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolvedTheme(settings) {
  return settings.theme === 'dark' || settings.theme === 'light' ? settings.theme : systemTheme()
}

export function applySettings(settings) {
  const root = document.documentElement
  root.setAttribute('data-text-size', settings.textSize)
  root.setAttribute('data-colour-blind', settings.colourBlind ? 'on' : 'off')
  root.setAttribute('data-reduced-motion', settings.reducedMotion ? 'on' : 'off')
  root.setAttribute('data-theme', resolvedTheme(settings))
  root.setAttribute('data-contrast', settings.highContrast ? 'high' : 'normal')
  root.removeAttribute('data-zoom')
}

// ---------- Smooth light / dark switching ----------
// The new theme spreads out in a circle from wherever the person clicked
// (the theme button, or a theme card in Settings). Browsers without view
// transitions, and anyone who has asked for less motion, get a soft fade.

let lastPoint = null
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', (e) => {
    lastPoint = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight, t: Date.now() }
  }, { capture: true, passive: true })
}

// Where the circle starts, as fractions of the window (so the 75% zoom doesn't matter).
function originPoint() {
  if (lastPoint && Date.now() - lastPoint.t < 1500) return lastPoint
  const el = document.activeElement
  if (el && el !== document.body && el.getBoundingClientRect) {
    const r = el.getBoundingClientRect()
    if (r.width) return { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight }
  }
  return { x: 1, y: 0 } // top right, where the theme button is
}

function motionAllowed(settings) {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  return !settings.reducedMotion && !reduce
}

// Colours fade between states instead of snapping.
function withFade(apply, ms = 520) {
  const root = document.documentElement
  root.style.setProperty('--theme-fade-ms', `${ms}ms`)
  root.classList.add('theme-fade')
  apply()
  window.clearTimeout(withFade._t)
  withFade._t = window.setTimeout(() => root.classList.remove('theme-fade'), ms + 60)
}

function spreadTheme(apply) {
  const root = document.documentElement
  const p = originPoint()
  root.style.setProperty('--vt-x', `${(Math.min(1, Math.max(0, p.x)) * 100).toFixed(2)}%`)
  root.style.setProperty('--vt-y', `${(Math.min(1, Math.max(0, p.y)) * 100).toFixed(2)}%`)
  root.classList.add('theme-vt')
  try {
    const vt = document.startViewTransition(apply)
    vt.finished.finally(() => root.classList.remove('theme-vt'))
  } catch {
    root.classList.remove('theme-vt')
    withFade(apply)
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  const root = document.documentElement
  const apply = () => applySettings(settings)
  const themeChanges = root.getAttribute('data-theme') !== resolvedTheme(settings)
  const moving = motionAllowed(settings)

  if (themeChanges && moving && typeof document.startViewTransition === 'function') {
    spreadTheme(apply)
  } else {
    // Other settings (contrast, colour-blind...) and older browsers: a gentle fade.
    withFade(apply, moving ? 520 : 160)
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: settings }))
}

// React hook: [settings, update]. `update({ textSize: 'large' })` saves and
// applies straight away, and every other component using the hook updates.
export function useAccessibility() {
  const [settings, setSettings] = useState(loadSettings)

  useEffect(() => {
    const onChange = (e) => setSettings(e.detail || loadSettings())
    window.addEventListener(EVENT, onChange)
    // Follow the device light/dark setting while the user hasn't chosen one.
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null
    const onSystem = () => {
      const s = loadSettings()
      if (!s.theme) withFade(() => applySettings(s))
    }
    mq?.addEventListener?.('change', onSystem)
    return () => {
      window.removeEventListener(EVENT, onChange)
      mq?.removeEventListener?.('change', onSystem)
    }
  }, [])

  const update = (patch) => {
    const next = { ...loadSettings(), ...patch }
    saveSettings(next)
    setSettings(next)
  }

  return [settings, update]
}

export { defaults }
