import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Swords, Egg, Hammer, Package } from 'lucide-react'
import { getPal } from '../../../lib/api'
import { CORES_TIPO } from '../../../components/PalSphere'
import AddBreedingButton from '../../../components/AddBreedingButton'
import AddSkillButton from '../../../components/AddSkillButton'

export async function generateMetadata({ params }) {
  const pal = await getPal(params.key)
  if (!pal || !pal.descoberto) return { title: 'Pal não encontrado — PalDeck' }
  return {
    title: `${pal.nome} (#${pal.key}) — PalDeck`,
    description: `${pal.nome}: tipos, stats e combinações de breeding. ${(pal.descricao || '').slice(0, 140)}`,
  }
}

const STATS = [
  { chave: 'hp', rotulo: 'HP', max: 150 },
  { chave: 'melee', rotulo: 'Ataque corpo', max: 150 },
  { chave: 'ranged', rotulo: 'Ataque dist.', max: 150 },
  { chave: 'defense', rotulo: 'Defesa', max: 150 },
  { chave: 'stamina', rotulo: 'Stamina', max: 150 },
]

function valorStat(stats, chave) {
  if (chave === 'melee' || chave === 'ranged') return stats?.attack?.[chave]
  return stats?.[chave]
}

function legivel(s) {
  return (s || '').replaceAll('_', ' ')
}

export default async function PalPage({ params }) {
  const pal = await getPal(params.key)
  if (!pal || !pal.descoberto) notFound()

  const stats = pal.stats || {}

  return (
    <main className="wrap">
      <Link href="/" className="back"><ArrowLeft size={13} style={{ verticalAlign: '-2px' }} /> Voltar ao Paldeck</Link>

      <div className="pal-hero">
        <div className="pal-sphere">
          {pal.imagem_url && <img src={pal.imagem_url} alt={pal.nome} />}
          <span className="num">#{pal.key}</span>
        </div>
        <div>
          <div className="key">Paldeck Nº {pal.key}{pal.genus ? ` · ${legivel(pal.genus)}` : ''}</div>
          <h1>{pal.nome}</h1>
          <div style={{ marginTop: 8 }}>
            {(pal.tipos || []).map((t) => (
              <span key={t} className="type-pill" style={{ '--tcolor': CORES_TIPO[t] || 'var(--t-neutral)' }}>{t}</span>
            ))}
          </div>
          {pal.descricao && <p className="desc">{pal.descricao}</p>}
        </div>
      </div>

      <div className="section">
        <h2>
          <Egg size={16} color="var(--sphere)" /> Nasce a partir de (breeding)
          <AddBreedingButton palKey={pal.key} />
        </h2>
        {pal.nasce_de?.length ? pal.nasce_de.map((b) => (
          <div key={b.id} className="breed-row">
            <BreedPal pal={b.pai} />
            <span className="breed-op">+</span>
            <BreedPal pal={b.mae} />
            <span className="breed-op">=</span>
            <span className="breed-pal">
              {pal.imagem_url && <img src={pal.imagem_url} alt={pal.nome} />}
              {pal.nome}
            </span>
          </div>
        )) : (
          <p style={{ color: 'var(--mut)', fontSize: 13 }}>Nenhuma combinação de breeding registrada ainda.</p>
        )}
      </div>

      <div className="section">
        <h2><Swords size={16} color="var(--sphere)" /> Stats</h2>
        {STATS.map(({ chave, rotulo, max }) => {
          const v = valorStat(stats, chave)
          if (v == null) return null
          return (
            <div key={chave} className="stat-row">
              <span>{rotulo}</span>
              <div className="stat-bar"><div style={{ width: `${Math.min(100, (v / max) * 100)}%` }} /></div>
              <span className="val">{v}</span>
            </div>
          )
        })}
      </div>

      {!!pal.suitability?.length && (
        <div className="section">
          <h2><Hammer size={16} color="var(--sphere)" /> Trabalhos de base</h2>
          <div className="chips">
            {pal.suitability.map((s) => (
              <span key={s.type} className="chip">{legivel(s.type)} <b>Lv {s.level}</b></span>
            ))}
          </div>
        </div>
      )}

      {!!pal.drops?.length && (
        <div className="section">
          <h2><Package size={16} color="var(--sphere)" /> Drops</h2>
          <div className="chips">
            {pal.drops.map((d) => <span key={d} className="chip">{legivel(d)}</span>)}
          </div>
        </div>
      )}

      <div className="section">
        <h2>
          <Swords size={16} color="var(--sphere)" /> Skills
          <AddSkillButton palKey={pal.key} />
        </h2>
        {pal.skills?.length ? pal.skills.map((s) => (
          <div key={s.name} className="skill" style={{ '--tcolor': CORES_TIPO[s.type] || 'var(--t-neutral)' }}>
            <div className="top">
              <b>{legivel(s.name)}</b>
              <span>Lv {s.level} · poder {s.power} · cooldown {s.cooldown}s</span>
            </div>
            {s.description && <p>{s.description}</p>}
          </div>
        )) : (
          <p style={{ color: 'var(--mut)', fontSize: 13 }}>Nenhuma skill registrada ainda.</p>
        )}
      </div>
    </main>
  )
}

function BreedPal({ pal }) {
  const conteudo = (
    <>
      {pal.imagem_url && <img src={pal.imagem_url} alt={pal.nome} />}
      {pal.nome}
    </>
  )
  if (pal.descoberto) {
    return <Link href={`/pal/${pal.key}`} className="breed-pal">{conteudo}</Link>
  }
  return <span className="breed-pal">{conteudo}</span>
}
