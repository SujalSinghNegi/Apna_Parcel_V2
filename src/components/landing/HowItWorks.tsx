'use client'

import { motion, Variants } from 'framer-motion'
import { ShoppingBag, Users, CheckCircle2, ArrowRight } from 'lucide-react'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 80, damping: 18 } },
}

const stagger: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.1 } },
}

const steps = [
  {
    step: '01',
    icon: ShoppingBag,
    title: 'Place Your Order',
    desc: 'Tell us what you need — snacks, stationery, medicines. Set your budget, pick a shop, and add a tip.',
    gradient: 'from-brand to-brand-600',
    bg: 'bg-brand/10 dark:bg-brand/20',
    ring: 'ring-brand/20',
    dot: 'bg-brand',
  },
  {
    step: '02',
    icon: Users,
    title: 'A Peer Picks It Up',
    desc: 'A fellow student headed to town sees your request, accepts it, and picks up your items from the shop.',
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    ring: 'ring-blue-500/20',
    dot: 'bg-blue-500',
  },
  {
    step: '03',
    icon: CheckCircle2,
    title: 'Delivered to You',
    desc: 'Track your rider in real-time on a live map. Verify delivery with OTP, pay securely, and rate.',
    gradient: 'from-mint to-emerald-600',
    bg: 'bg-mint/10 dark:bg-mint/20',
    ring: 'ring-mint/20',
    dot: 'bg-mint',
  },
]

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-slate-50/80 dark:bg-slate-900/50" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />

      {/* Floating animated orbs */}
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-20 left-1/4 w-[400px] h-[400px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"
      />
      <motion.div
        animate={{ x: [0, -25, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute -bottom-20 right-1/4 w-[350px] h-[350px] bg-mint/5 dark:bg-mint/10 rounded-full blur-[100px] pointer-events-none"
      />
      {/* Animated grid dots */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-16 md:mb-20"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-full px-4 py-2 mb-6 shadow-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Simple & Fast</span>
          </motion.div>

          <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
            How it{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-mint">
              Works
            </span>
          </motion.h2>

          <motion.p variants={fadeUp} className="mt-5 text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Three simple steps to get anything delivered from town to your hostel
          </motion.p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid md:grid-cols-3 gap-6 md:gap-8"
        >
          {steps.map((item, i) => (
            <motion.div key={i} variants={fadeUp} className="group relative">
              <div className="relative bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl p-8 border border-slate-100 dark:border-slate-700/60 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1.5 h-full">
                {/* Step Number */}
                <div className="flex items-center justify-between mb-8">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className={`w-14 h-14 ${item.bg} rounded-2xl flex items-center justify-center ring-4 ${item.ring} transition-all duration-300`}
                  >
                    <item.icon className="w-7 h-7 text-slate-700 dark:text-white" />
                  </motion.div>
                  <span className="text-6xl font-black text-slate-100 dark:text-slate-800 group-hover:text-slate-200 dark:group-hover:text-slate-700 transition-colors select-none">
                    {item.step}
                  </span>
                </div>

                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  {item.desc}
                </p>

                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-8 right-8 h-0.5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    transition={{ delay: 0.4 + i * 0.2, duration: 0.8 }}
                    viewport={{ once: true }}
                    className={`h-full bg-gradient-to-r ${item.gradient} origin-left`}
                  />
                </div>
              </div>

              {/* Connector arrow (hidden on last & mobile) */}
              {i < 2 && (
                <div className="hidden md:flex absolute top-1/2 -right-4 z-10 w-8 h-8 items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
