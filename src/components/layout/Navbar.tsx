'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { Avatar } from '@/components/ui/Avatar'
import { Bell, Package, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { authApi, getErrorMessage } from '@/lib/api'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

export const Navbar = () => {
  const { user, clearAuth, refreshToken } = useAuthStore() as any
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

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
    { href: '/dashboard', label: 'Home' },
    { href: '/orders/new', label: 'Order Now' },
    { href: '/rider', label: 'Rider Mode' },
    { href: '/vendors', label: 'Shops' },
    ...(user.isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-brand rounded-xl flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-navy text-lg hidden sm:block">ApnaParcel</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} className={cn('px-3 py-1.5 rounded-xl text-sm font-semibold font-display transition-colors',
              pathname.startsWith(l.href) ? 'bg-brand-50 text-brand' : 'text-navy-600 hover:bg-gray-50 hover:text-navy')}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/notifications" className="relative p-2 rounded-xl hover:bg-gray-100 text-navy-500 transition-colors">
            <Bell className="w-5 h-5" />
          </Link>
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
              <Avatar src={user.profilePhoto} name={user.name} size="sm" />
              <span className="text-sm font-semibold font-display text-navy hidden sm:block max-w-[120px] truncate">{user.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 z-50 animate-slide-down">
                <div className="px-4 py-2.5 border-b border-gray-50">
                  <p className="text-sm font-semibold text-navy font-display">{user.name}</p>
                  <p className="text-xs text-gray-500 font-sans">{user.email}</p>
                </div>
                {[
                  { href: '/profile', label: 'My Profile' },
                  { href: '/orders?role=client', label: 'My Orders' },
                  { href: '/complaints', label: 'Complaints' },
                  { href: '/notifications', label: 'Notifications' },
                ].map(item => (
                  <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm font-sans text-navy-700 hover:bg-gray-50 transition-colors">
                    {item.label}
                  </Link>
                ))}
                <hr className="my-1 border-gray-100" />
                <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm font-sans text-red-600 hover:bg-red-50 transition-colors">
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
