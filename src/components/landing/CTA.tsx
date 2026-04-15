'use client'

import { motion, Variants } from 'framer-motion'
import Link from 'next/link'
import { ShoppingBag, Bike, ArrowRight, Sparkles, TrendingUp } from 'lucide-react'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 80, damping: 18 } },
}

const stagger: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.2, delayChildren: 0.1 } },
}

export const CTA = () => {
  return (
    <section id="cta" className="relative py-24 md:py-32 overflow-hidden">
      {/* Animated mesh background */}
      <motion.div
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-brand/5 via-transparent to-mint/5 dark:from-brand/10 dark:to-mint/10 rounded-full blur-[80px] pointer-events-none"
      />
      <motion.div
        animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-purple-500/5 via-transparent to-blue-500/5 dark:from-purple-500/10 dark:to-blue-500/10 rounded-full blur-[80px] pointer-events-none"
      />
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] dark:opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-14"
        >
          <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
            Ready to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-mint">
              Start?
            </span>
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-5 text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Whether you need something delivered or want to earn — we&apos;ve got you
          </motion.p>
        </motion.div>

        {/* Dual Cards */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid md:grid-cols-2 gap-6"
        >
          {/* Orderer Card */}
          <motion.div variants={fadeUp}>
            <Link href="/auth" className="block group">
              <div className="relative bg-gradient-to-br from-brand via-brand-500 to-brand-700 rounded-3xl p-8 md:p-10 text-white overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-brand/20 hover:-translate-y-1">
                {/* Decorative circles */}
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full group-hover:scale-125 transition-transform duration-700" />
                <div className="absolute -right-5 -bottom-14 w-56 h-56 bg-white/5 rounded-full group-hover:scale-110 transition-transform duration-700" />

                <div className="relative">
                  <motion.div whileHover={{ rotate: 10 }} className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6">
                    <ShoppingBag className="w-7 h-7" />
                  </motion.div>

                  <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1 mb-4 text-xs font-bold">
                    <Sparkles className="w-3 h-3" /> Most Popular
                  </div>

                  <h3 className="text-2xl md:text-3xl font-extrabold mb-3">
                    Need Something?
                  </h3>
                  <p className="text-white/70 mb-8 leading-relaxed max-w-sm">
                    Place an order for anything from local shops. A fellow student will pick it up and deliver it right to your hostel.
                  </p>

                  <div className="inline-flex items-center gap-2 bg-white text-brand font-bold px-6 py-3 rounded-xl group-hover:gap-3 transition-all shadow-lg">
                    Place Your First Order
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Deliverer Card */}
          <motion.div variants={fadeUp}>
            <Link href="/auth" className="block group">
              <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 dark:from-white dark:via-slate-100 dark:to-slate-200 rounded-3xl p-8 md:p-10 text-white dark:text-slate-900 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-slate-900/20 dark:hover:shadow-white/10 hover:-translate-y-1">
                {/* Decorative */}
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 dark:bg-slate-900/5 rounded-full group-hover:scale-125 transition-transform duration-700" />
                <div className="absolute -right-5 -bottom-14 w-56 h-56 bg-white/[0.03] dark:bg-slate-900/[0.03] rounded-full group-hover:scale-110 transition-transform duration-700" />

                <div className="relative">
                  <motion.div whileHover={{ rotate: 10 }} className="w-14 h-14 bg-white/10 dark:bg-slate-900/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6">
                    <Bike className="w-7 h-7" />
                  </motion.div>

                  <div className="inline-flex items-center gap-1.5 bg-mint/20 text-mint dark:text-mint-600 rounded-full px-3 py-1 mb-4 text-xs font-bold">
                    <TrendingUp className="w-3 h-3" /> Earn Money
                  </div>

                  <h3 className="text-2xl md:text-3xl font-extrabold mb-3">
                    Heading to Town?
                  </h3>
                  <p className="text-white/60 dark:text-slate-500 mb-8 leading-relaxed max-w-sm">
                    Pick up orders along the way and earn delivery fees + tips. Turn your daily commute into pocket money.
                  </p>

                  <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold px-6 py-3 rounded-xl group-hover:gap-3 transition-all shadow-lg">
                    Start Earning Today
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
