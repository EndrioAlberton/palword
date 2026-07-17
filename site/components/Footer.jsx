import AdminLogin from './AdminLogin'

export default function Footer() {
  return (
    <footer>
      PalDeck — projeto de fã, sem afiliação com a Pocketpair. Dados via{' '}
      <a href="https://github.com/mlg404/palworld-paldex-api" style={{ color: 'var(--sphere)' }}>
        palworld-paldex-api
      </a>.
      {' '}<AdminLogin />
    </footer>
  )
}
