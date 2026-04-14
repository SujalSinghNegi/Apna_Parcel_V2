'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { Avatar } from '@/components/ui/Avatar'
import { Bell, Package, ChevronDown, ShoppingBag, Bike, Home, Store, Shield, LogOut, User, ClipboardList, MessageSquare } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { authApi, getErrorMessage } from '@/lib/api'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

export const Navbar = () => {
  const { user, clearAuth, refreshToken } = useAuthStore() as any
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on click outside
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

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
    { href: '/orders/new', label: 'Order Now', icon: ShoppingBag },
    { href: '/rider', label: 'Rider Mode', icon: Bike },
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
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100/80 shadow-sm shadow-gray-100/50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-9 h-9 bg-gradient-to-br from-brand to-brand-600 rounded-xl flex items-center justify-center shadow-md shadow-brand/20 group-hover:shadow-lg group-hover:shadow-brand/30 transition-shadow">
            <Package className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-extrabold text-navy text-lg hidden sm:block">
            Apna<span className="text-brand">Parcel</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 bg-gray-50/80 rounded-2xl p-1">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all',
                pathname.startsWith(l.href)
                  ? 'bg-white text-brand shadow-sm'
                  : 'text-navy-500 hover:text-navy-700 hover:bg-white/50'
              )}>
              <l.icon className="w-4 h-4" />
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/notifications"
            className="relative p-2.5 rounded-xl hover:bg-gray-100 text-navy-400 hover:text-navy-600 transition-all">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-brand rounded-full ring-2 ring-white" />
          </Link>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(!menuOpen)}
              className={cn(
                "flex items-center gap-2 p-1.5 rounded-xl transition-all",
                menuOpen ? "bg-gray-100" : "hover:bg-gray-50"
              )}>
              <Avatar src={user.profilePhoto} name={user.name} size="sm" />
              <span className="text-sm font-bold text-navy hidden sm:block max-w-[120px] truncate">{user.name}</span>
              <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 hidden sm:block transition-transform", menuOpen && "rotate-180")} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl shadow-gray-200/50 border border-gray-100 py-1.5 z-50 animate-scale-in origin-top-right">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-bold text-navy">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <div className="py-1">
                  {menuLinks.map(item => (
                    <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-navy-600 hover:bg-gray-50 hover:text-navy transition-colors">
                      <item.icon className="w-4 h-4 text-gray-400" />
                      {item.label}
                    </Link>
                  ))}
                </div>
                <hr className="my-1 border-gray-100" />
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut className="w-4 h-4" />
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
