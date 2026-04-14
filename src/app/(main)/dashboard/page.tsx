'use client'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { usersApi, ordersApi, getErrorMessage } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/Card'
import { TrustBadge, StatusBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { fmt, cn } from '@/lib/utils'
import { Order, TRUST_LEVEL_NAMES, TRUST_LEVEL_LIMITS } from '@/types'
import {
  Package, ShoppingBag, Bike, Star, TrendingUp, ArrowRight, ChevronRight,
  Sparkles, Wallet, Trophy, Clock, Bell
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<any>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      usersApi.stats().then(r => setStats(r.data.data)).catch(() => {}),
      ordersApi.list('client', undefined, 1).then(r => setRecentOrders(r.data.data?.slice(0, 3) || [])).catch(() => {})
    ]).finally(() => setLoading(false))
  }, [])

  if (!user) return null

  const limit = TRUST_LEVEL_LIMITS[user.trustLevel]
  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <div className="page-container space-y-6 animate-fade-in">
      {/* Hero greeting */}
      <div className="relative bg-gradient-to-br from-navy via-navy-800 to-navy-900 rounded-3xl p-6 sm:p-8 text-white overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-brand/10 rounded-full blur-2xl" />
        <div className="absolute -right-6 -bottom-16 w-64 h-64 bg-brand/5 rounded-full" />
        <div className="absolute left-1/2 -top-20 w-40 h-40 bg-white/5 rounded-full blur-xl" />

        <div className="relative">
          <div className="flex items-start sm:items-center gap-4 mb-6">
            <Avatar src={user.profilePhoto} name={user.name} size="lg" className="ring-3 ring-white/20 shadow-xl" />
            <div className="flex-1 min-w-0">
              <p className="text-white/60 text-sm font-medium">{greeting()} 👋</p>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white truncate">{user.name}</h1>
              <div className="mt-1.5">
                <TrustBadge level={user.trustLevel} />
              </div>
            </div>
            <Link href="/notifications" className="relative p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors shrink-0">
              <Bell className="w-5 h-5 text-white/80" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand rounded-full" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { value: user.completedOrders, label: 'Deliveries', icon: Package },
              { value: user.rating > 0 ? user.rating.toFixed(1) : '—', label: 'Rating', icon: Star },
              { value: limit === Infinity ? '∞' : `₹${limit}`, label: 'Order Limit', icon: Wallet },
            ].map((item, i) => (
              <div key={i} className="bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-2xl p-3.5 text-center transition-colors group">
                <item.icon className="w-4 h-4 text-white/50 mx-auto mb-1 group-hover:text-brand-300 transition-colors" />
                <p className="text-xl sm:text-2xl font-extrabold">{item.value}</p>
                <p className="text-[11px] text-white/50 font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/orders/new" className="group">
          <div className="relative bg-gradient-to-br from-brand to-brand-600 rounded-2xl p-5 text-white h-full flex flex-col gap-3 transition-all active:scale-[0.97] shadow-lg shadow-brand/20 hover:shadow-xl hover:shadow-brand/30 overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full group-hover:scale-125 transition-transform duration-500" />
            <div className="relative">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-1">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <p className="font-extrabold text-base">Order Now</p>
              <p className="text-xs text-white/70 font-medium">Need something from town?</p>
            </div>
            <ArrowRight className="w-4 h-4 ml-auto text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
        <Link href="/rider" className="group">
          <div className="relative bg-gradient-to-br from-navy-700 to-navy-900 rounded-2xl p-5 text-white h-full flex flex-col gap-3 transition-all active:scale-[0.97] shadow-lg overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full group-hover:scale-125 transition-transform duration-500" />
            <div className="relative">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-1">
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
          <Card className="card-hover">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 bg-gradient-to-br from-green-100 to-emerald-50 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-4.5 h-4.5 text-green-600" />
                </div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">As Client</span>
              </div>
              <p className="text-2xl font-extrabold text-navy">{fmt.currency(stats.asClient?.totalSpent || 0)}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{stats.asClient?.ordersPlaced || 0} orders placed</p>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 bg-gradient-to-br from-brand-50 to-orange-50 rounded-xl flex items-center justify-center">
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
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-navy text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-navy-400" />
              Recent Orders
            </h2>
            <Link href="/orders?role=client" className="text-sm text-brand font-bold flex items-center gap-1 hover:gap-2 transition-all">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {recentOrders.map((order, i) => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="card-hover active:scale-[0.99]" style={{ animationDelay: `${i * 100}ms` }}>
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
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="py-14 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-300" />
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
      <div className="grid grid-cols-3 gap-2">
        {[
          { href: '/vendors', icon: '🏪', label: 'Shops' },
          { href: '/complaints', icon: '📋', label: 'Complaints' },
          { href: '/profile', icon: '👤', label: 'Profile' },
        ].map(item => (
          <Link key={item.href} href={item.href}>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center hover:border-brand/20 hover:shadow-md transition-all active:scale-95">
              <span className="text-2xl">{item.icon}</span>
              <p className="text-xs font-bold text-navy-600 mt-1.5">{item.label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
