// Auth context - keeps the logged-in user in one place so any
// component (navbar, profile, protected pages) can read it.

import { createContext, useContext, useEffect, useState } from 'react'
import { api } from './api'
import { getLocalRole, setLocalRole } from './role-store'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On first load, ask the backend whether a session already exists.
  useEffect(() => {
    api.me()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  // Student / teacher / parent: the account's own role always wins. If the
  // account has none yet, give it the one picked on this device.
  useEffect(() => {
    if (!user) return undefined
    if (user.role) {
      if (getLocalRole() !== user.role) setLocalRole(user.role)
      return undefined
    }
    const local = getLocalRole()
    if (!local) return undefined
    let live = true
    api.setRole(local, true)
      .then((data) => { if (live && data.user) setUser(data.user) })
      .catch(() => {})
    return () => { live = false }
  }, [user])

  const login = async (email, password) => {
    const data = await api.login(email, password)
    setUser(data.user)
    return data.user
  }

  const signup = async (fullName, email, password, consent, role) => {
    const data = await api.signup(fullName, email, password, consent, role)
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    await api.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
