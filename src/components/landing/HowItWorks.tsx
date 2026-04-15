'use client'

import { motion, Variants, useMotionValue, useSpring, useTransform, useMotionTemplate } from 'framer-motion'
import { ShoppingBag, Users, CheckCircle2 } from 'lucide-react'
import { MouseEvent, useRef } from 'react'

// --- Animation Variants ---
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
    textColor: 'text-brand',
  },
  {
    step: '02',
    icon: Users,
    title: 'A Peer Picks It Up',
    desc: 'A fellow student headed to town sees your request, accepts it, and picks up your items from the shop.',
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    ring: 'ring-blue-500/20',
    textColor: 'text-blue-500',
  },
  {
    step: '03',
    icon: CheckCircle2,
    title: 'Delivered to You',
    desc: 'Track your rider in real-time on a live map. Verify delivery with OTP, pay securely, and rate.',
    gradient: 'from-mint to-emerald-600',
    bg: 'bg-mint/10 dark:bg-mint/20',
    ring: 'ring-mint/20',
    textColor: 'text-mint',
  },
]

// --- 3D Physics Card Component ---
const StepCard = ({ item, i }: { item: any; i: number }) => {
  const ref = useRef<HTMLDivElement>(null)
  
  // Mouse position values
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Spring physics for smooth return
  const springConfig = { damping: 20, stiffness: 300, mass: 0.5 }
  const springX = useSpring(mouseX, springConfig)
  const springY = useSpring(mouseY, springConfig)

  // Transform mouse position to rotation degrees (subtle tilt)
  const rotateX = useTransform(springY, [-0.5, 0.5], ["5deg", "-5deg"])
  const rotateY = useTransform(springX, [-0.5, 0.5], ["-5deg", "5deg"])

  // Glare effect template
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${(mouseX.get() + 0.5) * 100}% ${(mouseY.get() + 0.5) * 100}%, rgba(255,255,255,0.1) 0%, transparent 60%)`
  const glareBackgroundDark = useMotionTemplate`radial-gradient(circle at ${(mouseX.get() + 0.5) * 100}% ${(mouseY.get() + 0.5) * 100}%, rgba(255,255,255,0.05) 0%, transparent 60%)`

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const xPct = (e.clientX - rect.left) / rect.width - 0.5
    const yPct = (e.clientY - rect.top) / rect.height - 0.5
    mouseX.set(xPct)
    mouseY.set(yPct)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <motion.div variants={fadeUp} className="group relative z-10" style={{ perspective: 1000 }}>
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY }}
        className="relative bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[2rem] p-8 border border-white/40 dark:border-slate-700/50 shadow-xl shadow-slate-200/20 dark:shadow-black/20 h-full transform-gpu"
      >
        {/* Hover Glare Effect */}
        <motion.div 
          className="absolute inset-0 rounded-[2rem] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 dark:hidden"
          style={{ background: glareBackground }}
        />
        <motion.div 
          className="absolute inset-0 rounded-[2rem] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 hidden dark:block"
          style={{ background: glareBackgroundDark }}
        />

        {/* Step Number Background Watermark */}
        <div className="absolute right-4 top-4 text-8xl font-black text-slate-50 dark:text-slate-800/50 select-none pointer-events-none transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-2 group-hover:translate-x-2">
          {item.step}
        </div>

        <div className="relative z-10">
          <div className="flex items-center mb-8">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className={`w-14 h-14 ${item.bg} rounded-2xl flex items-center justify-center ring-4 ${item.ring} transition-all duration-300 shadow-inner`}
            >
              <item.icon className={`w-7 h-7 ${item.textColor}`} />
            </motion.div>
          </div>

          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-3">
            {item.title}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            {item.desc}
          </p>
        </div>

        {/* Bottom accent line fills on hover */}
        <div className="absolute bottom-0 left-8 right-8 h-1 rounded-t-full overflow-hidden opacity-50 group-hover:opacity-100 transition-opacity">
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            transition={{ delay: 0.4 + i * 0.2, duration: 0.8 }}
            viewport={{ once: true }}
            className={`absolute inset-0 bg-gradient-to-r ${item.gradient} origin-left`}
          />
          {/* Animated highlight on hover */}
          <div className="absolute inset-0 bg-white/50 dark:bg-white/20 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
        </div>
      </motion.div>

      {/* Animated SVG Connector (Hidden on mobile, hidden on last item) */}
      {i < 2 && (
        <div className="hidden md:block absolute top-1/2 -right-[1.8rem] z-0 w-8 h-8 pointer-events-none -translate-y-1/2">
          <svg width="40" height="20" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <motion.path 
              d="M0 10L38 10M38 10L30 2M38 10L30 18" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="text-slate-300 dark:text-slate-600"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 + i * 0.3 }}
              viewport={{ once: true }}
            />
            {/* Moving glowing dot on the path */}
            <motion.circle 
              r="2" 
              fill="currentColor"
              className="text-brand dark:text-brand-400"
              initial={{ x: 0, opacity: 0 }}
              animate={{ x: 38, opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1, ease: "linear" }}
              cy="10"
            />
          </svg>
        </div>
      )}
    </motion.div>
  )
}

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="relative py-24 md:py-32 overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* --- Rich Background Layer --- */}
      {/* 1. Base Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-100/50 to-transparent dark:via-slate-900/50 pointer-events-none" />
      
      {/* 2. Radial masked grid pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.04] dark:opacity-[0.08]" 
        style={{ 
          backgroundImage: 'radial-gradient(circle, currentColor 1.5px, transparent 1.5px)', 
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)'
        }} 
      />

      {/* 3. Floating Physics Orbs */}
      <motion.div
        animate={{ x: [-20, 40, -20], y: [-20, 30, -20], scale: [1, 1.2, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-brand/5 dark:bg-brand/10 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen"
      />
      <motion.div
        animate={{ x: [20, -40, 20], y: [20, -30, 20], scale: [1.1, 0.9, 1.1] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-mint/5 dark:bg-mint/10 rounded-full blur-[100px] pointer-events-none mix-blend-multiply dark:mix-blend-screen"
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
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 mb-6 shadow-sm shadow-slate-200/50 dark:shadow-black/20">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Simple & Fast</span>
          </motion.div>

          <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            How it{' '}
            <span className="relative inline-block">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-mint">
                Works
              </span>
              <motion.div 
                initial={{ width: 0 }} 
                whileInView={{ width: "100%" }} 
                transition={{ duration: 0.8, delay: 0.5, type: "spring" }}
                viewport={{ once: true }}
                className="absolute -bottom-2 left-0 h-2 bg-brand/20 dark:bg-brand/40 rounded-full -z-10"
              />
            </span>
          </motion.h2>

          <motion.p variants={fadeUp} className="mt-6 text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto font-medium">
            Three simple steps to get anything delivered from town to your hostel without breaking a sweat.
          </motion.p>
        </motion.div>

        {/* Steps Grid */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid md:grid-cols-3 gap-6 md:gap-10 relative"
        >
          {steps.map((item, i) => (
            <StepCard key={i} item={item} i={i} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}