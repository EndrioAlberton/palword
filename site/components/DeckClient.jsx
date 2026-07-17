'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import PalSphere, { CORES_TIPO } from './PalSphere'
import FilterDropdown from './FilterDropdown'

export default function DeckClient({ pals }) {
  const [busca, setBusca] = useState('')
  const [fTipos, setFTipos] = useState([])
  const [fTrabalhos, setFTrabalhos] = useState([])
  const [nivelMin, setNivelMin] = useState(1)
  const [mostrarOcultos, setMostrarOcultos] = useState(true)

  const tipos = useMemo(() =>
    [...new Set(pals.flatMap((p) => p.tipos || []))].sort(),
  [pals])

  const trabalhos = useMemo(() =>
    [...new Set(pals.flatMap((p) => (p.suitability || []).map((s) => s.type)))].sort(),
  [pals])

  const filtrosAtivos = fTipos.length > 0 || fTrabalhos.length > 0 || busca.trim().length > 0

  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase()
    // com algum filtro (busca/tipo/trabalho) ativo, não descobertos somem da grade —
    // sem filtro nenhum, aparecem como silhueta se mostrarOcultos estiver ligado
    return pals.filter((p) => {
      if (!p.descoberto) return mostrarOcultos && !filtrosAtivos
      return (
        (!fTipos.length || (p.tipos || []).some((t) => fTipos.includes(t))) &&
        (!fTrabalhos.length || (p.suitability || []).some((s) => fTrabalhos.includes(s.type) && s.level >= nivelMin)) &&
        (!b || p.nome.toLowerCase().includes(b) || p.key.toLowerCase().includes(b))
      )
    })
  }, [pals, busca, fTipos, fTrabalhos, nivelMin, mostrarOcultos, filtrosAtivos])

  return (
    <>
      <div className="filters">
        <Search size={18} color="var(--mut)" />
        <input
          type="text"
          placeholder="Buscar por nome ou número..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <FilterDropdown label="Tipo" options={tipos} selected={fTipos} onChange={setFTipos} colorMap={CORES_TIPO} />
        <FilterDropdown label="Trabalho" options={trabalhos} selected={fTrabalhos} onChange={setFTrabalhos} />

        <label className={`nivel-range${fTrabalhos.length ? '' : ' off'}`}>
          Nível mín. <b>{nivelMin}</b>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={nivelMin}
            disabled={!fTrabalhos.length}
            onChange={(e) => setNivelMin(Number(e.target.value))}
          />
        </label>

        <label className="check-nao-descobertos">
          <input
            type="checkbox"
            checked={mostrarOcultos}
            onChange={(e) => setMostrarOcultos(e.target.checked)}
          />
          Mostrar não descobertos
        </label>
      </div>

      <div className="deck">
        {lista.map((p) => <PalSphere key={p.key} pal={p} />)}
        {!lista.length && <div className="empty">Nenhum pal com esses filtros.</div>}
      </div>
    </>
  )
}
