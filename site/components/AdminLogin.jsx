'use client'

import { useState } from 'react'
import { Lock, Unlock, X } from 'lucide-react'
import { useAuth } from './AuthProvider'

export default function AdminLogin() {
  const { username, ready, isLogado, login, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (!ready) return null

  async function onSubmit(e) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      await login(user, pass)
      setOpen(false)
      setUser('')
      setPass('')
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  if (isLogado) {
    return (
      <button type="button" className="admin-dot" title={`Logado como ${username} — clique para sair`} onClick={logout}>
        <Unlock size={12} />
      </button>
    )
  }

  return (
    <>
      <button type="button" className="admin-dot" title="Login de equipe" onClick={() => setOpen(true)}>
        <Lock size={12} />
      </button>
      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
            <div className="modal-head">
              <span>Login de equipe</span>
              <button type="button" className="modal-close" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>
            <input type="text" placeholder="Usuário" value={user} onChange={(e) => setUser(e.target.value)} autoFocus />
            <input type="password" placeholder="Senha" value={pass} onChange={(e) => setPass(e.target.value)} />
            {erro && <div className="modal-erro">{erro}</div>}
            <button type="submit" className="modal-submit" disabled={enviando}>{enviando ? 'Entrando...' : 'Entrar'}</button>
          </form>
        </div>
      )}
    </>
  )
}
