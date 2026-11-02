// Who is using Launchpad on this device: student, teacher or parent.
// Kept in localStorage so it works before signing in. When someone signs in
// or creates an account, auth.jsx copies it to the account (but never
// replaces a role the account already has).

export const ROLE_IDS = ['student', 'teacher', 'parent']
const ROLE_KEY = 'launchpad-role'
export const ROLE_EVENT = 'launchpad-role'

export function getLocalRole() {
  try {
    const r = localStorage.getItem(ROLE_KEY)
    return ROLE_IDS.includes(r) ? r : null
  } catch {
    return null
  }
}

export function setLocalRole(role) {
  try {
    if (ROLE_IDS.includes(role)) localStorage.setItem(ROLE_KEY, role)
    else localStorage.removeItem(ROLE_KEY)
  } catch {
    // Private browsing can block storage; the choice still applies until the page reloads.
  }
  window.dispatchEvent(new CustomEvent(ROLE_EVENT, { detail: role }))
}
