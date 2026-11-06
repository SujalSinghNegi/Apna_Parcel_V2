'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import { db } from '@/lib/firebase'
import { initSocket, EVENTS } from '@/lib/socket'
import { usePolling } from '@/hooks/usePolling'
import { Order, ORDER_STATUS_LABELS, STATUS_COLORS } from '@/types'
import { fmt, cn } from '@/lib/utils'
import { Package, Loader2, ShoppingBag, Bike, ArrowRight, Clock, CheckCircle2, XCircle, MapPin, Truck } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { collection, getDocs, query, where } from 'firebase/firestore'

const ACTIVE_STATUSES = ['PENDING', 'ACCEPTED', 'PAID', 'RIDER_LEFT', 'AT_SHOP', 'ITEM_PURCHASED', 'PHOTO_APPROVED', 'DELIVERING', 'ARRIVED']

function getStatusIcon(status: string) {
  switch (status) {
    case 'PENDING': return <Clock className="w-4 h-4" />
    case 'ACCEPTED': case 'PAID': return <CheckCircle2 className="w-4 h-4" />
    case 'RIDER_LEFT': case 'DELIVERING': return <Truck className="w-4 h-4" />
    case 'AT_SHOP': case 'ITEM_PURCHASED': case 'PHOTO_APPROVED': return <Package className="w-4 h-4" />
    case 'ARRIVED': return <MapPin className="w-4 h-4" />
    case 'DELIVERED': return <CheckCircle2 className="w-4 h-4" />
    case 'CANCELLED': return <XCircle className="w-4 h-4" />
    default: return <Package className="w-4 h-4" />
  }
}

function OrderSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-gray-100 rounded" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
          <div className="space-y-2 items-end">
            <div className="h-5 w-16 bg-gray-100 rounded-full ml-auto" />
            <div className="h-3 w-12 bg-gray-100 rounded ml-auto" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function OrdersPage() {
  const sp = useSearchParams()
  const role = (sp.get('role') || 'client') as 'client' | 'rider'
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeRole, setActiveRole] = useState(role)
  const { user, accessToken } = useAuthStore() as any

  const fetchOrders = useCallback(async () => {
    const userId = user?.uid || user?.id
    if (!userId) {
      setOrders([])
      setLoading(false)
      return
    }

    try {
      const field = activeRole === 'client' ? 'clientId' : 'riderId'
      const snapshot = await getDocs(query(collection(db, 'orders'), where(field, '==', userId)))
      const fetchedOrders = snapshot.docs.map(orderDoc => {
        const data = orderDoc.data()
        const createdAt = data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt || new Date(0).toISOString()
        const updatedAt = data.updatedAt?.toDate
          ? data.updatedAt.toDate().toISOString()
          : data.updatedAt || createdAt

        return { id: orderDoc.id, ...data, createdAt, updatedAt } as Order
      })

      fetchedOrders.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      setOrders(fetchedOrders)
    } catch (error) {
      console.error('Orders fetch error:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [activeRole, user])

  useEffect(() => { setLoading(true); fetchOrders() }, [fetchOrders])

  usePolling(fetchOrders, 30_000, !loading)

  useEffect(() => {
    if (!accessToken) return
    const sock = initSocket(accessToken)
    const refresh = () => fetchOrders()
    ;[EVENTS.ORDER_STATUS, EVENTS.ORDER_ACCEPTED, EVENTS.RIDER_ARRIVED, EVENTS.ORDER_DELIVERED, EVENTS.ORDER_CANCELLED, EVENTS.NOTIFICATION].forEach(e => sock.on(e, refresh))
    return () => { [EVENTS.ORDER_STATUS, EVENTS.ORDER_ACCEPTED, EVENTS.RIDER_ARRIVED, EVENTS.ORDER_DELIVERED, EVENTS.ORDER_CANCELLED, EVENTS.NOTIFICATION].forEach(e => sock.off(e, refresh)) }
  }, [accessToken, fetchOrders])

  const activeOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.status))
  const pastOrders = orders.filter(o => !ACTIVE_STATUSES.includes(o.status))

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 pt-5 pb-3">
          <h1 className="text-xl font-extrabold text-navy">My Orders</h1>
        </div>
        {/* Role toggle */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {([
              { key: 'client' as const, label: 'As Client', icon: ShoppingBag },
              { key: 'rider' as const, label: 'As Rider', icon: Bike },
            ]).map(r => (
              <button key={r.key} onClick={() => setActiveRole(r.key)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all',
                  activeRole === r.key ? 'bg-white text-navy shadow-sm' : 'text-gray-400 hover:text-gray-600'
                )}>
                <r.icon className="w-4 h-4" />
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {loading ? (
          <OrderSkeleton />
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-gray-300" />
            </div>
            <p className="font-bold text-gray-400 text-lg">No orders yet</p>
            <p className="text-sm text-gray-400 mt-1">
              {activeRole === 'client' ? 'Place your first order to see it here' : 'Accept a delivery to get started'}
            </p>
            <Link href={activeRole === 'client' ? '/orders/new' : '/rider'}
              className="inline-flex items-center gap-2 mt-5 px-6 py-3 bg-brand text-white text-sm font-bold rounded-xl hover:bg-brand-600 transition-colors shadow-lg shadow-brand/20">
              {activeRole === 'client' ? 'Place an Order' : 'Browse Orders'} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            {/* Active Orders — highlighted banner-style */}
            {activeOrders.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Active ({activeOrders.length})</p>
                {activeOrders.map(order => (
                  <Link key={order.id} href={`/orders/${order.id}`}>
                    <div className="bg-white rounded-2xl border-2 border-brand/10 shadow-sm hover:shadow-md hover:border-brand/20 transition-all active:scale-[0.98] p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-brand-50 to-orange-50 rounded-xl flex items-center justify-center shrink-0">
                          <Package className="w-6 h-6 text-brand" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-navy truncate">{order.itemName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold', STATUS_COLORS[order.status])}>
                              {getStatusIcon(order.status)} {ORDER_STATUS_LABELS[order.status]}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-extrabold text-navy">{fmt.currency(order.totalAmount)}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{fmt.relative(order.createdAt)}</p>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(((ACTIVE_STATUSES.indexOf(order.status) + 1) / ACTIVE_STATUSES.length) * 100, 100)}%` }} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Past Orders */}
            {pastOrders.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Past Orders</p>
                {pastOrders.map(order => (
                  <Link key={order.id} href={`/orders/${order.id}`}>
                    <div className="bg-white rounded-2xl border border-gray-100 hover:border-gray-200 transition-all active:scale-[0.98] p-4 flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                        order.status === 'DELIVERED' ? 'bg-green-50' : 'bg-red-50')}>
                        {order.status === 'DELIVERED' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-navy text-sm truncate">{order.itemName}</p>
                        <p className="text-xs text-gray-400">{fmt.datetime(order.createdAt)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-navy">{fmt.currency(order.totalAmount)}</p>
                        <span className={cn('text-[11px] font-bold', order.status === 'DELIVERED' ? 'text-green-600' : 'text-red-500')}>
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
