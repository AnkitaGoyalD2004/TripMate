import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('tripmate_theme')
    if (saved === 'dark' || saved === 'light') return saved
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  })

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('tripmate_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`p-2 rounded-xl border border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 shadow-2xs flex items-center justify-center gap-1.5 ${className}`}
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle Dark/Light Mode"
    >
      {theme === 'dark' ? (
        <Sun size={17} className="text-amber-400 animate-spin-slow transition-transform" />
      ) : (
        <Moon size={17} className="text-slate-600 transition-transform" />
      )}
    </button>
  )
}
