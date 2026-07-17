'use client'
import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'day' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }

  return (
    <button onClick={toggle} className="theme-toggle" aria-label="Alternar tema" title={theme === 'dark' ? 'Tema dia' : 'Tema noite'}>
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
