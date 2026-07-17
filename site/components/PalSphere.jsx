import Link from 'next/link'
import { TIPOS_PT } from '../lib/traducoes'

export const CORES_TIPO = {
  neutral: 'var(--t-neutral)',
  fire: 'var(--t-fire)',
  water: 'var(--t-water)',
  grass: 'var(--t-grass)',
  electric: 'var(--t-electric)',
  ice: 'var(--t-ice)',
  ground: 'var(--t-ground)',
  dark: 'var(--t-dark)',
  dragon: 'var(--t-dragon)',
}

export default function PalSphere({ pal }) {
  const conteudo = (
    <>
      <div className="pal-sphere">
        {pal.imagem_url && <img src={pal.imagem_url} alt={pal.descoberto ? pal.nome : 'Pal não descoberto'} loading="lazy" />}
        <span className="num">#{pal.key}</span>
      </div>
      <div className="nome">{pal.descoberto ? pal.nome : '???'}</div>
      <div className="tipos">
        {pal.descoberto && (pal.tipos || []).map((t) => (
          <span key={t} className="dot" style={{ background: CORES_TIPO[t] || 'var(--t-neutral)' }} title={TIPOS_PT[t] || t} />
        ))}
      </div>
    </>
  )

  if (!pal.descoberto) {
    return <div className="pal-card oculto">{conteudo}</div>
  }
  return (
    <Link href={`/pal/${pal.key}`} className="pal-card">
      {conteudo}
    </Link>
  )
}
