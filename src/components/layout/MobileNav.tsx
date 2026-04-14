'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingBag, Bike, User, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/orders/new', icon: ShoppingBag, label: 'Order' },
  { href: '/rider', icon: Bike, label: 'Rider' },
  { href: '/orders?role=client', icon: ClipboardList, label: 'Orders' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export const MobileNav = () => {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100/80 flex md:hidden z-40 px-2 pb-[env(safe-area-inset-bottom)]">
      {tabs.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href.split('?')[0]))
        return (
          <Link key={href} href={href}
            className={cn(
              'flex-1 flex flex-col items-center py-2.5 gap-1 transition-all relative',
              active ? 'text-brand' : 'text-gray-400 active:text-gray-600'
            )}>
            {active && (
              <span className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand rounded-full" />
            )}
            <div className={cn(
              'p-1 rounded-xl transition-all',
              active ? 'bg-brand-50' : ''
            )}>
              <Icon className={cn('w-5 h-5 transition-all', active ? 'scale-110 text-brand' : '')} />
            </div>
            <span className={cn('text-[10px] font-bold', active ? 'text-brand' : 'text-gray-400')}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
