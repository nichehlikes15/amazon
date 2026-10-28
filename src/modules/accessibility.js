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
  // 'compact' = the site shows at 75% on big screens; 'full' = normal 100% size
  zoom: 'compact',
}

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return { ...defaults, ...(saved || {}) }
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
  root.setAttribute('data-zoom', settings.zoom === 'full' ? 'full' : 'compact')
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  // Brief class so colours fade between light and dark instead of snapping.
  const root = document.documentElement
  root.classList.add('theme-fade')
  applySettings(settings)
  window.clearTimeout(saveSettings._t)
  saveSettings._t = window.setTimeout(() => root.classList.remove('theme-fade'), 450)
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
      if (!s.theme) applySettings(s)
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
