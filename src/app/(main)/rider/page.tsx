'use client'
import { useEffect, useState, useMemo } from 'react'
import { useAuthStore } from '@/store/auth'
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { TrustBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { fmt, cn } from '@/lib/utils'
import { Order } from '@/types'
import { Bike, Package, Filter, MapPin, Weight, AlertCircle, Loader2, RefreshCw, Zap, Clock, IndianRupee } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

const SHOP_MODE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  SINGLE_SHOP: { label: 'Single', emoji: '🏪', color: 'bg-blue-50 text-blue-700' },
  MULTIPLE_SHOPS: { label: 'Multiple', emoji: '🏬', color: 'bg-purple-50 text-purple-700' },
  ENTIRE_AREA: { label: 'Area', emoji: '🗺️', color: 'bg-teal-50 text-teal-700' },
  URGENT: { label: 'Urgent', emoji: '⚡', color: 'bg-amber-50 text-amber-700' },
}

export default function RiderPage() {
  const router = useRouter()
  const { user } = useAuthStore() as any
  
  // We store all raw pending orders from Firebase here
  const [allPendingOrders, setAllPendingOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState('')
  const [showAccept, setShowAccept] = useState<Order | null>(null)
  const [etaMinutes, setEtaMinutes] = useState('60')
  const [filters, setFilters] = useState({ maxWeightKg: '', maxPrice: '', shopMode: '' })

  // ──🔥 REAL-TIME AVAILABLE ORDERS SYNC ────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;

    const ordersRef = collection(db, "orders");
    // We only query the status from Firebase to prevent complex Index Requirements.
    const q = query(ordersRef, where("status", "==", "PENDING"));

    const unsub = onSnapshot(q, (snapshot) => {
      let fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      // Sort newest first
      fetchedOrders.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });

      setAllPendingOrders(fetchedOrders);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid]);

  // Client-side filtering (Super fast, no Firebase indexes needed!)
  const displayOrders = useMemo(() => {
    return allPendingOrders.filter(o => {
      // Don't show the rider their own orders
      if (o.clientId === user?.uid) return false;
      
      if (filters.shopMode && o.shopMode !== filters.shopMode) return false;
      if (filters.maxPrice && (o.expectedPrice > parseFloat(filters.maxPrice))) return false;
      if (filters.maxWeightKg && (o.weightKg > parseFloat(filters.maxWeightKg))) return false;
      
      return true;
    });
  }, [allPendingOrders, filters, user?.uid]);

  // ──🔥 FIREBASE ACCEPT ORDER ──────────────────────────────────────────────
  const handleAccept = async () => {
    if (!showAccept) return
    const eta = parseInt(etaMinutes)
    if (!eta || eta < 10) { toast.error('Enter valid ETA (min 10 mins)'); return }
    
    setAccepting(showAccept.id)
    try {
      const orderRef = doc(db, "orders", showAccept.id);
      
      await updateDoc(orderRef, {
        status: 'ACCEPTED',
        riderId: user.uid,
        rider: {
          id: user.uid,
          name: user.name,
          profilePhoto: user.profilePhoto || '',
          trustLevel: user.trustLevel || 1,
          rating: user.rating || 0
        },
        declaredEtaMinutes: eta,
        updatedAt: serverTimestamp()
      });

      toast.success('Order accepted! Redirecting...');
      setShowAccept(null);
      // Auto-redirect the rider to the active order screen
      router.push(`/orders/${showAccept.id}`);
      
    } catch (e: any) { 
      toast.error(e.message || "Failed to accept order"); 
      setAccepting('');
    }
  }

  if (!user) return null
  const isRiderBanned = user.isRiderModePermanentlyBanned
  const isRiderSuspended = user.riderModeSuspendedUntil && new Date(user.riderModeSuspendedUntil) > new Date()

  return (
    <div className="page-container space-y-5 animate-fade-in pb-20">
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
              <p className="text-xl font-extrabold">{user.deliveriesCompleted || 0}</p>
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
                <select className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium focus:border-brand focus:outline-none transition-colors dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  value={filters.shopMode} onChange={e => setFilters(p => ({ ...p, shopMode: e.target.value }))}>
                  <option value="">All modes</option>
                  <option value="SINGLE_SHOP">Single Shop</option>
                  <option value="MULTIPLE_SHOPS">Multiple Shops</option>
                  <option value="ENTIRE_AREA">Entire Area</option>
                  <option value="URGENT">Urgent</option>
                </select>
                {/* Visual reset button for filters */}
                {(filters.maxPrice || filters.maxWeightKg || filters.shopMode) && (
                  <Button onClick={() => setFilters({ maxWeightKg: '', maxPrice: '', shopMode: '' })} size="sm" variant="secondary" className="shrink-0">
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Orders list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-extrabold text-navy dark:text-white text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Available Orders
              </h2>
              <div className="flex items-center gap-1.5 text-sm text-brand font-bold">
                 <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
                </span>
                Live
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-brand" />
                <p className="text-sm text-gray-400 font-medium">Connecting to network...</p>
              </div>
            ) : displayOrders.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-200 dark:border-gray-800">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="font-bold text-gray-400 text-lg">No orders nearby</p>
                  <p className="text-sm text-gray-400 mt-1">We will notify you when an order pops up.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {displayOrders.map(order => {
                  const modeInfo = SHOP_MODE_LABELS[order.shopMode] || { label: order.shopMode, emoji: '📦', color: 'bg-gray-50 text-gray-700' }
                  return (
                    <Card key={order.id} className="card-hover overflow-hidden">
                      <CardContent className="py-5">
                        <div className="flex items-start justify-between gap-2 mb-4">
                          <div>
                            <h3 className="font-extrabold text-navy dark:text-white text-base">{order.itemName}</h3>
                            {order.itemDescription && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{order.itemDescription}</p>}
                          </div>
                          <span className={cn('shrink-0 px-2.5 py-1 text-xs font-bold rounded-lg', modeInfo.color)}>
                            {modeInfo.emoji} {modeInfo.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                            <IndianRupee className="w-3.5 h-3.5 text-gray-400 mx-auto mb-1" />
                            <p className="text-sm font-extrabold text-navy dark:text-white">{fmt.currency(order.expectedPrice)}</p>
                            <p className="text-[10px] text-gray-400 font-medium">Item Cost</p>
                          </div>
                          <div className="bg-gradient-to-br from-brand-50 to-orange-50 dark:from-brand/20 dark:to-orange-500/10 rounded-xl p-3 text-center">
                            <Zap className="w-3.5 h-3.5 text-brand mx-auto mb-1" />
                            <p className="text-sm font-extrabold text-brand">{fmt.currency(order.deliveryFee + order.tip)}</p>
                            <p className="text-[10px] text-brand-600/70 dark:text-brand-400 font-medium">You Earn</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                            <Weight className="w-3.5 h-3.5 text-gray-400 mx-auto mb-1" />
                            <p className="text-sm font-extrabold text-navy dark:text-white">{order.weightKg}kg</p>
                            <p className="text-[10px] text-gray-400 font-medium">Weight</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar src={order.clientPhone} name={order.clientName || 'User'} size="sm" />
                            <div>
                              <p className="text-xs font-bold text-navy dark:text-white">{order.clientName}</p>
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
            <div className="flex items-center justify-between mt-6 mb-3">
              <h2 className="font-extrabold text-navy dark:text-white text-lg">My Active Deliveries</h2>
              <Link href="/orders?role=rider" className="text-sm text-brand font-bold hover:underline">View all</Link>
            </div>
          </div>
        </>
      )}

      {/* Accept Modal */}
      <Modal open={!!showAccept} onClose={() => setShowAccept(null)} title="Accept Order">
        {showAccept && (
          <div className="space-y-5">
            <div className="bg-gradient-to-br from-gray-50 to-stone-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-5">
              <h3 className="font-extrabold text-navy dark:text-white text-lg">{showAccept.itemName}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Client: <span className="font-semibold text-navy dark:text-white">{showAccept.clientName}</span></p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700">
                  <p className="text-[11px] text-gray-400 font-medium">You spend</p>
                  <p className="text-lg font-extrabold text-navy dark:text-white">{fmt.currency(showAccept.expectedPrice)}</p>
                </div>
                <div className="bg-gradient-to-br from-brand-50 to-orange-50 dark:from-brand/20 dark:to-orange-500/10 rounded-xl p-3 text-center border border-brand-100 dark:border-brand/30">
                  <p className="text-[11px] text-brand-600/70 dark:text-brand-400 font-medium">You earn</p>
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