'use client'
import { useEffect, useState } from 'react'
import { ordersApi, getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { TrustBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { fmt, cn } from '@/lib/utils'
import { Order, TRUST_LEVEL_LIMITS } from '@/types'
import { Bike, Package, Filter, Star, MapPin, Weight, Store, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

const SHOP_MODE_LABELS: Record<string, string> = {
  SINGLE_SHOP: '🏪 Single', MULTIPLE_SHOPS: '🏬 Multiple', ENTIRE_AREA: '🗺️ Area', URGENT: '⚡ Urgent'
}

export default function RiderPage() {
  const { user } = useAuthStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState('')
  const [showAccept, setShowAccept] = useState<Order | null>(null)
  const [etaMinutes, setEtaMinutes] = useState('60')
  const [filters, setFilters] = useState({ maxWeightKg: '', maxPrice: '', shopMode: '' })

  const fetchAvailable = async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = {}
      if (filters.maxWeightKg) params.maxWeightKg = parseFloat(filters.maxWeightKg)
      if (filters.maxPrice) params.maxPrice = parseFloat(filters.maxPrice)
      if (filters.shopMode) params.shopMode = filters.shopMode
      const { data } = await ordersApi.available(params)
      setOrders(data.data || [])
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAvailable() }, [])

  const handleAccept = async () => {
    if (!showAccept) return
    const eta = parseInt(etaMinutes)
    if (!eta || eta < 10) { toast.error('Enter valid ETA (min 10 mins)'); return }
    setAccepting(showAccept.id)
    try {
      await ordersApi.accept(showAccept.id, eta)
      toast.success('Order accepted! Wait for client payment.')
      setShowAccept(null)
      setOrders(p => p.filter(o => o.id !== showAccept.id))
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setAccepting('') }
  }

  if (!user) return null
  const isRiderBanned = user.isRiderModePermanentlyBanned
  const isRiderSuspended = user.riderModeSuspendedUntil && new Date(user.riderModeSuspendedUntil) > new Date()

  return (
    <div className="page-container space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-navy to-navy-600 rounded-3xl p-5 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold">Rider Mode</h1>
            <p className="text-white/70 text-sm font-sans">Going to town? Earn while helping others!</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Avatar src={user.profilePhoto} name={user.name} size="sm" />
          <div>
            <p className="font-semibold font-display text-sm">{user.name}</p>
            <TrustBadge level={user.trustLevel} />
          </div>
          <div className="ml-auto text-right">
            <p className="text-xl font-display font-bold">{user.completedOrders}</p>
            <p className="text-xs text-white/70 font-sans">Deliveries</p>
          </div>
        </div>
      </div>

      {/* Suspension warnings */}
      {isRiderBanned && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-sm text-red-800 font-sans">Your rider mode has been permanently disabled due to repeated violations.</p>
          </CardContent>
        </Card>
      )}
      {isRiderSuspended && !isRiderBanned && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 font-sans">
              Rider mode suspended until {fmt.date(user.riderModeSuspendedUntil!)}.
            </p>
          </CardContent>
        </Card>
      )}

      {!isRiderBanned && !isRiderSuspended && (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="py-3">
              <div className="flex gap-2 overflow-x-auto scrollbar-none">
                <Input className="min-w-[120px]" placeholder="Max price ₹" type="number"
                  value={filters.maxPrice} onChange={e => setFilters(p => ({ ...p, maxPrice: e.target.value }))} />
                <Input className="min-w-[100px]" placeholder="Max kg" type="number"
                  value={filters.maxWeightKg} onChange={e => setFilters(p => ({ ...p, maxWeightKg: e.target.value }))} />
                <select className="rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm font-sans focus:border-brand focus:outline-none"
                  value={filters.shopMode} onChange={e => setFilters(p => ({ ...p, shopMode: e.target.value }))}>
                  <option value="">All modes</option>
                  <option value="SINGLE_SHOP">Single Shop</option>
                  <option value="MULTIPLE_SHOPS">Multiple Shops</option>
                  <option value="ENTIRE_AREA">Entire Area</option>
                  <option value="URGENT">Urgent</option>
                </select>
                <Button onClick={fetchAvailable} size="sm" variant="secondary" className="shrink-0">
                  <Filter className="w-3.5 h-3.5" /> Apply
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Orders list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-navy">Available Orders</h2>
              <button onClick={fetchAvailable} className="text-sm text-brand font-semibold font-display">Refresh</button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>
            ) : orders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="font-display font-semibold text-gray-400">No orders available</p>
                  <p className="text-sm text-gray-400 font-sans mt-1">Check back in a few minutes</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <Card key={order.id} className="hover:border-brand/30 transition-all">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h3 className="font-display font-bold text-navy">{order.itemName}</h3>
                          {order.itemDescription && <p className="text-xs text-gray-500 font-sans mt-0.5 line-clamp-1">{order.itemDescription}</p>}
                        </div>
                        <span className="shrink-0 px-2 py-0.5 bg-navy text-white text-xs font-bold font-display rounded-full">
                          {SHOP_MODE_LABELS[order.shopMode]}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-gray-50 rounded-xl p-2 text-center">
                          <p className="text-xs text-gray-500 font-sans">Item</p>
                          <p className="text-sm font-bold font-display text-navy">{fmt.currency(order.expectedPrice)}</p>
                        </div>
                        <div className="bg-brand-50 rounded-xl p-2 text-center">
                          <p className="text-xs text-gray-500 font-sans">You earn</p>
                          <p className="text-sm font-bold font-display text-brand">{fmt.currency(order.deliveryFee + order.tip)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-2 text-center">
                          <p className="text-xs text-gray-500 font-sans">Weight</p>
                          <p className="text-sm font-bold font-display text-navy">{order.weightKg}kg</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar src={order.client.profilePhoto} name={order.client.name} size="sm" />
                          <div>
                            <p className="text-xs font-semibold font-display text-navy">{order.client.name}</p>
                            <TrustBadge level={order.client.trustLevel} />
                          </div>
                        </div>
                        <Button size="sm" onClick={() => setShowAccept(order)}>
                          Accept
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* My active rider orders */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-navy">My Active Deliveries</h2>
              <Link href="/orders?role=rider" className="text-sm text-brand font-semibold font-display">View all</Link>
            </div>
          </div>
        </>
      )}

      {/* Accept Modal */}
      <Modal open={!!showAccept} onClose={() => setShowAccept(null)} title="Accept Order">
        {showAccept && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-2xl p-4">
              <h3 className="font-display font-bold text-navy">{showAccept.itemName}</h3>
              <p className="text-sm text-gray-600 font-sans mt-1">Client: {showAccept.client.name}</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="text-center">
                  <p className="text-xs text-gray-500 font-sans">You spend</p>
                  <p className="font-display font-bold text-navy">{fmt.currency(showAccept.expectedPrice)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 font-sans">You earn</p>
                  <p className="font-display font-bold text-brand">{fmt.currency(showAccept.deliveryFee + showAccept.tip)}</p>
                </div>
              </div>
            </div>
            <Input label="Your ETA (minutes)" type="number" placeholder="60" value={etaMinutes}
              onChange={e => setEtaMinutes(e.target.value)} hint="How long until you deliver?" />
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setShowAccept(null)}>Cancel</Button>
              <Button className="flex-1" loading={!!accepting} onClick={handleAccept}>Accept Order</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
