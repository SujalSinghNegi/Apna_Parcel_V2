'use client'
import { motion } from 'framer-motion'

const variants = {
  hidden: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export const PageTransition = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <motion.div variants={variants} initial="hidden" animate="enter" exit="exit"
    transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
    className={className}>
    {children}
  </motion.div>
)
