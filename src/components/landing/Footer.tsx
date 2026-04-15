'use client'

import Link from 'next/link'
import { Package, Heart } from 'lucide-react'
import { motion } from 'framer-motion'

export const Footer = () => {
  return (
    <footer className="relative border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 py-12 overflow-hidden">
      {/* Subtle ambient glow */}
      <motion.div
        animate={{ opacity: [0.03, 0.06, 0.03] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-gradient-to-t from-brand/10 to-transparent dark:from-brand/15 rounded-full blur-[80px] pointer-events-none"
      />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-tr from-brand to-mint rounded-xl flex items-center justify-center shadow-md shadow-brand/20 group-hover:scale-105 transition-transform">
              <Package className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-extrabold text-lg text-slate-900 dark:text-white">
              Apna<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-mint">Parcel</span>
            </span>
          </Link>

          {/* Tagline */}
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
            Made with{' '}
            <Heart className="w-3.5 h-3.5 inline text-red-500 fill-red-500 mx-0.5" />{' '}
            by students, for students — Dwarahat, Uttarakhand
          </p>

          {/* Copyright */}
          <p className="text-xs text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} ApnaParcel
          </p>
        </div>
      </div>
    </footer>
  )
}
