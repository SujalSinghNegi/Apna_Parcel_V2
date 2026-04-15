'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { Avatar } from '@/components/ui/Avatar'
import { TrustBadge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { authApi, usersApi } from '@/lib/api'
import { initSocket, EVENTS } from '@/lib/socket'
import { useSidebarStore } from '@/store/sidebar'
import { useThemeStore } from '@/store/theme'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  Home, ShoppingBag, Bike, Store, Shield, User, ClipboardList,
  MessageSquare, Bell, LogOut, Package, ChevronLeft, ChevronRight,
  Star, Wallet, X, Menu, Sun, Moon,
} from 'lucide-react'

/* ─── Sidebar ──────────────────────────────────────────────────────────── */
export const Sidebar = () => {
  const { user, clearAuth, refreshToken, accessToken } = useAuthStore() as any
  const pathname = usePathname()
  const router = useRouter()
  const { collapsed, toggleCollapsed } = useSidebarStore()
  const { theme, toggleTheme } = useThemeStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [riderTransition, setRiderTransition] = useState(false)

  // Fetch unread notification count & listen for new ones
  useEffect(() => {
    usersApi.notifications(1)
      .then(r => { const n = r.data.data || []; setUnreadCount(n.filter((x: any) => !x.isRead).length) })
      .catch(() => {})
  }, [pathname])

  useEffect(() => {
    if (!accessToken) return
    const socket = initSocket(accessToken)
    const handler = () => setUnreadCount(c => c + 1)
    socket.on(EVENTS.NOTIFICATION, handler)
    return () => { socket.off(EVENTS.NOTIFICATION, handler) }
  }, [accessToken])

  useEffect(() => { if (pathname === '/notifications') setUnreadCount(0) }, [pathname])

  // Close mobile sidebar on route change & dismiss rider transition
  useEffect(() => { setMobileOpen(false); setRiderTransition(false) }, [pathname])

  const handleLogout = async () => {
    try { if (refreshToken) await authApi.logout(refreshToken) } catch {}
    clearAuth()
    toast.success('Logged out')
    window.location.href = '/auth'
  }

  const handleRiderClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setRiderTransition(true)
    // wait for the overlay animation, then navigate and dismiss
    setTimeout(() => {
      router.push('/rider')
      setTimeout(() => setRiderTransition(false), 400)
    }, 600)
  }, [router])

  if (!user) return null

  const mainLinks = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/orders/new', label: 'New Order', icon: ShoppingBag },
    { href: '/orders?role=client', label: 'My Orders', icon: ClipboardList },
    { href: '/vendors', label: 'Shops', icon: Store },
    { href: '/notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
  ]

  const bottomLinks = [
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/complaints', label: 'Complaints', icon: MessageSquare },
    ...(user.isAdmin ? [{ href: '/admin', label: 'Admin', icon: Shield }] : []),
  ]

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-[260px]'

  const NavItem = ({ href, icon: Icon, label, badge, onClick, highlight }: any) => {
    const hrefPath = href?.split('?')[0] || ''
    const active = pathname === href || pathname === hrefPath || (href !== '/dashboard' && hrefPath && hrefPath !== '/orders' && pathname.startsWith(hrefPath))
    const Comp = onClick ? 'button' : Link
    const props = onClick ? { onClick } : { href }
    return (
      <Comp {...(props as any)}
        className={cn(
          'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200',
          active ? 'bg-brand/10 text-brand' : highlight ? 'text-navy dark:text-gray-100 hover:bg-gradient-to-r hover:from-brand/5 hover:to-brand/10 hover:text-brand' : 'text-navy-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-navy dark:hover:text-gray-100',
          collapsed && 'justify-center px-0',
        )}>
        {/* Active indicator */}
        {active && (
          <motion.div layoutId="sidebar-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-brand rounded-r-full"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
        )}
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
          className={cn('relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200',
            active ? 'bg-brand/15' : 'bg-transparent group-hover:bg-gray-100 dark:group-hover:bg-gray-700')}>
          <Icon className={cn('w-[18px] h-[18px] transition-all', active ? 'text-brand' : highlight ? 'text-brand-400' : '')} strokeWidth={active ? 2.5 : 2} />
          {!collapsed && badge != null && badge > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-brand rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
              {badge > 9 ? '9+' : badge}
            </motion.span>
          )}
        </motion.div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }} className="truncate whitespace-nowrap">
              {label}
            </motion.span>
          )}
        </AnimatePresence>
        {collapsed && badge != null && badge > 0 && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] bg-brand rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5">
            {badge > 9 ? '9+' : badge}
          </motion.span>
        )}
      </Comp>
    )
  }

  /* ─── Desktop Sidebar (md+) ───────────────────────────── */
  const SidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo area */}
      <div className={cn('flex items-center h-16 px-4 border-b border-gray-100/80 dark:border-gray-700/60 shrink-0',
        collapsed ? 'justify-center' : 'gap-3')}>
        <motion.div whileHover={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 0.5 }}
          className="w-9 h-9 bg-gradient-to-br from-brand to-brand-600 rounded-xl flex items-center justify-center shadow-md shadow-brand/20 shrink-0">
          <Package className="w-4.5 h-4.5 text-white" />
        </motion.div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
              className="font-extrabold text-navy dark:text-gray-100 text-lg whitespace-nowrap">
              Apna<span className="text-brand">Parcel</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* User card */}
      <div className={cn('px-3 pt-4 pb-2 shrink-0', collapsed && 'px-2')}>
        <Link href="/profile">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className={cn('rounded-2xl bg-gradient-to-br from-navy/5 to-brand/5 dark:from-gray-700/50 dark:to-brand/10 p-3 flex items-center gap-3 transition-all hover:shadow-md',
              collapsed && 'p-2 justify-center')}>
            <div className="relative shrink-0">
              <Avatar src={user.profilePhoto} name={user.name} size="sm" />
              {user.isVerified && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex-1 min-w-0">
                  <p className="font-bold text-navy dark:text-gray-100 text-sm truncate">{user.name}</p>
                  <TrustBadge level={user.trustLevel} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </Link>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto scrollbar-none">
        <AnimatePresence>
          {!collapsed && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1.5">Menu</motion.p>
          )}
        </AnimatePresence>
        {mainLinks.map(l => <NavItem key={l.href} {...l} />)}

        {/* Rider mode — special button */}
        <div className="pt-2">
          <AnimatePresence>
            {!collapsed && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1.5">Earn Money</motion.p>
            )}
          </AnimatePresence>
          <NavItem icon={Bike} label="Rider Mode" onClick={handleRiderClick} highlight />
          <NavItem href="/vendors/dashboard" icon={Store} label="My Shop" highlight />
        </div>

        <div className="pt-4">
          <AnimatePresence>
            {!collapsed && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1.5">Account</motion.p>
            )}
          </AnimatePresence>
          {bottomLinks.map(l => <NavItem key={l.href} {...l} />)}
        </div>
      </nav>

      {/* Collapse toggle + logout */}
      <div className="px-3 pb-4 space-y-1.5 shrink-0 border-t border-gray-100/80 dark:border-gray-700/60 pt-3">
        {/* Theme toggle */}
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
          onClick={toggleTheme}
          className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-navy-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all',
            collapsed && 'justify-center px-0')}>
          <motion.div animate={{ rotate: theme === 'dark' ? 180 : 0 }} transition={{ duration: 0.4 }}>
            {theme === 'dark' ? <Sun className="w-[18px] h-[18px] text-amber-400 shrink-0" /> : <Moon className="w-[18px] h-[18px] shrink-0" />}
          </motion.div>
          <AnimatePresence>
            {!collapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</motion.span>}
          </AnimatePresence>
        </motion.button>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
          onClick={handleLogout}
          className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all',
            collapsed && 'justify-center px-0')}>
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          <AnimatePresence>
            {!collapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Sign out</motion.span>}
          </AnimatePresence>
        </motion.button>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={toggleCollapsed}
          className="hidden md:flex w-full items-center justify-center py-2 rounded-xl text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-navy dark:hover:text-gray-200 transition-all">
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.3 }}>
            <ChevronLeft className="w-4 h-4" />
          </motion.div>
        </motion.button>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Rider Mode Fullscreen Transition ──────────── */}
      <AnimatePresence>
        {riderTransition && (
          <motion.div className="fixed inset-0 z-[100] flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Radial wipe background */}
            <motion.div className="absolute inset-0 bg-navy"
              initial={{ clipPath: 'circle(0% at 50% 50%)' }}
              animate={{ clipPath: 'circle(150% at 50% 50%)' }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
            {/* Centered icon + text */}
            <motion.div className="relative z-10 flex flex-col items-center gap-4 text-white"
              initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 25 }}>
              <motion.div animate={{ y: [0, -8, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                className="w-20 h-20 bg-brand/20 rounded-3xl flex items-center justify-center backdrop-blur-sm">
                <Bike className="w-10 h-10 text-brand" />
              </motion.div>
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }} className="text-lg font-extrabold">
                Switching to Rider Mode
              </motion.p>
              <motion.div initial={{ width: 0 }} animate={{ width: 120 }}
                transition={{ delay: 0.4, duration: 0.5, ease: 'easeInOut' }}
                className="h-1 bg-brand rounded-full" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile hamburger button (shown when sidebar closed) ─── */}
      <motion.button whileTap={{ scale: 0.9 }}
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 flex items-center justify-center">
        <Menu className="w-5 h-5 text-navy dark:text-gray-100" />
      </motion.button>

      {/* ── Desktop sidebar ───────────────────────────── */}
      <motion.aside animate={{ width: collapsed ? 72 : 260 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn('hidden md:flex flex-col fixed left-0 top-0 bottom-0 bg-white dark:bg-gray-900 border-r border-gray-100/80 dark:border-gray-700/60 z-40 overflow-hidden')}>
        {SidebarContent}
      </motion.aside>

      {/* ── Mobile sidebar overlay ────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 md:hidden" />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] bg-white dark:bg-gray-900 z-50 md:hidden shadow-2xl overflow-hidden">
              <button onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
