'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from './supabase'

type SessionContextType = {
  user: User | null
  setUser: (user: User | null) => void
  logout: () => void
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
})

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('campus_user')
    if (stored) setUserState(JSON.parse(stored))
  }, [])

  const setUser = (u: User | null) => {
    setUserState(u)
    if (u) sessionStorage.setItem('campus_user', JSON.stringify(u))
    else sessionStorage.removeItem('campus_user')
  }

  const logout = () => setUser(null)

  return (
    <SessionContext.Provider value={{ user, setUser, logout }}>
      {children}
    </SessionContext.Provider>
  )
}

export const useSession = () => useContext(SessionContext)
