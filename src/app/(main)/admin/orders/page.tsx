'use client'
import { useEffect, useState } from 'react'
import { adminApi, getErrorMessage } from '@/lib/api'
import { Order } from '@/types'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/Badge'
import { fmt } from '@/lib/utils'
import { RefreshCw, Package, Loader2, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

const ALL_STATUSES = ['PENDING','ACCEPTED','RIDER_LEFT','AT_SHOP','ITEM_PURCHASED','PHOTO_APPROVED','DELIVERING','ARRIVED','DELIVERED','CANCELLED','DISPUTED','ITEM_NOT_FOUND']

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [acting, setActing] = useState('')

  const fetch = () => {
    setLoading(true)
    adminApi.orders({ status: status || undefined })
      .then(r => setOrders(r.data.data || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  const handleRefund = async (orderId: string) => {
    setActing(orderId)
    try { await adminApi.refund(orderId); toast.success('Refund initiated'); fetch() }
    catch (e) { toast.error(getErrorMessage(e)) }
    finally { setActing('') }
  }

  return (
    <div className="page-container max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-extrabold text-navy">Manage Orders</h1>

      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        <button onClick={() => { setStatus(''); fetch() }}
          className={`shrink-0 px-3.5 py-2 rounded-full text-sm font-bold transition-all ${!status ? 'bg-brand text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
          All
        </button>
        {ALL_STATUSES.map(s => (
          <button key={s} onClick={() => { setStatus(s); }}
            className={`shrink-0 px-3.5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${status === s ? 'bg-brand text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {s.replace(/_/g,' ')}
          </button>
        ))}
      </div>
      <Button size="sm" variant="secondary" onClick={fetch}><RefreshCw className="w-3.5 h-3.5" /> Refresh</Button>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>
      ) : (
        <div className="space-y-2">
          {orders.map(o => (
            <Card key={o.id}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-extrabold text-navy text-sm">{o.itemName}</p>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="text-xs text-gray-500">
                      {o.client?.name} → {o.rider?.name || 'No rider'} · {fmt.currency(o.totalAmount)} · {fmt.relative(o.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link href={`/orders/${o.id}`} target="_blank">
                      <Button size="sm" variant="ghost"><ExternalLink className="w-3.5 h-3.5" /></Button>
                    </Link>
                    {['DISPUTED','DELIVERED'].includes(o.status) && o.payment?.status === 'AUTHORIZED' && (
                      <Button size="sm" variant="outline" loading={acting === o.id} onClick={() => handleRefund(o.id)}>
                        Refund
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {orders.length === 0 && (
            <Card><CardContent className="py-12 text-center">
              <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">No orders found</p>
            </CardContent></Card>
          )}
        </div>
      )}
    </div>
  )
}
