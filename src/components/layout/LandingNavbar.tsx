'use client'

import Link from 'next/link'
import { Package, ArrowRight, Sparkles, Sun, Moon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useThemeStore } from '@/store/theme'

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false)
  const { theme, toggleTheme } = useThemeStore()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navItems = [
    { href: '#how-it-works', label: 'How it Works' },
    { href: '#features', label: 'Features' },
    { href: '#stats', label: 'Stats' },
    { href: '#cta', label: 'Get Started' },
  ]

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pt-3 px-4 flex justify-center pointer-events-none">
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.1 }}
        className={cn(
          "w-full max-w-5xl pointer-events-auto backdrop-blur-2xl rounded-2xl px-4 py-2.5 flex items-center justify-between transition-all duration-500",
          scrolled
            ? "bg-white/80 dark:bg-slate-900/80 border border-gray-200/60 dark:border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            : "bg-transparent border border-transparent"
        )}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group pl-1">
          <motion.div
            whileHover={{ scale: 1.08, rotate: 8 }}
            whileTap={{ scale: 0.92 }}
            className="w-10 h-10 bg-gradient-to-tr from-brand via-brand-500 to-mint rounded-xl flex items-center justify-center shadow-lg shadow-brand/25"
          >
            <Package className="w-5 h-5 text-white" />
          </motion.div>
          <span className="font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">
            Apna<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-mint">Parcel</span>
          </span>
        </Link>

        {/* Center Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(item => (
            <a
              key={item.href}
              href={item.href}
              className="px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-all"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Theme Toggle & CTA Buttons */}
        <div className="flex items-center gap-2 pr-1">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
            aria-label="Toggle dark mode"
          >
            <AnimatePresence mode="wait">
              {theme === 'light' ? (
                <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Sun className="w-[18px] h-[18px]" />
                </motion.div>
              ) : (
                <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Moon className="w-[18px] h-[18px]" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
          <Link href="/auth">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="px-5 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-all hidden sm:block"
            >
              Log in
            </motion.button>
          </Link>
          <Link href="/auth">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="group flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white dark:to-slate-200 dark:text-slate-900 rounded-xl shadow-lg shadow-slate-900/15 dark:shadow-white/10 hover:shadow-xl transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Get Started
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </motion.button>
          </Link>
        </div>
      </motion.header>
    </div>
  )
}