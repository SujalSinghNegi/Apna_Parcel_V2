"use client";

import { motion, Variants } from "framer-motion";
import Link from "next/link";
import { 
  ShoppingBag, 
  Bike, 
  ArrowRight, 
  Sparkles, 
  Package, 
  MapPin, 
  Star 
} from "lucide-react";

// --- Animation Variants ---
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40, filter: "blur(10px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 80, damping: 20 } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
};

// Background Threads Component
const AnimatedThreads = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <svg className="absolute w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="thread-gradient-1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(56, 189, 248, 0)" />
            <stop offset="50%" stopColor="rgba(59, 130, 246, 0.5)" />
            <stop offset="100%" stopColor="rgba(37, 99, 235, 0)" />
          </linearGradient>
          <linearGradient id="thread-gradient-2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0)" />
            <stop offset="50%" stopColor="rgba(52, 211, 153, 0.5)" />
            <stop offset="100%" stopColor="rgba(5, 150, 105, 0)" />
          </linearGradient>
        </defs>

        {/* Thread 1: Swooping from top left to bottom right */}
        <motion.path
          d="M -100,200 C 300,100 400,600 900,400 C 1100,300 1300,500 1300,500"
          fill="none"
          stroke="url(#thread-gradient-1)"
          strokeWidth="3"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, repeatType: "loop", repeatDelay: 1 }}
          style={{ filter: "drop-shadow(0 0 8px rgba(59,130,246,0.8))" }}
        />

        {/* Thread 2: Crossing upwards */}
        <motion.path
          d="M -100,600 C 200,700 500,200 800,300 C 1100,400 1300,100 1300,100"
          fill="none"
          stroke="url(#thread-gradient-2)"
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 4, ease: "easeInOut", repeat: Infinity, repeatType: "loop", delay: 1.5 }}
          style={{ filter: "drop-shadow(0 0 8px rgba(52,211,153,0.8))" }}
        />
        
        {/* Animated Rider Dot on Thread 1 */}
        <motion.circle
          r="4"
          fill="#3b82f6"
          style={{ filter: "drop-shadow(0 0 10px #3b82f6)" }}
          animate={{
            offsetDistance: ["0%", "100%"]
          }}
          transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 }}
          // @ts-ignore
          style={{ offsetPath: "path('M -100,200 C 300,100 400,600 900,400 C 1100,300 1300,500 1300,500')" }}
        />
      </svg>
      
      {/* Ambient glowing orbs */}
      <motion.div 
        animate={{ y: [0, -30, 0], x: [0, 15, 0], opacity: [0.3, 0.6, 0.3] }} 
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand/10 dark:bg-brand/25 rounded-full blur-[100px]" 
      />
      <motion.div 
        animate={{ y: [0, 40, 0], x: [0, -20, 0], opacity: [0.2, 0.5, 0.2] }} 
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-mint/10 dark:bg-mint/25 rounded-full blur-[100px]" 
      />
      {/* Extra dark-mode accent glow */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0, 0.15, 0] }} 
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[120px]" 
      />
      {/* Floating particles */}
      <motion.div animate={{ y: [0, -70, 0], opacity: [0, 0.2, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute top-1/3 left-[15%] w-1.5 h-1.5 bg-brand rounded-full" />
      <motion.div animate={{ y: [0, -90, 0], opacity: [0, 0.15, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute top-2/3 right-[20%] w-2 h-2 bg-mint rounded-full" />
      <motion.div animate={{ y: [0, -50, 0], opacity: [0, 0.12, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 4 }} className="absolute bottom-1/3 left-[60%] w-1 h-1 bg-blue-500 rounded-full" />
    </div>
  );
};

export const HeroSection = () => {
  return (
    <section className="relative min-h-[100svh] pt-24 pb-16 flex items-center overflow-hidden bg-gray-50/50 dark:bg-slate-950">
      {/* Background Threads Engine */}
      <AnimatedThreads />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* === LEFT CONTENT (Typography & CTAs) === */}
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="text-left max-w-2xl"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-full px-4 py-2 mb-8 shadow-sm">
              <Sparkles className="w-4 h-4 text-brand animate-pulse" />
              <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand to-brand-600">
                Campus Delivery Reimagined
              </span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter text-slate-900 dark:text-white leading-[1.05] mb-6">
              Your Campus Essentials, <br />
              <span className="relative inline-block mt-2">
                <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-brand via-brand-400 to-mint">
                  Delivered by Peers.
                </span>
                {/* Text highlight swoosh */}
                <motion.span 
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 1, delay: 0.8, type: "spring" }}
                  className="absolute bottom-1 left-0 w-full h-3 bg-brand/20 dark:bg-brand/40 -z-10 rounded-full origin-left"
                />
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed max-w-lg">
              Need something from town? A fellow student headed that way will pick it up and deliver it to your hostel. Fast, affordable, and built for your campus.
            </motion.p>

            {/* Magnetic CTA Buttons */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-4">
              <Link href="/auth" className="w-full sm:w-auto">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  // ADDED: dark:group-hover:text-white so it contrasts against the hover gradient
                  className="w-full relative group overflow-hidden bg-slate-900 dark:bg-white text-white dark:text-slate-900 dark:group-hover:text-white font-bold text-lg px-8 py-4 rounded-full flex items-center justify-center gap-3 shadow-2xl shadow-slate-900/20 dark:shadow-white/10 transition-colors"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5" /> Order Now
                  </span>
                  {/* Hover gradient effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-brand to-mint opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative z-10 hidden group-hover:block ml-2 transition-all">
                    <ArrowRight className="w-5 h-5" />
                  </span>
                </motion.button>
              </Link>

              <Link href="/auth" className="w-full sm:w-auto">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  // FIXED: Made the border white in dark mode and cleaned up the hover state
                  className="w-full bg-white/50 dark:bg-transparent backdrop-blur-md border border-slate-200 dark:border-white/30 hover:dark:bg-white/10 text-slate-800 dark:text-white font-bold text-lg px-8 py-4 rounded-full flex items-center justify-center gap-3 transition-all"
                >
                  <Bike className="w-5 h-5 text-brand dark:text-white" /> Deliver & Earn
                </motion.button>
              </Link>
            </motion.div>

            {/* Social Proof */}
            <motion.div variants={fadeUp} className="mt-12 flex items-center gap-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`w-10 h-10 rounded-full border-2 border-white dark:border-slate-950 bg-gradient-to-br from-brand to-mint flex items-center justify-center shadow-sm z-[${4-i}]`}>
                    <span className="text-xs font-bold text-white tracking-widest">{['R','P','A','S'][i-1]}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-1">
                  Trusted by <span className="text-slate-900 dark:text-white">500+</span> students
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* === RIGHT CONTENT (Floating UI Composition) === */}
          <div className="relative h-[500px] w-full hidden lg:block perspective-1000">
            {/* Main Order Card */}
            <motion.div 
              initial={{ opacity: 0, rotateY: 20, x: 100, z: -100 }}
              animate={{ opacity: 1, rotateY: -5, x: 0, z: 0 }}
              transition={{ duration: 1.2, type: "spring", bounce: 0.4 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/50 dark:border-slate-700/50 p-6 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] z-20"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand to-brand-500 flex items-center justify-center shadow-inner shadow-white/20">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">Snacks & Meds</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Sharma Store</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-brand/10 text-brand text-xs font-bold rounded-full">₹350</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: "0%" }}
                      animate={{ width: "60%" }}
                      transition={{ duration: 2, delay: 1 }}
                      className="h-full bg-brand rounded-full"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 px-2">
                  <span>Picked Up</span>
                  <span className="text-brand">On the way</span>
                  <span>Hostel B</span>
                </div>
              </div>
            </motion.div>

            {/* Floating Notification 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.8, type: "spring" }}
              className="absolute top-16 right-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 p-4 rounded-2xl shadow-xl z-30 flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-mint/20 rounded-full flex items-center justify-center">
                <Bike className="w-5 h-5 text-mint" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Rahul accepted!</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Arriving in 15 mins</p>
              </div>
            </motion.div>

            {/* Floating Earning Tag */}
            <motion.div 
              initial={{ opacity: 0, x: -50, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 1.2, type: "spring" }}
              className="absolute bottom-20 left-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-4 rounded-2xl shadow-2xl z-30 flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-white/10 dark:bg-slate-900/10 rounded-full flex items-center justify-center">
                <span className="font-bold text-lg">₹</span>
              </div>
              <div>
                <p className="text-xs font-medium opacity-80">Earned delivery fee</p>
                <p className="text-lg font-black">+ ₹45.00</p>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
};