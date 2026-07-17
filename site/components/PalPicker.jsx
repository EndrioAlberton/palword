'use client'

import { useEffect, useState } from 'react'
import { API_URL } from '../lib/authClient'

let cachePals = null

async function carregarDescobertos() {
  if (cachePals) return cachePals
  const res = await fetch(`${API_URL}/api/pals/?descoberto=true`)
  cachePals = res.ok ? await res.json() : []
  return cachePals
}

export default function PalPicker({ label, value, onChange, excluirKey }) {
  const [pals, setPals] = useState([])
  const [termo, setTermo] = useState('')
  const [aberto, setAberto] = useState(false)

  useEffect(() => { carregarDescobertos().then(setPals) }, [])

  const selecionado = pals.find((p) => p.key === value)
  const filtrados = pals
    .filter((p) => p.key !== excluirKey)
    .filter((p) => !termo || p.nome.toLowerCase().includes(termo.toLowerCase()) || p.key.includes(termo))
    .slice(0, 30)

  return (
    <div className="pal-picker">
      <label className="pal-picker-label">{label}</label>
      <button type="button" className="pal-picker-btn" onClick={() => setAberto((a) => !a)}>
        {selecionado ? `#${selecionado.key} ${selecionado.nome}` : 'Selecionar pal...'}
      </button>
      {aberto && (
        <div className="pal-picker-panel">
          <input
            type="text"
            placeholder="Buscar..."
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            autoFocus
          />
          <div className="pal-picker-list">
            {filtrados.map((p) => (
              <button
                type="button"
                key={p.key}
                className="pal-picker-item"
                onClick={() => { onChange(p.key); setAberto(false); setTermo('') }}
              >
                {p.imagem_url && <img src={p.imagem_url} alt="" />}
                #{p.key} {p.nome}
              </button>
            ))}
            {!filtrados.length && <div className="fdrop-empty">Nenhum pal descoberto encontrado</div>}
          </div>
        </div>
      )}
    </div>
  )
}
