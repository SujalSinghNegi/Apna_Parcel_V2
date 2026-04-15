'use client'

import { motion, Variants, useMotionValue, useMotionTemplate } from 'framer-motion'
import { Zap, Shield, MapPin, Heart, Fingerprint, Star } from 'lucide-react'
import { MouseEvent } from 'react'

// --- Animation Variants ---
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 80, damping: 18 } },
}

const stagger: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
}

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    desc: 'Average delivery within 30 minutes from nearby local shops to your hostel.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    glow: 'rgba(245, 158, 11, 0.15)',
  },
  {
    icon: Shield,
    title: 'Trust System',
    desc: '4-level trust badges ensure reliable deliverers. Verified students only.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    glow: 'rgba(59, 130, 246, 0.15)',
  },
  {
    icon: MapPin,
    title: 'Live Tracking',
    desc: 'Watch your rider on a real-time map from shop pickup to your doorstep.',
    color: 'text-brand',
    bg: 'bg-brand/10 dark:bg-brand/20',
    glow: 'rgba(37, 99, 235, 0.15)', // Assuming brand is a blue shade
  },
  {
    icon: Heart,
    title: 'Community First',
    desc: 'Help your peers earn pocket money while getting your essentials delivered.',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    glow: 'rgba(244, 63, 94, 0.15)',
  },
  {
    icon: Fingerprint,
    title: 'OTP Verified',
    desc: 'Secure delivery confirmation with one-time password. No mix-ups ever.',
    color: 'text-mint',
    bg: 'bg-mint/10 dark:bg-mint/20',
    glow: 'rgba(16, 185, 129, 0.15)',
  },
  {
    icon: Star,
    title: 'Rate & Review',
    desc: 'Transparent rating system keeps the quality high for everyone on campus.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10 dark:bg-purple-500/20',
    glow: 'rgba(168, 85, 247, 0.15)',
  },
]

// --- Background Threads Component ---
const FeatureThreads = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40 dark:opacity-60">
      <svg className="absolute w-full h-full" viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="feat-thread-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0)" />
            <stop offset="50%" stopColor="rgba(59, 130, 246, 0.4)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
          </linearGradient>
          <linearGradient id="feat-thread-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0)" />
            <stop offset="50%" stopColor="rgba(16, 185, 129, 0.4)" />
            <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
          </linearGradient>
        </defs>

        {/* Winding Thread 1 */}
        <motion.path
          d="M -100,600 C 300,800 600,200 1000,400 C 1300,500 1500,100 1500,100"
          fill="none"
          stroke="url(#feat-thread-1)"
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 4, ease: "easeInOut" }}
          viewport={{ once: true }}
          style={{ filter: "drop-shadow(0 0 6px rgba(59,130,246,0.5))" }}
        />
        
        {/* Animated Dash Array on Thread 1 */}
        <motion.path
          d="M -100,600 C 300,800 600,200 1000,400 C 1300,500 1500,100 1500,100"
          fill="none"
          stroke="rgba(59, 130, 246, 0.8)"
          strokeWidth="3"
          strokeDasharray="1 20"
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: -200 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />

        {/* Winding Thread 2 */}
        <motion.path
          d="M 1500,600 C 1100,700 800,200 400,300 C 100,400 -100,200 -100,200"
          fill="none"
          stroke="url(#feat-thread-2)"
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 4, ease: "easeInOut", delay: 1 }}
          viewport={{ once: true }}
          style={{ filter: "drop-shadow(0 0 6px rgba(16,185,129,0.5))" }}
        />
      </svg>
    </div>
  )
}

// --- Interactive Card Component ---
const FeatureCard = ({ feat }: { feat: typeof features[0] }) => {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const { currentTarget, clientX, clientY } = e
    const { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  // Dynamic spotlight gradient matching the feature's specific color
  const background = useMotionTemplate`radial-gradient(300px circle at ${mouseX}px ${mouseY}px, ${feat.glow}, transparent 80%)`

  return (
    <motion.div variants={fadeUp} className="relative h-full">
      <div 
        onMouseMove={handleMouseMove}
        className="group relative h-full bg-white/70 dark:bg-slate-800/40 backdrop-blur-xl rounded-3xl p-8 border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-2xl hover:shadow-brand/5 dark:hover:shadow-black/40 transition-all duration-500 overflow-hidden"
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
            className={`w-14 h-14 ${feat.bg} rounded-2xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/20 dark:ring-white/10`}
          >
            <feat.icon className={`w-6 h-6 ${feat.color}`} />
          </motion.div>

          <h3 className="font-extrabold text-slate-900 dark:text-white text-xl mb-3">
            {feat.title}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            {feat.desc}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export const Features = () => {
  return (
    <section id="features" className="relative py-24 md:py-32 overflow-hidden bg-white dark:bg-slate-950">
      
      {/* Background Threads */}
      <FeatureThreads />

      {/* Ambient Orbs */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.03, 0.08, 0.03], x: [0, 30, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -right-40 top-20 w-[600px] h-[600px] bg-brand rounded-full blur-[120px] pointer-events-none"
      />
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.03, 0.08, 0.03], x: [0, -30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute -left-40 bottom-20 w-[500px] h-[500px] bg-mint rounded-full blur-[120px] pointer-events-none"
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 z-10">
        
        {/* Section Header */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-16 md:mb-24 relative"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 mb-6">
            <Star className="w-4 h-4 text-brand" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Premium Experience</span>
          </motion.div>

          <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            Why Students{' '}
            <span className="relative inline-block">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand via-brand-400 to-mint">
                Love
              </span>
              <motion.div 
                initial={{ width: 0 }} 
                whileInView={{ width: "100%" }} 
                transition={{ duration: 0.8, delay: 0.5, type: "spring" }}
                viewport={{ once: true }}
                className="absolute -bottom-2 right-0 h-2 bg-brand/20 dark:bg-brand/40 rounded-full -z-10"
              />
            </span>{' '}
            ApnaParcel
          </motion.h2>
          
          <motion.p variants={fadeUp} className="mt-6 text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto font-medium">
            Every feature is meticulously designed to make your campus life easier, safer, and faster.
          </motion.p>
        </motion.div>

        {/* Feature Grid */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feat, i) => (
            <FeatureCard key={i} feat={feat} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}