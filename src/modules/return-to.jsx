import { Link, Navigate, useLocation } from 'react-router-dom'
import { titleFor } from './page-title'

/*
  Sending people back where they were after they sign in.

  Any link or redirect to the sign-in page adds where you were, e.g.
  /login?next=%2Flogbook. After signing in (or creating an account) you go
  back there instead of always landing on My profile.

  Only addresses on this site are allowed, so a link can't send someone to
  another website after they sign in.
*/

const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/reset-password']

function pathOnly(address) {
  return address.split(/[?#]/)[0]
}

// A safe place to go next: a path on this site that isn't a sign-in page.
export function safeNext(raw, fallback = '/profile') {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return fallback
  if (AUTH_PAGES.includes(pathOnly(raw))) return fallback
  return raw
}

function hereOf(location) {
  const loc = location || window.location
  return `${loc.pathname}${loc.search || ''}${loc.hash || ''}`
}

// The sign-in (or sign-up) address that brings you back to `location`.
// On a sign-in page already, it keeps the place you were heading to.
export function signInPath(location, page = '/login') {
  const loc = location || window.location
  if (AUTH_PAGES.includes(loc.pathname)) {
    const next = new URLSearchParams(loc.search).get('next')
    const safe = next ? safeNext(next, '') : ''
    return safe ? `${page}?next=${encodeURIComponent(safe)}` : page
  }
  return `${page}?next=${encodeURIComponent(hereOf(loc))}`
}

// <Link> to sign in (or sign up, with to="/signup") that comes back here afterwards.
export function SignInLink({ to = '/login', children, ...rest }) {
  const location = useLocation()
  return <Link to={signInPath(location, to)} {...rest}>{children}</Link>
}

// For pages you must be signed in to see.
export function SignInRedirect() {
  const location = useLocation()
  return <Navigate to={signInPath(location)} replace />
}

// On the sign-in and sign-up pages: where to go once signed in.
export function useNextPath(fallback = '/profile') {
  const { search } = useLocation()
  return safeNext(new URLSearchParams(search).get('next'), fallback)
}

// Friendly name of the page you'll go back to, e.g. "My logbook", or null.
export function nextPageName(next) {
  const path = pathOnly(next || '')
  if (!path || path === '/' || path === '/profile') return null
  const title = titleFor(path).replace(/ \| Launchpad$/, '')
  return title === 'Page not found' ? null : title
}
