'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { Avatar } from '@/components/ui/Avatar'
import { 
  Bell, Package, ChevronDown, ShoppingBag, Bike, 
  Home, Store, Shield, LogOut, User, ClipboardList, MessageSquare 
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { authApi, usersApi } from '@/lib/api'
import { initSocket, EVENTS } from '@/lib/socket'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence, Variants } from 'framer-motion'

// --- Animation Variants ---
const dropdownVariants:Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.95, filter: 'blur(10px)' },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1, 
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 300, damping: 25, staggerChildren: 0.05 }
  },
  exit: { 
    opacity: 0, 
    y: 10, 
    scale: 0.95, 
    filter: 'blur(5px)',
    transition: { ease: 'easeInOut', duration: 0.2 } 
  }
}

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 }
}

export const Navbar = () => {
  const { user, clearAuth, refreshToken, accessToken } = useAuthStore() as any
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [hoveredNav, setHoveredNav] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on click outside
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Fetch unread count
  useEffect(() => {
    usersApi.notifications(1)
      .then(r => {
        const notifs = r.data.data || []
        setUnreadCount(notifs.filter((n: any) => !n.isRead).length)
      })
      .catch(() => {})
  }, [pathname])

  // Listen for new notifications via socket
  useEffect(() => {
    if (!accessToken) return
    const socket = initSocket(accessToken)
    const handler = () => setUnreadCount(c => c + 1)
    socket.on(EVENTS.NOTIFICATION, handler)
    return () => { socket.off(EVENTS.NOTIFICATION, handler) }
  }, [accessToken])

  // Reset count when visiting notifications page
  useEffect(() => {
    if (pathname === '/notifications') setUnreadCount(0)
  }, [pathname])

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken)
    } catch {}
    clearAuth()
    toast.success('Logged out')
    window.location.href = '/auth'
  }

  if (!user) return null

  const navLinks = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/orders/new', label: 'Order', icon: ShoppingBag },
    { href: '/rider', label: 'Rider', icon: Bike },
    { href: '/vendors', label: 'Shops', icon: Store },
    ...(user.isAdmin ? [{ href: '/admin', label: 'Admin', icon: Shield }] : []),
  ]

  const menuLinks = [
    { href: '/profile', label: 'My Profile', icon: User },
    { href: '/orders?role=client', label: 'My Orders', icon: ClipboardList },
    { href: '/complaints', label: 'Complaints', icon: MessageSquare },
    { href: '/notifications', label: 'Notifications', icon: Bell },
  ]

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pt-4 px-4 flex justify-center pointer-events-none">
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-full max-w-6xl pointer-events-auto bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] px-3 py-2 flex items-center justify-between"
      >
        {/* === LOGO === */}
        <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0 group relative z-10 pl-2">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 bg-gradient-to-tr from-brand via-brand-500 to-mint rounded-full flex items-center justify-center shadow-lg shadow-brand/30"
          >
            <Package className="w-5 h-5 text-white" />
          </motion.div>
          <span className="font-extrabold text-slate-900 dark:text-white text-lg hidden md:block tracking-tight">
            Apna<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-mint">Parcel</span>
          </span>
        </Link>

        {/* === CENTER NAVIGATION (Liquid Pill Effect) === */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-full border border-white/20 dark:border-slate-700/50">
          {navLinks.map(l => {
            const isActive = pathname.startsWith(l.href)
            return (
              <Link 
                key={l.href} 
                href={l.href} 
                onMouseEnter={() => setHoveredNav(l.href)}
                onMouseLeave={() => setHoveredNav(null)}
                className="relative px-4 py-2 rounded-full z-10 group"
              >
                {/* Active Indicator */}
                {isActive && (
                  <motion.div 
                    layoutId="active-nav-pill"
                    className="absolute inset-0 bg-white dark:bg-slate-700 rounded-full shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {/* Hover Indicator */}
                {hoveredNav === l.href && !isActive && (
                  <motion.div 
                    layoutId="hover-nav-pill"
                    className="absolute inset-0 bg-slate-200/50 dark:bg-slate-600/50 rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <div className={cn(
                  "relative flex items-center gap-2 text-sm font-bold transition-colors duration-300 z-10",
                  isActive ? "text-brand" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                )}>
                  <l.icon className={cn("w-4 h-4 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
                  {l.label}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* === RIGHT ACTIONS === */}
        <div className="flex items-center gap-2 pr-1">
          {/* Notification Bell */}
          <Link href="/notifications">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2.5 rounded-full bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors border border-transparent dark:hover:border-slate-700"
            >
              <Bell className="w-5 h-5" />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute top-1 right-1 flex h-4 w-4"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-gradient-to-r from-brand to-mint items-center justify-center text-[9px] font-black text-white shadow-sm border border-white dark:border-slate-900">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </Link>

          {/* Profile Dropdown Toggle */}
          <div className="relative" ref={menuRef}>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setMenuOpen(!menuOpen)}
              className={cn(
                "flex items-center gap-2.5 p-1.5 pr-4 rounded-full transition-all duration-300 border",
                menuOpen 
                  ? "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 shadow-md" 
                  : "bg-slate-100/50 dark:bg-slate-800/50 border-transparent hover:border-gray-200 dark:hover:border-slate-700"
              )}
            >
              <Avatar src={user.profilePhoto} name={user.name} size="sm" className="ring-2 ring-white dark:ring-slate-700 shadow-sm" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200 hidden sm:block max-w-[100px] truncate">
                {user.name.split(' ')[0]}
              </span>
              <motion.div animate={{ rotate: menuOpen ? 180 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
              </motion.div>
            </motion.button>

            {/* Glassmorphic Dropdown Menu */}
            <AnimatePresence>
              {menuOpen && (
                <motion.div 
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute right-0 mt-4 w-64 bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/60 dark:border-slate-700/50 p-2 z-50 overflow-hidden"
                >
                  {/* User Profile Header in Dropdown */}
                  <div className="px-4 py-3.5 mb-2 bg-gradient-to-br from-slate-100 to-white dark:from-slate-800 dark:to-slate-800/50 rounded-2xl border border-white/50 dark:border-slate-700/50">
                    <p className="text-sm font-black text-slate-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">{user.email}</p>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    {menuLinks.map(item => (
                      <motion.div key={item.href} variants={itemVariants}>
                        <Link 
                          href={item.href} 
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-brand dark:hover:text-mint hover:bg-brand/5 dark:hover:bg-mint/10 rounded-xl transition-all group"
                        >
                          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-900 group-hover:shadow-sm transition-all">
                            <item.icon className="w-4 h-4 text-slate-400 group-hover:text-brand dark:group-hover:text-mint transition-colors" />
                          </div>
                          {item.label}
                        </Link>
                      </motion.div>
                    ))}
                  </div>

                  <div className="h-px bg-slate-200/50 dark:bg-slate-700/50 my-2 mx-3" />
                  
                  <motion.div variants={itemVariants}>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all group"
                    >
                      <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 group-hover:bg-red-100 dark:group-hover:bg-red-500/20 transition-all">
                        <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      </div>
                      Sign out
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.header>
    </div>
  )
}