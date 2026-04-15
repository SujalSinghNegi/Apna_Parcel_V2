'use client'

import { motion, Variants, useInView } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import { Package, Users, Star, Clock } from 'lucide-react'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 80, damping: 18 } },
}

const stagger: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
}

// Animated counter hook
function useCounter(target: number, duration = 2000, inView: boolean) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!inView) return
    let start = 0
    const increment = target / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration, inView])
  return count
}

const stats = [
  { icon: Package, value: 2500, suffix: '+', label: 'Orders Delivered', color: 'text-brand', bg: 'bg-brand/10 dark:bg-brand/20' },
  { icon: Users, value: 500, suffix: '+', label: 'Active Students', color: 'text-blue-500', bg: 'bg-blue-500/10 dark:bg-blue-500/20' },
  { icon: Star, value: 4.9, suffix: '', label: 'Avg Rating', color: 'text-amber-500', bg: 'bg-amber-500/10 dark:bg-amber-500/20', isDecimal: true },
  { icon: Clock, value: 28, suffix: 'min', label: 'Avg Delivery Time', color: 'text-mint', bg: 'bg-mint/10 dark:bg-mint/20' },
]

export const Stats = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="stats" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-slate-50/80 dark:bg-slate-900/50" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />

      {/* Animated gradient ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: 'conic-gradient(from 0deg, transparent, rgba(255,107,53,0.06), transparent, rgba(52,211,153,0.06), transparent)' }}
      />
      {/* Pulsing center glow */}
      <motion.div
        animate={{ opacity: [0.03, 0.08, 0.03], scale: [0.9, 1.05, 0.9] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand/10 dark:bg-brand/15 rounded-full blur-[100px] pointer-events-none"
      />

      <div ref={ref} className="relative max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-16"
        >
          <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
            Numbers That{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-mint">
              Speak
            </span>
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-5 text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Growing every day with the campus community
          </motion.p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {stats.map((stat, i) => (
            <StatCard key={i} stat={stat} inView={isInView} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function StatCard({ stat, inView }: { stat: typeof stats[number]; inView: boolean }) {
  const count = useCounter(stat.isDecimal ? 49 : stat.value, 2000, inView)

  return (
    <motion.div
      variants={fadeUp}
      className="group relative bg-white dark:bg-slate-800/60 backdrop-blur-sm rounded-3xl p-8 border border-slate-100 dark:border-slate-700/50 text-center hover:shadow-lg transition-all duration-500 hover:-translate-y-1"
    >
      <motion.div
        whileHover={{ scale: 1.1, rotate: 8 }}
        className={`w-14 h-14 ${stat.bg} rounded-2xl flex items-center justify-center mx-auto mb-5`}
      >
        <stat.icon className={`w-7 h-7 ${stat.color}`} />
      </motion.div>

      <div className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-2 tabular-nums">
        {stat.isDecimal ? (count / 10).toFixed(1) : count.toLocaleString()}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-mint ml-1">
          {stat.suffix}
        </span>
      </div>

      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {stat.label}
      </p>
    </motion.div>
  )
}
