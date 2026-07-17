import { getPals } from '../lib/api'
import DeckClient from '../components/DeckClient'
import ThemeToggle from '../components/ThemeToggle'

export const metadata = {
  title: 'PalDeck — Pals descobertos',
  description: 'Paldeck com os pals descobertos, tipos, stats e combinações de breeding de cada pal.',
}

export default async function Home() {
  const pals = await getPals()
  const descobertos = pals.filter((p) => p.descoberto).length

  return (
    <main className="wrap">
      <header>
        <div className="logo">
          <span className="sphere-icon" />
          <b>Pal<span className="x">Deck</span></b>
          <span className="badge-lab">pals descobertos</span>
        </div>
        <ThemeToggle />
      </header>

      <div className="progress-card">
        <div className="row">
          <span>Progresso do Paldeck</span>
          <strong>{descobertos} / {pals.length} descobertos</strong>
        </div>
        <div className="progress-bar">
          <div style={{ width: pals.length ? `${(descobertos / pals.length) * 100}%` : 0 }} />
        </div>
      </div>

      <DeckClient pals={pals} />
    </main>
  )
}
