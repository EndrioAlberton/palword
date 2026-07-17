'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function FilterDropdown({ label, options, selected, onChange, colorMap }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function toggle(opt) {
    onChange(selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt])
  }

  return (
    <div className="fdrop" ref={ref}>
      <button
        type="button"
        className={`fdrop-btn${selected.length ? ' on' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        {label}{selected.length > 0 ? ` (${selected.length})` : ''}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="fdrop-panel">
          {options.map((opt) => (
            <label key={opt} className="fdrop-item">
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
              {colorMap && <span className="dot" style={{ background: colorMap[opt] || 'var(--t-neutral)' }} />}
              <span>{opt.replace(/_/g, ' ')}</span>
            </label>
          ))}
          {!options.length && <div className="fdrop-empty">Nenhuma opção</div>}
          {selected.length > 0 && (
            <button type="button" className="fdrop-clear" onClick={() => onChange([])}>Limpar</button>
          )}
        </div>
      )}
    </div>
  )
}
