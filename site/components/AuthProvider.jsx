'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import * as auth from '../lib/authClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [username, setUsername] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setUsername(auth.getUsername())
    setReady(true)
  }, [])

  async function doLogin(user, pass) {
    const data = await auth.login(user, pass)
    setUsername(data.username)
  }

  function doLogout() {
    auth.logout()
    setUsername(null)
  }

  return (
    <AuthContext.Provider value={{ username, ready, isLogado: !!username, login: doLogin, logout: doLogout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
