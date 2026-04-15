'use client'

import { motion, Variants, useInView, useMotionValue, useMotionTemplate, animate } from 'framer-motion'
import { useRef, useEffect, useState, MouseEvent } from 'react'
import { Package, Users, Star, Clock } from 'lucide-react'

// --- Animation Variants ---
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 80, damping: 18 } },
}

const stagger: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
}

// --- Smooth Physics Counter Hook ---
function useCounter(target: number, duration = 2.5, inView: boolean) {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    if (!inView) return
    // Framer Motion's animate provides silky smooth physics-based easing
    const controls = animate(0, target, {
      duration: duration,
      ease: "easeOut",
      onUpdate: (value) => setCount(value),
    })
    return () => controls.stop()
  }, [target, duration, inView])
  
  return count
}

// --- Stats Data ---
const stats = [
  { 
    icon: Package, 
    value: 2500, 
    suffix: '+', 
    label: 'Orders Delivered', 
    color: 'text-brand', 
    bg: 'bg-brand/10 dark:bg-brand/20',
    glow: 'rgba(255, 107, 53, 0.15)' // Brand color glow
  },
  { 
    icon: Users, 
    value: 500, 
    suffix: '+', 
    label: 'Active Students', 
    color: 'text-blue-500', 
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    glow: 'rgba(59, 130, 246, 0.15)' // Blue glow
  },
  { 
    icon: Star, 
    value: 4.9, 
    suffix: '', 
    label: 'Avg Rating', 
    color: 'text-amber-500', 
    bg: 'bg-amber-500/10 dark:bg-amber-500/20', 
    isDecimal: true,
    glow: 'rgba(245, 158, 11, 0.15)' // Amber glow
  },
  { 
    icon: Clock, 
    value: 28, 
    suffix: 'm', 
    label: 'Avg Delivery Time', 
    color: 'text-mint', 
    bg: 'bg-mint/10 dark:bg-mint/20',
    glow: 'rgba(16, 185, 129, 0.15)' // Mint glow
  },
]

// --- Background Data Stream ---
const StatsDataStream = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <svg className="absolute w-full h-full opacity-30 dark:opacity-40" viewBox="0 0 1440 600" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="stream-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(52, 211, 153, 0)" />
            <stop offset="50%" stopColor="rgba(52, 211, 153, 0.5)" />
            <stop offset="100%" stopColor="rgba(52, 211, 153, 0)" />
          </linearGradient>
          <linearGradient id="stream-gradient-2" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0)" />
            <stop offset="50%" stopColor="rgba(59, 130, 246, 0.5)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
          </linearGradient>
        </defs>

        {/* Data Line 1 */}
        <motion.path
          d="M -100,200 C 400,200 600,400 1500,400"
          fill="none"
          stroke="url(#stream-gradient)"
          strokeWidth="1.5"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 3, ease: "easeInOut" }}
          viewport={{ once: true }}
        />
        <motion.circle r="3" fill="#34d399"
          style={{ filter: "drop-shadow(0 0 6px #34d399)" }}
          animate={{ offsetDistance: ["0%", "100%"], opacity: [0, 1, 0] }}
          transition={{ duration: 4, ease: "linear", repeat: Infinity }}
          // @ts-ignore
          style={{ offsetPath: "path('M -100,200 C 400,200 600,400 1500,400')" }}
        />

        {/* Data Line 2 */}
        <motion.path
          d="M 1500,500 C 1000,500 800,100 -100,100"
          fill="none"
          stroke="url(#stream-gradient-2)"
          strokeWidth="1.5"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 3, ease: "easeInOut", delay: 0.5 }}
          viewport={{ once: true }}
        />
        <motion.circle r="3" fill="#3b82f6"
          style={{ filter: "drop-shadow(0 0 6px #3b82f6)" }}
          animate={{ offsetDistance: ["0%", "100%"], opacity: [0, 1, 0] }}
          transition={{ duration: 5, ease: "linear", repeat: Infinity, delay: 1 }}
          // @ts-ignore
          style={{ offsetPath: "path('M 1500,500 C 1000,500 800,100 -100,100')" }}
        />
      </svg>
    </div>
  )
}

// --- Interactive Stat Card Component ---
function StatCard({ stat, inView }: { stat: typeof stats[number]; inView: boolean }) {
  // Use our smooth framer motion counter
  const count = useCounter(stat.isDecimal ? 49 : stat.value, 2.5, inView)
  
  // Magnetic spotlight state
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const { currentTarget, clientX, clientY } = e
    const { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  const background = useMotionTemplate`radial-gradient(250px circle at ${mouseX}px ${mouseY}px, ${stat.glow}, transparent 80%)`

  return (
    <motion.div variants={fadeUp} className="relative h-full">
      <div 
        onMouseMove={handleMouseMove}
        className="group relative h-full bg-white/70 dark:bg-slate-800/40 backdrop-blur-xl rounded-3xl p-8 border border-slate-200/50 dark:border-slate-700/50 text-center hover:shadow-2xl hover:shadow-brand/5 dark:hover:shadow-black/40 transition-all duration-500 hover:-translate-y-1 overflow-hidden"
      >
        {/* Spotlight Overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0"
          style={{ background }}
        />

        <div className="relative z-10">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            className={`w-14 h-14 ${stat.bg} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-black/5 dark:ring-white/10`}
          >
            <stat.icon className={`w-7 h-7 ${stat.color}`} />
          </motion.div>

          {/* Number Display */}
          <div className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-2 tabular-nums tracking-tight flex items-center justify-center">
            {stat.isDecimal ? (count / 10).toFixed(1) : Math.floor(count).toLocaleString()}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-mint ml-1">
              {stat.suffix}
            </span>
          </div>

          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            {stat.label}
          </p>
        </div>
        
        {/* Bottom edge glow */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-500 transform scale-x-0 group-hover:scale-x-100 origin-center" style={{ color: stat.glow.replace(/,[^,]+$/, ')').replace('rgba', 'rgb') }} />
      </div>
    </motion.div>
  )
}

export const Stats = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="stats" className="relative py-24 md:py-32 overflow-hidden bg-slate-50/50 dark:bg-slate-950">
      {/* Background Data Stream */}
      <StatsDataStream />

      {/* Ambient Depth Elements */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />

      {/* Animated gradient ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full pointer-events-none opacity-50 dark:opacity-100"
        style={{ background: 'conic-gradient(from 0deg, transparent, rgba(255,107,53,0.03), transparent, rgba(52,211,153,0.03), transparent)' }}
      />
      
      {/* Pulsing center glow */}
      <motion.div
        animate={{ opacity: [0.02, 0.06, 0.02], scale: [0.9, 1.1, 0.9] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/10 dark:bg-brand/15 rounded-full blur-[100px] pointer-events-none mix-blend-multiply dark:mix-blend-screen"
      />

      <div ref={ref} className="relative max-w-6xl mx-auto px-4 sm:px-6 z-10">
        
        {/* Header */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-16 md:mb-20 relative"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-700/80 rounded-full px-4 py-2 mb-6 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
            </span>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Live Campus Data</span>
          </motion.div>

          <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
            Numbers That{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-mint">
              Speak
            </span>
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-5 text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto font-medium">
            Join the fastest growing peer-to-peer delivery network on campus.
          </motion.p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-8"
        >
          {stats.map((stat, i) => (
            <StatCard key={i} stat={stat} inView={isInView} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}