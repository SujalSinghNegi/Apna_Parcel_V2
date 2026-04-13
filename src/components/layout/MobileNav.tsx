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
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 flex md:hidden z-40">
      {tabs.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href.split('?')[0]))
        return (
          <Link key={href} href={href} className={cn('flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors', active ? 'text-brand' : 'text-gray-400')}>
            <Icon className={cn('w-5 h-5 transition-transform', active ? 'scale-110' : '')} />
            <span className={cn('text-[10px] font-display font-semibold', active ? 'text-brand' : 'text-gray-400')}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
