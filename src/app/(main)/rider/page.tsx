'use client'
import { useEffect, useState, useCallback } from 'react'
import { ordersApi, getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { initSocket, EVENTS } from '@/lib/socket'
import { usePolling } from '@/hooks/usePolling'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { TrustBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { fmt, cn } from '@/lib/utils'
import { Order, TRUST_LEVEL_LIMITS } from '@/types'
import { Bike, Package, Filter, Star, MapPin, Weight, Store, AlertCircle, Loader2, RefreshCw, Zap, Clock, IndianRupee } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

const SHOP_MODE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  SINGLE_SHOP: { label: 'Single', emoji: '🏪', color: 'bg-blue-50 text-blue-700' },
  MULTIPLE_SHOPS: { label: 'Multiple', emoji: '🏬', color: 'bg-purple-50 text-purple-700' },
  ENTIRE_AREA: { label: 'Area', emoji: '🗺️', color: 'bg-teal-50 text-teal-700' },
  URGENT: { label: 'Urgent', emoji: '⚡', color: 'bg-amber-50 text-amber-700' },
}

export default function RiderPage() {
  const { user, accessToken } = useAuthStore() as any
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState('')
  const [showAccept, setShowAccept] = useState<Order | null>(null)
  const [etaMinutes, setEtaMinutes] = useState('60')
  const [filters, setFilters] = useState({ maxWeightKg: '', maxPrice: '', shopMode: '' })

  const fetchAvailable = useCallback(async () => {
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
  }, [filters])

  useEffect(() => { fetchAvailable() }, [fetchAvailable])

  // Poll for new available orders every 15s (riders need faster updates)
  usePolling(fetchAvailable, 15_000, !loading)

  // Real-time: refresh available orders when new orders or cancellations happen
  useEffect(() => {
    if (!accessToken) return
    const sock = initSocket(accessToken)

    const refresh = () => fetchAvailable()
    sock.on(EVENTS.NOTIFICATION, refresh)
    sock.on(EVENTS.ORDER_CANCELLED, refresh)

    return () => {
      sock.off(EVENTS.NOTIFICATION, refresh)
      sock.off(EVENTS.ORDER_CANCELLED, refresh)
    }
  }, [accessToken, fetchAvailable])

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
    <div className="page-container space-y-5 animate-fade-in">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-navy via-navy-800 to-navy-900 rounded-3xl p-6 text-white overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-brand/10 rounded-full blur-2xl" />
        <div className="absolute -left-8 -bottom-16 w-40 h-40 bg-white/5 rounded-full" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-brand/30 to-brand/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Bike className="w-6 h-6 text-brand-300" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold">Rider Mode</h1>
              <p className="text-white/60 text-sm font-medium">Earn while helping your peers!</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/10 rounded-2xl p-3">
            <Avatar src={user.profilePhoto} name={user.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{user.name}</p>
              <TrustBadge level={user.trustLevel} />
            </div>
            <div className="text-right">
              <p className="text-xl font-extrabold">{user.completedOrders}</p>
              <p className="text-[11px] text-white/50 font-medium">Deliveries</p>
            </div>
          </div>
        </div>
      </div>

      {/* Suspension warnings */}
      {isRiderBanned && (
        <Card className="border-red-200 dark:border-red-900/40 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-800">Rider Mode Disabled</p>
              <p className="text-xs text-red-600">Your rider mode has been permanently disabled due to repeated violations.</p>
            </div>
          </CardContent>
        </Card>
      )}
      {isRiderSuspended && !isRiderBanned && (
        <Card className="border-amber-200 dark:border-amber-900/40 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800">Temporarily Suspended</p>
              <p className="text-xs text-amber-600">
                Rider mode suspended until {fmt.date(user.riderModeSuspendedUntil!)}.
              </p>
            </div>
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
                <select className="rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm font-medium focus:border-brand focus:outline-none transition-colors"
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
              <h2 className="font-extrabold text-navy text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Available Orders
              </h2>
              <button onClick={fetchAvailable}
                className="flex items-center gap-1.5 text-sm text-brand font-bold hover:text-brand-600 transition-colors">
                <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-brand" />
                <p className="text-sm text-gray-400 font-medium">Finding orders near you...</p>
              </div>
            ) : orders.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-200">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="font-bold text-gray-400 text-lg">No orders available</p>
                  <p className="text-sm text-gray-400 mt-1">Check back in a few minutes</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {orders.map(order => {
                  const modeInfo = SHOP_MODE_LABELS[order.shopMode] || { label: order.shopMode, emoji: '📦', color: 'bg-gray-50 text-gray-700' }
                  return (
                    <Card key={order.id} className="card-hover overflow-hidden">
                      <CardContent className="py-5">
                        <div className="flex items-start justify-between gap-2 mb-4">
                          <div>
                            <h3 className="font-extrabold text-navy text-base">{order.itemName}</h3>
                            {order.itemDescription && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{order.itemDescription}</p>}
                          </div>
                          <span className={cn('shrink-0 px-2.5 py-1 text-xs font-bold rounded-lg', modeInfo.color)}>
                            {modeInfo.emoji} {modeInfo.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <div className="bg-gray-50 rounded-xl p-3 text-center">
                            <IndianRupee className="w-3.5 h-3.5 text-gray-400 mx-auto mb-1" />
                            <p className="text-sm font-extrabold text-navy">{fmt.currency(order.expectedPrice)}</p>
                            <p className="text-[10px] text-gray-400 font-medium">Item Cost</p>
                          </div>
                          <div className="bg-gradient-to-br from-brand-50 to-orange-50 rounded-xl p-3 text-center">
                            <Zap className="w-3.5 h-3.5 text-brand mx-auto mb-1" />
                            <p className="text-sm font-extrabold text-brand">{fmt.currency(order.deliveryFee + order.tip)}</p>
                            <p className="text-[10px] text-brand-600/70 font-medium">You Earn</p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-3 text-center">
                            <Weight className="w-3.5 h-3.5 text-gray-400 mx-auto mb-1" />
                            <p className="text-sm font-extrabold text-navy">{order.weightKg}kg</p>
                            <p className="text-[10px] text-gray-400 font-medium">Weight</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar src={order.client?.profilePhoto} name={order.client?.name || 'User'} size="sm" />
                            <div>
                              <p className="text-xs font-bold text-navy">{order.client?.name}</p>
                              <TrustBadge level={order.client?.trustLevel || 'LEVEL_1'} />
                            </div>
                          </div>
                          <Button size="sm" onClick={() => setShowAccept(order)}
                            className="shadow-md shadow-brand/20">
                            Accept Order
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* My active rider orders */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-extrabold text-navy text-lg">My Active Deliveries</h2>
              <Link href="/orders?role=rider" className="text-sm text-brand font-bold">View all</Link>
            </div>
          </div>
        </>
      )}

      {/* Accept Modal */}
      <Modal open={!!showAccept} onClose={() => setShowAccept(null)} title="Accept Order">
        {showAccept && (
          <div className="space-y-5">
            <div className="bg-gradient-to-br from-gray-50 to-stone-50 rounded-2xl p-5">
              <h3 className="font-extrabold text-navy text-lg">{showAccept.itemName}</h3>
              <p className="text-sm text-gray-600 mt-1">Client: <span className="font-semibold text-navy">{showAccept.client?.name}</span></p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
                  <p className="text-[11px] text-gray-400 font-medium">You spend</p>
                  <p className="text-lg font-extrabold text-navy">{fmt.currency(showAccept.expectedPrice)}</p>
                </div>
                <div className="bg-gradient-to-br from-brand-50 to-orange-50 rounded-xl p-3 text-center border border-brand-100">
                  <p className="text-[11px] text-brand-600/70 font-medium">You earn</p>
                  <p className="text-lg font-extrabold text-brand">{fmt.currency(showAccept.deliveryFee + showAccept.tip)}</p>
                </div>
              </div>
            </div>
            <Input label="Your ETA (minutes)" type="number" placeholder="60" value={etaMinutes}
              onChange={e => setEtaMinutes(e.target.value)} hint="How long until you deliver?" icon={<Clock className="w-4 h-4" />} />
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setShowAccept(null)}>Cancel</Button>
              <Button className="flex-1 shadow-lg shadow-brand/20" loading={!!accepting} onClick={handleAccept}>Accept Order</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
