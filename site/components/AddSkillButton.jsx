'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { authFetch } from '../lib/authClient'
import { useAuth } from './AuthProvider'
import { CORES_TIPO } from './PalSphere'

const VAZIO = { name: '', type: 'neutral', level: 1, power: 0, cooldown: 0, description: '' }

export default function AddSkillButton({ palKey }) {
  const { isLogado } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(VAZIO)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (!isLogado) return null

  function upd(campo, valor) { setForm((f) => ({ ...f, [campo]: valor })) }

  async function onSubmit(e) {
    e.preventDefault()
    setErro('')
    if (!form.name.trim()) { setErro('Nome é obrigatório.'); return }
    setEnviando(true)
    try {
      await authFetch(`/api/pals/${palKey}/skills/`, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          level: Number(form.level),
          power: Number(form.power),
          cooldown: Number(form.cooldown),
        }),
      })
      setOpen(false)
      setForm(VAZIO)
      router.refresh()
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <button type="button" className="add-btn" onClick={() => setOpen(true)} title="Adicionar ataque/skill">
        <Plus size={14} />
      </button>
      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
            <div className="modal-head">
              <span>Adicionar ataque</span>
              <button type="button" className="modal-close" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>
            <input type="text" placeholder="Nome (ex: fire_ball)" value={form.name} onChange={(e) => upd('name', e.target.value)} />
            <select value={form.type} onChange={(e) => upd('type', e.target.value)}>
              {Object.keys(CORES_TIPO).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="number" placeholder="Nível" min={1} max={99} value={form.level} onChange={(e) => upd('level', e.target.value)} />
            <input type="number" placeholder="Poder" min={0} value={form.power} onChange={(e) => upd('power', e.target.value)} />
            <input type="number" placeholder="Cooldown (s)" min={0} value={form.cooldown} onChange={(e) => upd('cooldown', e.target.value)} />
            <input type="text" placeholder="Descrição (opcional)" value={form.description} onChange={(e) => upd('description', e.target.value)} />
            {erro && <div className="modal-erro">{erro}</div>}
            <button type="submit" className="modal-submit" disabled={enviando}>{enviando ? 'Salvando...' : 'Adicionar'}</button>
          </form>
        </div>
      )}
    </>
  )
}
