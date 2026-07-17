'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { authFetch } from '../lib/authClient'
import { useAuth } from './AuthProvider'
import PalPicker from './PalPicker'

export default function AddBreedingButton({ palKey }) {
  const { isLogado } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pai, setPai] = useState('')
  const [mae, setMae] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (!isLogado) return null

  async function onSubmit(e) {
    e.preventDefault()
    setErro('')
    if (!pai || !mae) { setErro('Selecione pai e mãe.'); return }
    setEnviando(true)
    try {
      await authFetch(`/api/pals/${palKey}/breeding/`, {
        method: 'POST',
        body: JSON.stringify({ pai_key: pai, mae_key: mae }),
      })
      setOpen(false)
      setPai('')
      setMae('')
      router.refresh()
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <button type="button" className="add-btn" onClick={() => setOpen(true)} title="Adicionar combinação de breeding">
        <Plus size={14} />
      </button>
      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
            <div className="modal-head">
              <span>Adicionar breeding</span>
              <button type="button" className="modal-close" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>
            <PalPicker label="Pai" value={pai} onChange={setPai} excluirKey={palKey} />
            <PalPicker label="Mãe" value={mae} onChange={setMae} excluirKey={palKey} />
            {erro && <div className="modal-erro">{erro}</div>}
            <button type="submit" className="modal-submit" disabled={enviando}>{enviando ? 'Salvando...' : 'Adicionar'}</button>
          </form>
        </div>
      )}
    </>
  )
}
