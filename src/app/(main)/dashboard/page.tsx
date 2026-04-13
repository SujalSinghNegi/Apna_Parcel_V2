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
import { Package, ShoppingBag, Bike, Star, TrendingUp, ArrowRight, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<any>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])

  useEffect(() => {
    usersApi.stats().then(r => setStats(r.data.data)).catch(() => {})
    ordersApi.list('client', undefined, 1).then(r => setRecentOrders(r.data.data?.slice(0, 3) || [])).catch(() => {})
  }, [])

  if (!user) return null

  const limit = TRUST_LEVEL_LIMITS[user.trustLevel]

  return (
    <div className="page-container space-y-6">
      {/* Hero greeting */}
      <div className="bg-gradient-to-br from-navy to-navy-600 rounded-3xl p-6 text-white relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute -right-4 -bottom-12 w-56 h-56 bg-white/5 rounded-full" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <Avatar src={user.profilePhoto} name={user.name} size="lg" className="ring-2 ring-white/30" />
            <div>
              <p className="text-white/70 text-sm font-sans">Namaste,</p>
              <h1 className="text-xl font-display font-bold text-white">{user.name}</h1>
              <TrustBadge level={user.trustLevel} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-2">
            <div className="bg-white/10 rounded-2xl p-3 text-center">
              <p className="text-2xl font-display font-bold">{user.completedOrders}</p>
              <p className="text-xs text-white/70 font-sans">Orders</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 text-center">
              <p className="text-2xl font-display font-bold">{user.rating > 0 ? user.rating.toFixed(1) : '—'}</p>
              <p className="text-xs text-white/70 font-sans">Rating</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 text-center">
              <p className="text-2xl font-display font-bold">{limit === Infinity ? '∞' : `₹${limit}`}</p>
              <p className="text-xs text-white/70 font-sans">Order Limit</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/orders/new">
          <div className="bg-brand rounded-2xl p-5 text-white h-full flex flex-col gap-2 hover:bg-brand-500 transition-colors active:scale-95 shadow-md shadow-brand/25">
            <ShoppingBag className="w-6 h-6" />
            <div>
              <p className="font-display font-bold text-base">Order Now</p>
              <p className="text-xs text-white/80 font-sans">Need something from town?</p>
            </div>
          </div>
        </Link>
        <Link href="/rider">
          <div className="bg-navy rounded-2xl p-5 text-white h-full flex flex-col gap-2 hover:bg-navy-600 transition-colors active:scale-95">
            <Bike className="w-6 h-6" />
            <div>
              <p className="font-display font-bold text-base">Rider Mode</p>
              <p className="text-xs text-white/80 font-sans">Going to town? Earn!</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-xs font-semibold text-gray-500 font-display uppercase tracking-wide">As Client</span>
              </div>
              <p className="text-2xl font-display font-bold text-navy">{fmt.currency(stats.asClient?.totalSpent || 0)}</p>
              <p className="text-xs text-gray-500 font-sans">{stats.asClient?.ordersPlaced || 0} orders placed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center">
                  <Bike className="w-4 h-4 text-brand" />
                </div>
                <span className="text-xs font-semibold text-gray-500 font-display uppercase tracking-wide">As Rider</span>
              </div>
              <p className="text-2xl font-display font-bold text-navy">{fmt.currency(stats.asRider?.totalEarned || 0)}</p>
              <p className="text-xs text-gray-500 font-sans">{stats.asRider?.deliveriesCompleted || 0} deliveries</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-navy text-lg">Recent Orders</h2>
            <Link href="/orders?role=client" className="text-sm text-brand font-semibold font-display flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentOrders.map(order => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="hover:border-brand/30 transition-all active:scale-[0.99]">
                  <CardContent className="py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-brand" />
                      </div>
                      <div>
                        <p className="font-semibold font-display text-navy text-sm">{order.itemName}</p>
                        <p className="text-xs text-gray-500 font-sans">{fmt.relative(order.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <StatusBadge status={order.status} />
                      <p className="text-xs text-gray-500 mt-1">{fmt.currency(order.totalAmount)}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {recentOrders.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="font-display font-semibold text-gray-400">No orders yet</p>
            <p className="text-sm text-gray-400 font-sans mt-1">Place your first order to get started</p>
            <Link href="/orders/new"><Button className="mt-4" size="sm">Place Order</Button></Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
