import { useEffect, useState } from 'react'
import { api } from './api'
import { useAuth } from './auth'
import { Icon } from './icons'
import { ROLE_EVENT, getLocalRole, setLocalRole } from './role-store'

/*
  Student, teacher or parent.

  The role changes which links people see: a link someone doesn't need is
  taken out of the navbar, and shown greyed and crossed out in the footer
  with a note on hover. Every page can still be opened.
*/

export const ROLES = [
  { id: 'student', label: 'Student', plural: 'students', icon: 'user', hint: 'At school or college, thinking about T Levels' },
  { id: 'teacher', label: 'Teacher', plural: 'teachers', icon: 'building', hint: 'Teacher, careers adviser or school staff' },
  { id: 'parent', label: 'Parent or carer', plural: 'parents and carers', icon: 'heart', hint: 'Helping a young person decide' },
]

export function roleInfo(id) {
  return ROLES.find((r) => r.id === id) || null
}

// Pages a role doesn't usually need. Change this list to change what's hidden.
const NOT_NEEDED = {
  '/logbook': { roles: ['teacher', 'parent'], why: 'The placement logbook is for students on a placement.' },
  '/interview': { roles: ['teacher', 'parent'], why: 'Interview practice is for students.' },
  '/quiz': { roles: ['teacher', 'parent'], why: 'The career quiz is for students choosing a pathway.' },
  '/alumni/coffee-chats': { roles: ['teacher', 'parent'], why: 'Coffee chats are for students.' },
  '/parents': { roles: ['student'], why: 'This page is written for parents and carers.' },
}

// Why this role doesn't need the page, or null if they do.
export function notNeeded(path, role) {
  const rule = NOT_NEEDED[path]
  if (!role || !rule || !rule.roles.includes(role)) return null
  return `${rule.why} You can still open it.`
}

// [role, setRole]. A signed-in account's role comes first, then this device's choice.
export function useRole() {
  const { user, setUser } = useAuth()
  const [local, setLocal] = useState(getLocalRole)

  useEffect(() => {
    const sync = () => setLocal(getLocalRole())
    window.addEventListener(ROLE_EVENT, sync)
    window.addEventListener('storage', sync) // other tabs
    return () => {
      window.removeEventListener(ROLE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const role = user?.role || local || null

  const setRole = async (next) => {
    setLocalRole(next)
    if (user) {
      try {
        const data = await api.setRole(next)
        setUser(data.user)
      } catch {
        // Still saved on this device.
      }
    }
  }

  return [role, setRole]
}

// "I am a..." choice: three options as radio buttons.
export function RoleChoice({ value, onChange, compact = false, name = 'role', label = 'I am a…' }) {
  return (
    <fieldset className={compact ? 'role-choice is-compact' : 'role-choice'}>
      <legend className="visually-hidden">{label}</legend>
      {ROLES.map((r, i) => (
        <label key={r.id} className={value === r.id ? 'role-option is-on' : 'role-option'} style={{ '--i': i }}>
          <input type="radio" name={name} value={r.id} checked={value === r.id} onChange={() => onChange(r.id)} />
          <span className="role-option-icon" aria-hidden="true"><Icon name={r.icon} size={compact ? 16 : 20} /></span>
          <span className="role-option-text">
            <strong>{r.label}</strong>
            <span className="role-option-hint">{r.hint}</span>
          </span>
          <span className="role-option-tick" aria-hidden="true"><Icon name="check" size={12} /></span>
        </label>
      ))}
    </fieldset>
  )
}
