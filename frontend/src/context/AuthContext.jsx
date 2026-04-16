import { createContext, useContext, useState, useCallback } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data))
    setUser(data)
    return data
  }, [])

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data))
    setUser(data)
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  // Fetches the latest user profile from the backend and updates localStorage.
  // Call this whenever role/status may have changed (e.g. after seller approval).
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/user/profile')
      // Preserve the existing token — profile endpoint doesn't return a new one
      const token = localStorage.getItem('token')
      const updated = { ...data, token }
      localStorage.setItem('user', JSON.stringify(updated))
      setUser(updated)
      return updated
    } catch {
      // If token expired, log out
      logout()
    }
  }, [logout])

  const isVerifiedSeller = user?.role === 'SELLER' && user?.sellerStatus === 'VERIFIED'
  const isAdmin          = user?.role === 'ADMIN'

  return (
    <AuthContext.Provider value={{
      user, login, register, logout, refreshUser,
      isVerifiedSeller, isAdmin
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
