export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const TOKEN_KEY = 'pd_token'
const USER_KEY = 'pd_user'

export function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getUsername() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(USER_KEY)
}

export async function login(username, password) {
  const res = await fetch(`${API_URL}/api/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || 'Usuário ou senha inválidos.')
  localStorage.setItem(TOKEN_KEY, data.token)
  localStorage.setItem(USER_KEY, data.username)
  return data
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export async function authFetch(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Token ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = typeof data.detail === 'string'
      ? data.detail
      : Object.values(data).flat().join(' ') || 'Erro ao salvar.'
    throw new Error(msg)
  }
  return data
}
