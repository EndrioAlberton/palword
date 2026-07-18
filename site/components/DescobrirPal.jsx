'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { authFetch } from '../lib/authClient'
import { useAuth } from './AuthProvider'

export default function DescobrirPal() {
  const { isLogado } = useAuth()
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const [msg, setMsg] = useState(null) // { ok: bool, texto: string }
  const [enviando, setEnviando] = useState(false)

  if (!isLogado) return null

  async function onSubmit(e) {
    e.preventDefault()
    const b = busca.trim()
    if (!b) return
    setEnviando(true)
    setMsg(null)
    try {
      const data = await authFetch('/api/pals/descobrir/', {
        method: 'POST',
        body: JSON.stringify({ busca: b }),
      })
      setMsg({
        ok: true,
        texto: data.ja_descoberto
          ? `#${data.key} ${data.nome} já estava descoberto.`
          : `#${data.key} ${data.nome} descoberto!`,
      })
      setBusca('')
      router.refresh()
    } catch (err) {
      setMsg({ ok: false, texto: err.message })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="descobrir" onSubmit={onSubmit}>
      <Sparkles size={16} color="var(--sphere)" />
      <input
        type="text"
        placeholder="Nº do pal (ex.: 1, 001 ou 085B)"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        disabled={enviando}
      />
      <button type="submit" disabled={enviando || !busca.trim()}>
        {enviando ? 'Marcando...' : 'Descobrir'}
      </button>
      {msg && <span className={msg.ok ? 'descobrir-ok' : 'descobrir-erro'}>{msg.texto}</span>}
    </form>
  )
}
