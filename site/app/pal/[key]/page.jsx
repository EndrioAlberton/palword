import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Swords, Egg, Hammer, Package, Sparkles } from 'lucide-react'
import { getPal } from '../../../lib/api'
import { CORES_TIPO } from '../../../components/PalSphere'
import AddBreedingButton from '../../../components/AddBreedingButton'
import { TIPOS_PT, TRABALHOS_PT, TAMANHOS_PT } from '../../../lib/traducoes'

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
  { chave: 'attack', rotulo: 'Ataque', max: 150 },
  { chave: 'defense', rotulo: 'Defesa', max: 150 },
  { chave: 'stamina', rotulo: 'Stamina', max: 150 },
]

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
          <div className="key">
            Paldeck Nº {pal.key}
            {pal.genus ? ` · ${legivel(pal.genus)}` : ''}
            {pal.tamanho ? ` · ${TAMANHOS_PT[pal.tamanho] || pal.tamanho}` : ''}
            {pal.noturno ? ' · Noturno' : ''}
          </div>
          <h1>{pal.nome}</h1>
          <div style={{ marginTop: 8 }}>
            {(pal.tipos || []).map((t) => (
              <span key={t} className="type-pill" style={{ '--tcolor': CORES_TIPO[t] || 'var(--t-neutral)' }}>{TIPOS_PT[t] || t}</span>
            ))}
          </div>
          {pal.descricao && <p className="desc">{pal.descricao}</p>}
          {(pal.preco_venda != null || pal.taxa_fome != null) && (
            <p className="desc" style={{ marginTop: 6 }}>
              {pal.preco_venda != null && <>Preço de venda: <b>{pal.preco_venda}</b>{pal.taxa_fome != null ? '  ·  ' : ''}</>}
              {pal.taxa_fome != null && <>Taxa de fome: <b>{pal.taxa_fome}</b></>}
            </p>
          )}
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
          const v = stats?.[chave]
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

      {(pal.passiva || pal.equipamento) && (
        <div className="section">
          <h2><Sparkles size={16} color="var(--sphere)" /> Habilidade de parceiro</h2>
          {pal.passiva && <p style={{ fontWeight: 700, marginBottom: 4 }}>{pal.passiva}</p>}
          {pal.passiva_descricao && <p style={{ color: 'var(--mut)', fontSize: 13, lineHeight: 1.5 }}>{pal.passiva_descricao}</p>}
          {pal.equipamento && <p style={{ color: 'var(--mut)', fontSize: 13, marginTop: 6 }}>Equipamento: <b>{pal.equipamento}</b></p>}
        </div>
      )}

      {!!pal.suitability?.length && (
        <div className="section">
          <h2><Hammer size={16} color="var(--sphere)" /> Trabalhos de base</h2>
          <div className="chips">
            {pal.suitability.map((s) => (
              <span key={s.type} className="chip">{TRABALHOS_PT[s.type] || legivel(s.type)} <b>Lv {s.level}</b></span>
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
