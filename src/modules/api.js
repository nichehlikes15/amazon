// Small helper for calling the Launchpad backend API.
// credentials: 'include' sends the session cookie so the server
// knows who is logged in.

const BASE = 'http://localhost:5000/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.')
  }
  return data
}

export const api = {
  signup: (fullName, email, password) =>
    request('/signup', { method: 'POST', body: JSON.stringify({ fullName, email, password }) }),
  login: (email, password) =>
    request('/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/logout', { method: 'POST' }),
  me: () => request('/me'),
  submitInterest: (payload) =>
    request('/interest', { method: 'POST', body: JSON.stringify(payload) }),
  listInterest: () => request('/interest'),
}
