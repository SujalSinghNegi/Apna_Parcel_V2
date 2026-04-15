'use client'

import Link from 'next/link'
import { Package, Heart, Twitter, Instagram, Github, ArrowRight, Mail } from 'lucide-react'
import { motion, Variants } from 'framer-motion'

const stagger:Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const fadeUp:Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } },
}

const footerLinks = [
  {
    title: 'Product',
    links: [
      { name: 'Place an Order', href: '/auth' },
      { name: 'Become a Rider', href: '/auth' },
      { name: 'Pricing & Fees', href: '#' },
      { name: 'Trust & Safety', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { name: 'About Us', href: '#' },
      { name: 'Campus Ambassadors', href: '#' },
      { name: 'Careers', href: '#' },
      { name: 'Contact', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { name: 'Terms of Service', href: '#' },
      { name: 'Privacy Policy', href: '#' },
      { name: 'Refund Policy', href: '#' },
      { name: 'Help Center', href: '#' },
    ],
  },
]

export const Footer = () => {
  return (
    <footer className="relative bg-white dark:bg-slate-950 pt-24 pb-12 overflow-hidden mt-12">
      
      {/* Animated Top Border Line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-slate-200 dark:bg-slate-800">
        <motion.div
          className="absolute top-0 left-0 h-full w-1/4 bg-gradient-to-r from-transparent via-brand to-transparent"
          animate={{ x: ['-100%', '400%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Ambient background glows */}
      <motion.div
        animate={{ opacity: [0.03, 0.08, 0.03], scale: [1, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-t from-brand/20 via-mint/10 to-transparent rounded-full blur-[100px] pointer-events-none"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Pre-Footer CTA Card */}
        {/* <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="relative -mt-40 mb-20 bg-slate-900 dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-12 overflow-hidden shadow-2xl shadow-slate-900/20 dark:shadow-black/50"
        >
          {/* CTA Background Effects */}
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-brand/40 to-transparent rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h3 className="text-3xl md:text-4xl font-black text-white mb-4">
                Ready to simplify campus life?
              </h3>
              <p className="text-slate-400 text-lg max-w-md">
                Join the network today. Order what you need, or start delivering to earn pocket money.
              </p>
            </div>
            <div className="flex shrink-0">
              <Link href="/auth">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group bg-white text-slate-900 font-bold text-lg px-8 py-4 rounded-full flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:shadow-white/20 transition-all"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
            </div>
          </div>
        {/* </motion.div>  */}

        {/* Main Footer Content */}
        <motion.div 
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-16"
        >
          {/* Brand Column */}
          <motion.div variants={fadeUp} className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 group mb-6 inline-flex">
              <div className="w-10 h-10 bg-gradient-to-tr from-brand to-mint rounded-xl flex items-center justify-center shadow-lg shadow-brand/20 group-hover:scale-105 group-hover:rotate-6 transition-all duration-300">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-2xl text-slate-900 dark:text-white tracking-tight">
                Apna<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-mint">Parcel</span>
              </span>
            </Link>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mb-8 font-medium">
              The first peer-to-peer campus delivery network built entirely by students, for students. Bridging the gap between local town shops and your hostel room.
            </p>
            
            {/* Social Icons */}
            <div className="flex items-center gap-4">
              {[Twitter, Instagram, Github, Mail].map((Icon, i) => (
                <motion.a
                  key={i}
                  href="#"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-brand hover:text-white dark:hover:bg-brand dark:hover:text-white transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Links Columns */}
          {footerLinks.map((column, idx) => (
            <motion.div key={idx} variants={fadeUp} className="col-span-1">
              <h4 className="font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-wider text-sm">
                {column.title}
              </h4>
              <ul className="space-y-4">
                {column.links.map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <Link 
                      href={link.href}
                      className="text-slate-500 dark:text-slate-400 hover:text-brand dark:hover:text-mint transition-colors font-medium text-sm inline-flex items-center group relative"
                    >
                      <span>{link.name}</span>
                      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand dark:bg-mint transition-all duration-300 group-hover:w-full" />
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Bar */}
        <motion.div 
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="pt-8 border-t border-slate-200 dark:border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            Made with 
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex"
            >
              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            </motion.span>
            by students — Dwarahat, Uttarakhand
          </p>
          <div className="flex items-center gap-6">
            <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">
              © {new Date().getFullYear()} ApnaParcel. All rights reserved.
            </p>
          </div>
        </motion.div>

      </div>
    </footer>
  )
}