'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import { usersApi, ordersApi, getErrorMessage } from '@/lib/api'
import { initSocket, EVENTS } from '@/lib/socket'
import { Card, CardContent } from '@/components/ui/Card'
import { TrustBadge, StatusBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { fmt, cn } from '@/lib/utils'
import { Order, TRUST_LEVEL_NAMES, TRUST_LEVEL_LIMITS } from '@/types'
import {
  Package, ShoppingBag, Bike, Star, TrendingUp, ArrowRight, ChevronRight,
  Sparkles, Wallet, Trophy, Clock, Bell, RefreshCw, Zap, Loader2
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const POLL_INTERVAL = 30_000

/* ─── Skeleton Components ──────────────────────────────────────────────── */
function SkeletonPulse({ className }: { className?: string }) {
  return <div className={cn('bg-white/10 rounded-xl animate-pulse', className)} />
}

function DashboardSkeleton() {
  return (
    <div className="page-container space-y-6">
      {/* Hero skeleton */}
      <div className="relative bg-gradient-to-br from-navy via-navy-800 to-navy-900 rounded-3xl p-6 sm:p-8 overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-brand/10 rounded-full blur-2xl" />
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-white/10 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-28 bg-white/10 rounded-lg animate-pulse" />
            <div className="h-6 w-48 bg-white/10 rounded-lg animate-pulse" />
            <div className="h-5 w-24 bg-white/10 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white/10 rounded-2xl p-3.5 space-y-2">
              <div className="h-4 w-4 bg-white/10 rounded mx-auto animate-pulse" />
              <div className="h-7 w-12 bg-white/10 rounded-lg mx-auto animate-pulse" />
              <div className="h-3 w-16 bg-white/10 rounded mx-auto animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[1,2].map(i => (
          <div key={i} className="bg-gray-100 rounded-2xl p-5 h-36 animate-pulse" />
        ))}
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[1,2].map(i => (
          <Card key={i}><CardContent className="pt-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gray-100 rounded-xl animate-pulse" />
              <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="h-8 w-24 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
          </CardContent></Card>
        ))}
      </div>

      {/* Recent orders skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-6 w-36 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
        </div>
        {[1,2,3].map(i => (
          <Card key={i}><CardContent className="py-4 flex items-center gap-3">
            <div className="w-11 h-11 bg-gray-100 rounded-xl animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse ml-auto" />
              <div className="h-3 w-12 bg-gray-100 rounded animate-pulse ml-auto" />
            </div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, setUser, accessToken } = useAuthStore() as any
  const [stats, setStats] = useState<any>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [meRes, statsRes, ordersRes, notifRes] = await Promise.all([
        usersApi.me().catch(() => null),
        usersApi.stats().catch(() => null),
        ordersApi.list('client', undefined, 1).catch(() => null),
        usersApi.notifications(1).catch(() => null),
      ])
      // Sync fresh user data into the store so hero is never stale
      if (meRes?.data?.data) setUser(meRes.data.data)
      if (statsRes) setStats(statsRes.data.data)
      if (ordersRes) setRecentOrders(ordersRes.data.data?.slice(0, 3) || [])
      if (notifRes) {
        const notifications = notifRes.data.data || []
        setUnreadCount(notifications.filter((n: any) => !n.isRead).length)
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false) }
  }, [setUser])

  useEffect(() => { fetchData() }, [fetchData])

  // Poll for fresh data every 30s
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchData])

  // Listen for real-time notification and order events via socket
  useEffect(() => {
    if (!accessToken) return
    const socket = initSocket(accessToken)

    const onNotification = () => {
      setUnreadCount(c => c + 1)
    }
    const onOrderStatus = () => {
      fetchData(true)
    }

    socket.on(EVENTS.NOTIFICATION, onNotification)
    socket.on(EVENTS.ORDER_STATUS, onOrderStatus)
    socket.on(EVENTS.ORDER_ACCEPTED, onOrderStatus)
    socket.on(EVENTS.ORDER_DELIVERED, onOrderStatus)

    return () => {
      socket.off(EVENTS.NOTIFICATION, onNotification)
      socket.off(EVENTS.ORDER_STATUS, onOrderStatus)
      socket.off(EVENTS.ORDER_ACCEPTED, onOrderStatus)
      socket.off(EVENTS.ORDER_DELIVERED, onOrderStatus)
    }
  }, [accessToken, fetchData])

  if (!user) return null

  // Show full skeleton while loading for the first time
  if (loading) return <DashboardSkeleton />

  const limit = TRUST_LEVEL_LIMITS[user.trustLevel]
  const trustName = TRUST_LEVEL_NAMES[user.trustLevel]
  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const heroStats = [
    { value: user.completedOrders, label: 'Deliveries', icon: Package, color: 'text-blue-300' },
    { value: user.rating > 0 ? user.rating.toFixed(1) : '—', label: 'Rating', icon: Star, color: 'text-amber-300' },
    { value: limit === Infinity ? '∞' : `₹${limit}`, label: 'Order Limit', icon: Wallet, color: 'text-emerald-300' },
  ]

  return (
    <div className="page-container space-y-6 animate-fade-in">
      {/* Live refresh indicator */}
      {refreshing && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-md shadow-lg rounded-full px-4 py-2 flex items-center gap-2 animate-fade-in-down border border-gray-100">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />
          <span className="text-xs font-bold text-navy-500">Updating...</span>
        </div>
      )}

      {/* Hero greeting */}
      <div className="relative bg-gradient-to-br from-navy via-navy-800 to-navy-900 rounded-3xl p-6 sm:p-8 text-white overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-brand/10 rounded-full blur-2xl animate-pulse-soft" />
        <div className="absolute -right-6 -bottom-16 w-64 h-64 bg-brand/5 rounded-full animate-float-slow" />
        <div className="absolute left-1/2 -top-20 w-40 h-40 bg-white/5 rounded-full blur-xl animate-float-delayed" />

        <div className="relative">
          <div className="flex items-start sm:items-center gap-4 mb-6">
            <div className="relative">
              <Avatar src={user.profilePhoto} name={user.name} size="lg" className="ring-3 ring-white/20 shadow-xl" />
              {user.isVerified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center ring-2 ring-navy-800">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/60 text-sm font-medium animate-fade-in">{greeting()} 👋</p>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white truncate">{user.name}</h1>
              <div className="mt-1.5 flex items-center gap-2">
                <TrustBadge level={user.trustLevel} />
                <span className="text-[11px] text-white/40 font-medium hidden sm:inline">• {trustName}</span>
              </div>
            </div>
            <Link href="/notifications" className="relative p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-95 shrink-0 group">
              <Bell className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] bg-brand rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-navy animate-bounce-in px-1 shadow-lg shadow-brand/30">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {heroStats.map((item, i) => (
              <div key={i} className="bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-2xl p-3.5 text-center transition-all group cursor-default animate-slide-up" style={{ animationDelay: `${i * 100 + 200}ms` }}>
                <item.icon className={cn('w-4 h-4 mx-auto mb-1 transition-all group-hover:scale-110', item.color)} />
                <p className="text-xl sm:text-2xl font-extrabold tracking-tight">{item.value}</p>
                <p className="text-[11px] text-white/50 font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/orders/new" className="group animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="relative bg-gradient-to-br from-brand to-brand-600 rounded-2xl p-5 text-white h-full flex flex-col gap-3 transition-all active:scale-[0.97] shadow-lg shadow-brand/20 hover:shadow-xl hover:shadow-brand/30 overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full group-hover:scale-125 transition-transform duration-500" />
            <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <Zap className="w-4 h-4 text-white/40" />
            </div>
            <div className="relative">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-1 group-hover:bg-white/30 transition-colors">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <p className="font-extrabold text-base">Order Now</p>
              <p className="text-xs text-white/70 font-medium">Need something from town?</p>
            </div>
            <ArrowRight className="w-4 h-4 ml-auto text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
        <Link href="/rider" className="group animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="relative bg-gradient-to-br from-navy-700 to-navy-900 rounded-2xl p-5 text-white h-full flex flex-col gap-3 transition-all active:scale-[0.97] shadow-lg overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full group-hover:scale-125 transition-transform duration-500" />
            <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <Sparkles className="w-4 h-4 text-white/40" />
            </div>
            <div className="relative">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-1 group-hover:bg-white/30 transition-colors">
                <Bike className="w-5 h-5" />
              </div>
              <p className="font-extrabold text-base">Rider Mode</p>
              <p className="text-xs text-white/70 font-medium">Going to town? Earn!</p>
            </div>
            <ArrowRight className="w-4 h-4 ml-auto text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="card-hover animate-slide-up overflow-hidden group" style={{ animationDelay: '250ms' }}>
            <CardContent className="pt-5 relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-green-50 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 bg-gradient-to-br from-green-100 to-emerald-50 rounded-xl flex items-center justify-center shadow-sm">
                  <TrendingUp className="w-4.5 h-4.5 text-green-600" />
                </div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">As Client</span>
              </div>
              <p className="text-2xl font-extrabold text-navy">{fmt.currency(stats.asClient?.totalSpent || 0)}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{stats.asClient?.ordersPlaced || 0} orders placed</p>
            </CardContent>
          </Card>
          <Card className="card-hover animate-slide-up overflow-hidden group" style={{ animationDelay: '350ms' }}>
            <CardContent className="pt-5 relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-brand-50 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 bg-gradient-to-br from-brand-50 to-orange-50 rounded-xl flex items-center justify-center shadow-sm">
                  <Bike className="w-4.5 h-4.5 text-brand" />
                </div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">As Rider</span>
              </div>
              <p className="text-2xl font-extrabold text-navy">{fmt.currency(stats.asRider?.totalEarned || 0)}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{stats.asRider?.deliveriesCompleted || 0} deliveries</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-navy text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-navy-400" />
              Recent Orders
            </h2>
            <Link href="/orders?role=client" className="text-sm text-brand font-bold flex items-center gap-1 hover:gap-2 transition-all group">
              View all <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {recentOrders.map((order, i) => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="card-hover active:scale-[0.99] animate-slide-up" style={{ animationDelay: `${450 + i * 80}ms` }}>
                  <CardContent className="py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-gradient-to-br from-brand-50 to-orange-50 rounded-xl flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-brand" />
                      </div>
                      <div>
                        <p className="font-bold text-navy text-sm">{order.itemName}</p>
                        <p className="text-xs text-gray-400 font-medium">{fmt.relative(order.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <StatusBadge status={order.status} />
                      <p className="text-xs font-bold text-navy-400 mt-1">{fmt.currency(order.totalAmount)}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {recentOrders.length === 0 && !loading && (
        <Card className="border-dashed border-2 border-gray-200 animate-fade-in">
          <CardContent className="py-14 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-50 to-brand-50/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-gray-300" />
            </div>
            <p className="font-bold text-gray-400 text-lg">No orders yet</p>
            <p className="text-sm text-gray-400 mt-1">Place your first order to get started!</p>
            <Link href="/orders/new"><Button className="mt-5" size="md">
              <Sparkles className="w-4 h-4" /> Place First Order
            </Button></Link>
          </CardContent>
        </Card>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-2 animate-slide-up" style={{ animationDelay: '500ms' }}>
        {[
          { href: '/vendors', icon: '🏪', label: 'Shops' },
          { href: '/complaints', icon: '📋', label: 'Complaints' },
          { href: '/profile', icon: '👤', label: 'Profile' },
        ].map((item, i) => (
          <Link key={item.href} href={item.href}>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center hover:border-brand/20 hover:shadow-md transition-all active:scale-95 group">
              <span className="text-2xl block group-hover:scale-110 transition-transform">{item.icon}</span>
              <p className="text-xs font-bold text-navy-600 mt-1.5">{item.label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
