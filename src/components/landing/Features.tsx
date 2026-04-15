'use client'

import { motion, Variants } from 'framer-motion'
import { Zap, Shield, MapPin, Heart, Fingerprint, Star } from 'lucide-react'

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
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    border: 'group-hover:border-amber-200 dark:group-hover:border-amber-500/30',
  },
  {
    icon: Shield,
    title: 'Trust System',
    desc: '4-level trust badges ensure reliable deliverers. Verified students only.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    border: 'group-hover:border-blue-200 dark:group-hover:border-blue-500/30',
  },
  {
    icon: MapPin,
    title: 'Live Tracking',
    desc: 'Watch your rider on a real-time map from shop pickup to your doorstep.',
    color: 'text-brand',
    bg: 'bg-brand/10 dark:bg-brand/15',
    border: 'group-hover:border-brand-200 dark:group-hover:border-brand/30',
  },
  {
    icon: Heart,
    title: 'Community First',
    desc: 'Help your peers earn pocket money while getting your essentials delivered.',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    border: 'group-hover:border-rose-200 dark:group-hover:border-rose-500/30',
  },
  {
    icon: Fingerprint,
    title: 'OTP Verified',
    desc: 'Secure delivery confirmation with one-time password. No mix-ups ever.',
    color: 'text-mint',
    bg: 'bg-mint/10 dark:bg-mint/15',
    border: 'group-hover:border-mint-200 dark:group-hover:border-mint/30',
  },
  {
    icon: Star,
    title: 'Rate & Review',
    desc: 'Transparent rating system keeps the quality high for everyone on campus.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10 dark:bg-purple-500/15',
    border: 'group-hover:border-purple-200 dark:group-hover:border-purple-500/30',
  },
]

export const Features = () => {
  return (
    <section id="features" className="relative py-24 md:py-32 overflow-hidden">
      {/* Ambient background */}
      {/* Animated ambient orbs */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.12, 0.05], x: [0, 20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -right-40 top-20 w-[500px] h-[500px] bg-brand/10 dark:bg-brand/20 rounded-full blur-[120px] pointer-events-none"
      />
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.05, 0.1, 0.05], x: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute -left-40 bottom-20 w-[400px] h-[400px] bg-mint/10 dark:bg-mint/20 rounded-full blur-[120px] pointer-events-none"
      />
      {/* Floating particles */}
      <motion.div
        animate={{ y: [0, -60, 0], opacity: [0, 0.15, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute top-1/3 left-1/3 w-2 h-2 bg-brand rounded-full pointer-events-none"
      />
      <motion.div
        animate={{ y: [0, -80, 0], opacity: [0, 0.12, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute top-2/3 right-1/3 w-1.5 h-1.5 bg-mint rounded-full pointer-events-none"
      />
      <motion.div
        animate={{ y: [0, -50, 0], opacity: [0, 0.1, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
        className="absolute bottom-1/4 left-1/2 w-2.5 h-2.5 bg-purple-500 rounded-full pointer-events-none"
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-16 md:mb-20"
        >
          <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
            Why Students{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand via-brand-400 to-mint">
              Love
            </span>{' '}
            ApnaParcel
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-5 text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Every feature designed with campus life in mind
          </motion.p>
        </motion.div>

        {/* Feature Grid */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((feat, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className={`group relative bg-white dark:bg-slate-800/60 backdrop-blur-sm rounded-3xl p-7 border border-slate-100 dark:border-slate-700/50 ${feat.border} hover:shadow-lg transition-all duration-500 hover:-translate-y-1`}
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 8 }}
                className={`w-12 h-12 ${feat.bg} rounded-2xl flex items-center justify-center mb-5`}
              >
                <feat.icon className={`w-6 h-6 ${feat.color}`} />
              </motion.div>

              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg mb-2">
                {feat.title}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                {feat.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
