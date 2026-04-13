'use client'
import { useEffect, useState } from 'react'
import { ordersApi } from '@/lib/api'
import { Order } from '@/types'
import { Card, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { fmt, cn } from '@/lib/utils'
import { Package, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function OrdersPage() {
  const sp = useSearchParams()
  const role = (sp.get('role') || 'client') as 'client' | 'rider'
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeRole, setActiveRole] = useState(role)

  useEffect(() => {
    setLoading(true)
    ordersApi.list(activeRole).then(r => setOrders(r.data.data || [])).finally(() => setLoading(false))
  }, [activeRole])

  return (
    <div className="page-container max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-display font-bold text-navy">My Orders</h1>
      <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
        {(['client', 'rider'] as const).map(r => (
          <button key={r} onClick={() => setActiveRole(r)}
            className={cn('flex-1 py-2 rounded-xl text-sm font-display font-semibold transition-all capitalize',
              activeRole === r ? 'bg-white text-navy shadow-sm' : 'text-gray-500')}>
            As {r}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>
      ) : orders.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-display font-semibold text-gray-400">No orders</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {orders.map(order => (
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
      )}
    </div>
  )
}
