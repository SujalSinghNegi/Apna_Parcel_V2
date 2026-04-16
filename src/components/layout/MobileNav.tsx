'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingBag, Bike, User, ClipboardList, Store, Bell, Shield, Users, MessageSquare } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const userTabs = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/orders/new', icon: ShoppingBag, label: 'Order' },
  { href: '/rider', icon: Bike, label: 'Rider' },
  { href: '/orders?role=client', icon: ClipboardList, label: 'Orders' },
  { href: '/profile', icon: User, label: 'Profile' },
]

const vendorTabs = [
  { href: '/vendors/dashboard', icon: Store, label: 'Shop' },
  { href: '/vendors/requests', icon: Bell, label: 'Requests' },
  { href: '/notifications', icon: Bell, label: 'Alerts' },
  { href: '/profile', icon: User, label: 'Profile' },
]

const adminTabs = [
  { href: '/admin', icon: Home, label: 'Dashboard' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/orders', icon: ClipboardList, label: 'Orders' },
  { href: '/admin/complaints', icon: MessageSquare, label: 'Complaints' },
  { href: '/admin/vendors', icon: Store, label: 'Vendors' },
]

export const MobileNav = () => {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const tabs = user?.isAdmin ? adminTabs : user?.role === 'VENDOR' ? vendorTabs : userTabs
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-700/60 flex md:hidden z-40 px-1 pb-[env(safe-area-inset-bottom)]">
      {tabs.map(({ href, icon: Icon, label }) => {
        const hrefPath = href.split('?')[0]
        const active = pathname === href || pathname === hrefPath || (href !== '/dashboard' && hrefPath !== '/orders' && pathname.startsWith(hrefPath))
        return (
          <Link key={href} href={href}
            className={cn(
              'flex-1 flex flex-col items-center py-2 gap-0.5 transition-all relative',
              active ? 'text-brand' : 'text-gray-400 dark:text-gray-500 active:text-gray-600'
            )}>
            {active && (
              <motion.span layoutId="mobile-tab-indicator"
                className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-brand rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
            )}
            <motion.div whileTap={{ scale: 0.85 }}
              className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center transition-all',
                active ? 'bg-brand-50' : ''
              )}>
              <Icon className={cn('w-[20px] h-[20px] transition-all', active ? 'text-brand' : '')} strokeWidth={active ? 2.5 : 2} />
            </motion.div>
            <span className={cn('text-[10px] font-bold leading-none', active ? 'text-brand' : 'text-gray-400 dark:text-gray-500')}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
