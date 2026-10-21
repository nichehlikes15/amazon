// Accessibility preferences helper.
// Stores the user's choices in localStorage and applies them as
// data- attributes on the <html> element so global.css can react.

const STORAGE_KEY = 'launchpad-accessibility'

const defaults = {
  textSize: 'medium',
  colourBlind: false,
  reducedMotion: false,
}

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return { ...defaults, ...(saved || {}) }
  } catch {
    return { ...defaults }
  }
}

export function applySettings(settings) {
  const root = document.documentElement
  root.setAttribute('data-text-size', settings.textSize)
  root.setAttribute('data-colour-blind', settings.colourBlind ? 'on' : 'off')
  root.setAttribute('data-reduced-motion', settings.reducedMotion ? 'on' : 'off')
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  applySettings(settings)
}

export { defaults }
