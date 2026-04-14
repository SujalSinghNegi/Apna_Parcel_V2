'use client'
import { useEffect, useState, useCallback } from 'react'
import { ordersApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { initSocket, EVENTS } from '@/lib/socket'
import { Order } from '@/types'
import { Card, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { fmt, cn } from '@/lib/utils'
import { Package, Loader2, ShoppingBag, Bike, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function OrdersPage() {
  const sp = useSearchParams()
  const role = (sp.get('role') || 'client') as 'client' | 'rider'
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeRole, setActiveRole] = useState(role)
  const { accessToken } = useAuthStore() as any

  const fetchOrders = useCallback(() => {
    setLoading(true)
    ordersApi.list(activeRole).then(r => setOrders(r.data.data || [])).finally(() => setLoading(false))
  }, [activeRole])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // Real-time: refetch on any status change or new order events
  useEffect(() => {
    if (!accessToken) return
    const sock = initSocket(accessToken)

    const refresh = () => fetchOrders()
    sock.on(EVENTS.ORDER_STATUS, refresh)
    sock.on(EVENTS.ORDER_ACCEPTED, refresh)
    sock.on(EVENTS.RIDER_ARRIVED, refresh)
    sock.on(EVENTS.ORDER_DELIVERED, refresh)
    sock.on(EVENTS.ORDER_CANCELLED, refresh)
    sock.on(EVENTS.NOTIFICATION, refresh)

    return () => {
      sock.off(EVENTS.ORDER_STATUS, refresh)
      sock.off(EVENTS.ORDER_ACCEPTED, refresh)
      sock.off(EVENTS.RIDER_ARRIVED, refresh)
      sock.off(EVENTS.ORDER_DELIVERED, refresh)
      sock.off(EVENTS.ORDER_CANCELLED, refresh)
      sock.off(EVENTS.NOTIFICATION, refresh)
    }
  }, [accessToken, fetchOrders])

  return (
    <div className="page-container max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-navy">My Orders</h1>
        <p className="text-sm text-navy-400 mt-0.5">Track and manage all your orders</p>
      </div>

      {/* Role toggle */}
      <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
        {([
          { key: 'client' as const, label: 'As Client', icon: ShoppingBag },
          { key: 'rider' as const, label: 'As Rider', icon: Bike },
        ]).map(r => (
          <button key={r.key} onClick={() => setActiveRole(r.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all',
              activeRole === r.key
                ? 'bg-white text-navy shadow-sm shadow-gray-200/50'
                : 'text-gray-500 hover:text-gray-700'
            )}>
            <r.icon className="w-4 h-4" />
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <p className="text-sm text-gray-400 font-medium">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-bold text-gray-400 text-lg">No orders yet</p>
            <p className="text-sm text-gray-400 mt-1">
              {activeRole === 'client' ? 'Place your first order to see it here' : 'Accept a delivery to get started'}
            </p>
            <Link href={activeRole === 'client' ? '/orders/new' : '/rider'}
              className="inline-flex items-center gap-2 mt-4 text-sm font-bold text-brand hover:text-brand-600 transition-colors">
              {activeRole === 'client' ? 'Place an Order' : 'Browse Available Orders'} <ArrowRight className="w-4 h-4" />
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {orders.map((order, i) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card className="card-hover active:scale-[0.99]">
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
      )}
    </div>
  )
}
