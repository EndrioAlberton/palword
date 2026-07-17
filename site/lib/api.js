const API_URL = process.env.API_URL || 'http://localhost:8000'

export async function getPals() {
  const res = await fetch(`${API_URL}/api/pals/`, { cache: 'no-store' })
  if (!res.ok) return []
  const data = await res.json()
  return data.results ?? data
}

export async function getPal(key) {
  const res = await fetch(`${API_URL}/api/pals/${key}/`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}
