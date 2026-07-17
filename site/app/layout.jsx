import './globals.css'
import Footer from '../components/Footer'
import { AuthProvider } from '../components/AuthProvider'

export const metadata = {
  title: 'PalDeck — Pals descobertos',
  description: 'Paldeck com os pals descobertos, stats e combinações de breeding de cada pal.',
  openGraph: {
    title: 'PalDeck — Pals descobertos',
    description: 'Paldeck com os pals descobertos, stats e combinações de breeding.',
    locale: 'pt_BR',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}` }} />
      </head>
      <body>
        <AuthProvider>
          {children}
          <Footer />
        </AuthProvider>
      </body>
    </html>
  )
}
