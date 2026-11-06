'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { vendorsApi, getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { fmt, cn } from '@/lib/utils'
import { ShopMode, TRUST_LEVEL_LIMITS, VendorItem, Vendor, ItemRequest } from '@/types'
import { Package, MapPin, Store, ArrowLeft, Navigation, Search, Loader2, ShoppingBag, Clock, Timer, Check, X, Crown, Send, Users, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import type { LatLng } from '@/components/ui/MapPicker'

const MapPicker = dynamic(() => import('@/components/ui/MapPicker'), {
  ssr: false,
  loading: () => <div className="w-full h-[220px] rounded-xl bg-gray-100 animate-pulse flex items-center justify-center text-sm text-gray-400">Loading map…</div>,
})

const SHOP_MODES: { value: ShopMode; label: string; desc: string; fee: string; emoji: string }[] = [
  { value: 'SINGLE_SHOP', label: 'Single Shop', desc: 'One shop pickup', fee: 'Free', emoji: '🏪' },
  { value: 'MULTIPLE_SHOPS', label: 'Multiple Shops', desc: 'Check 2–3 shops', fee: '+₹15', emoji: '🏬' },
  { value: 'ENTIRE_AREA', label: 'Search Area', desc: 'All of Dwarahat', fee: '+₹25', emoji: '🗺️' },
  { value: 'URGENT', label: 'Urgent', desc: 'Priority delivery', fee: '2× fee', emoji: '⚡' },
]

const WEIGHT_OPTIONS = [
  { label: '< 1 kg', value: 0.5 },
  { label: '1 kg', value: 1 },
  { label: '2 kg', value: 2 },
  { label: '5 kg', value: 5 },
  { label: 'Custom', value: -1 },
]

const CAT_EMOJI: Record<string, string> = {
  GROCERY: '🛒', MEDICAL: '💊', FOOD: '🍱', UTENSILS: '🍽️', STATIONERY: '📚', OTHER: '📦'
}

export default function NewOrderPage() {
  const router = useRouter()
  const { user } = useAuthStore() as any
  const [loading, setLoading] = useState(false)
  
  // ── Multi-item state ──────────────────────────────────────────────────
  type OrderItem = { id: number; name: string; description: string; price: string; weightKg: string; vendorId: string; shopName: string; vendorItem: VendorItem | null }
  const [items, setItems] = useState<OrderItem[]>([{ id: 1, name: '', description: '', price: '', weightKg: '0.5', vendorId: '', shopName: '', vendorItem: null }])
  const [activeItemIdx, setActiveItemIdx] = useState(0)
  const activeItem = items[activeItemIdx] || items[0]

  const updateItem = (idx: number, patch: Partial<OrderItem>) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))
  }
  const addItem = () => {
    const newId = Math.max(...items.map(i => i.id)) + 1
    setItems(prev => [...prev, { id: newId, name: '', description: '', price: '', weightKg: '0.5', vendorId: '', shopName: '', vendorItem: null }])
    setActiveItemIdx(items.length)
    setSearchQuery('')
    setSearchResults([])
    setSelectedVendorItem(null)
    setShowSearch(false)
  }
  const removeItem = (idx: number) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== idx))
    if (activeItemIdx >= idx && activeItemIdx > 0) setActiveItemIdx(activeItemIdx - 1)
  }

  const [form, setForm] = useState({
    shopLocation: '',
    shopMode: 'SINGLE_SHOP' as ShopMode,
    tip: '0', declaredEtaMinutes: '', itemRequestId: '',
  })
  const [shopCoords, setShopCoords] = useState<LatLng | null>(null)
  const [clientCoords, setClientCoords] = useState<LatLng | null>(null)
  const [clientAddress, setClientAddress] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [searchingShop, setSearchingShop] = useState(false)
  const [selectedWeightOption, setSelectedWeightOption] = useState(0) // index
  const [customWeight, setCustomWeight] = useState(false)

  // ── Item search state ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<VendorItem[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [selectedVendorItem, setSelectedVendorItem] = useState<VendorItem | null>(null)
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)

  // ── Item request state ──────────────────────────────────────────────────
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestForm, setRequestForm] = useState({ vendorId: '', itemName: '', description: '', maxPrice: '', timerMinutes: '2' })
  const [requestLoading, setRequestLoading] = useState(false)
  const [myRequests, setMyRequests] = useState<ItemRequest[]>([])
  const [showMyRequests, setShowMyRequests] = useState(false)

  // ── Order placed searching overlay ──────────────────────────────────────
  const [searchingOverlay, setSearchingOverlay] = useState<{ show: boolean; orderId: string; shopMode: ShopMode; shopName: string; step: number }>({ show: false, orderId: '', shopMode: 'SINGLE_SHOP', shopName: '', step: 0 })
  const [broadcastLoading, setBroadcastLoading] = useState(false)
  const [countdownTick, setCountdownTick] = useState(0) // force re-render for timers

  const setF = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const haversine = (a: LatLng, b: LatLng) => {
    const R = 6371, toRad = (d: number) => d * Math.PI / 180
    const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng)
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  }

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
      const data = await res.json()
      return data.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    } catch { return `${lat.toFixed(4)}, ${lng.toFixed(4)}` }
  }

  const geocodeSearch = async (query: string) => {
    if (!query.trim()) return
    setSearchingShop(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`)
      const data = await res.json()
      if (data.length > 0) {
        const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
        setShopCoords(coords)
        setF('shopLocation', data[0].display_name?.split(',').slice(0, 3).join(',') || query)
      } else toast.error('Location not found')
    } catch { toast.error('Search failed') }
    finally { setSearchingShop(false) }
  }

  const handleShopPinChange = useCallback(async (coords: LatLng) => {
    setShopCoords(coords)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json`)
      const data = await res.json()
      const addr = data.display_name?.split(',').slice(0, 3).join(',') || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
      setF('shopLocation', addr)
    } catch { setF('shopLocation', `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`) }
  }, [])

  const detectMyLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setClientCoords(coords)
        const addr = await reverseGeocode(coords.lat, coords.lng)
        setClientAddress(addr)
        setGpsLoading(false)
      },
      (err) => { toast.error('Could not get location: ' + err.message); setGpsLoading(false) },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  // ── Item search across vendors (Stubbed for now) ──────────────────────
  const searchItems = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return }
    setSearchLoading(true)
    try {
      const { data } = await vendorsApi.searchItems(q)
      setSearchResults(data.data || [])
    } catch { /* ignore */ }
    finally { setSearchLoading(false) }
  }, [])

  const handleSearchInput = (val: string) => {
    setSearchQuery(val)
    updateItem(activeItemIdx, { name: val })
    if (val.length >= 2) setShowSearch(true)
    else setShowSearch(false)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => searchItems(val), 300)
  }

  const [availabilityStatus, setAvailabilityStatus] = useState<'idle' | 'checking' | 'confirmed' | 'declined' | 'expired'>('idle')
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null)

  const selectVendorItem = async (item: VendorItem) => {
    setSelectedVendorItem(item)
    updateItem(activeItemIdx, {
      name: item.name,
      price: String(item.price),
      weightKg: String(item.weightKg || 0.5),
      shopName: item.vendor?.shopName || '',
      vendorId: item.vendorId,
      vendorItem: item,
    })
    if (item.vendor?.locationName) setF('shopLocation', item.vendor.locationName)
    const matchIdx = WEIGHT_OPTIONS.findIndex(o => o.value === item.weightKg)
    if (matchIdx >= 0) { setSelectedWeightOption(matchIdx); setCustomWeight(false) }
    else { setSelectedWeightOption(WEIGHT_OPTIONS.length - 1); setCustomWeight(true) }
    if (item.vendor?.locationLat && item.vendor?.locationLng) {
      setShopCoords({ lat: item.vendor.locationLat, lng: item.vendor.locationLng })
    }
    setSearchQuery(item.name)
    setShowSearch(false)
    toast.success(`Added from ${item.vendor?.shopName}`)
  }

  const clearVendorSelection = () => {
    setSelectedVendorItem(null)
    updateItem(activeItemIdx, { vendorId: '', shopName: '', price: '', weightKg: '0.5', vendorItem: null })
    setSelectedWeightOption(0)
    setCustomWeight(false)
    setAvailabilityStatus('idle')
    setActiveRequestId(null)
  }

  const handleCancelRequest = async (requestId: string) => {
    try {
      await vendorsApi.cancelRequest(requestId)
      toast.success('Request cancelled')
      if (requestId === activeRequestId) {
        setAvailabilityStatus('idle')
        setActiveRequestId(null)
      }
      fetchMyRequests()
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const handleDeleteRequest = async (requestId: string) => {
    try {
      await vendorsApi.deleteRequest(requestId)
      toast.success('Request deleted')
      if (requestId === activeRequestId) {
        setAvailabilityStatus('idle')
        setActiveRequestId(null)
      }
      fetchMyRequests()
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  // ── Item request (ask vendor if they have it) ────────────────────────────
  const [allVendors, setAllVendors] = useState<Vendor[]>([])
  const fetchMyRequests = async () => {
    try {
      const { data } = await vendorsApi.myRequests()
      const all: ItemRequest[] = data.data || []
      const cutoff = Date.now() - 24 * 60 * 60 * 1000
      setMyRequests(all.filter(r => r.status !== 'CANCELLED' && new Date(r.createdAt).getTime() > cutoff))
    } catch { /* ignore */ }
  }

  const fetchAllVendors = async () => {
    try {
      const { data } = await vendorsApi.list()
      setAllVendors(data.data || [])
    } catch { /* ignore */ }
  }

  const sendRequest = async () => {
    if (!requestForm.vendorId || !requestForm.itemName) { toast.error('Select a vendor and enter item name'); return }
    setRequestLoading(true)
    try {
      await vendorsApi.createRequest({
        vendorId: requestForm.vendorId,
        itemName: requestForm.itemName,
        description: requestForm.description || undefined,
        maxPrice: requestForm.maxPrice ? parseFloat(requestForm.maxPrice) : undefined,
        timerMinutes: parseInt(requestForm.timerMinutes) || 2,
      })
      toast.success('Request sent to vendor! You\'ll be notified when they respond.')
      setShowRequestModal(false)
      const reqs = await vendorsApi.myRequests()
      const all: ItemRequest[] = reqs.data.data || []
      const cutoff = Date.now() - 24 * 60 * 60 * 1000
      const latestRequests = all.filter(r => r.status !== 'CANCELLED' && new Date(r.createdAt).getTime() > cutoff)
      setMyRequests(latestRequests)
      const latest = latestRequests.find(r => r.status === 'PENDING' && r.itemName === requestForm.itemName && r.vendorId === requestForm.vendorId)
      if (latest) {
        setActiveRequestId(latest.id)
        setAvailabilityStatus('checking')
      }
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setRequestLoading(false) }
  }

  useEffect(() => {
    fetchMyRequests()
    fetchAllVendors()
    const interval = setInterval(fetchMyRequests, availabilityStatus === 'checking' ? 3000 : 15000)
    return () => clearInterval(interval)
  }, [availabilityStatus])

  useEffect(() => {
    const hasPending = myRequests.some(r => r.status === 'PENDING')
    if (!hasPending) return
    const interval = setInterval(() => setCountdownTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [myRequests])

  useEffect(() => {
    if (!activeRequestId || availabilityStatus !== 'checking') return
    const req = myRequests.find(r => r.id === activeRequestId)
    if (!req) return
    if (req.status === 'ACCEPTED') {
      setAvailabilityStatus('confirmed')
      const vendorPrice = req.vendorPrice || req.maxPrice || 0
      updateItem(activeItemIdx, {
        name: req.itemName,
        price: String(vendorPrice),
        vendorId: req.vendorId,
        shopName: req.vendor?.shopName || '',
      })
      setF('itemRequestId', req.id)
      if (req.vendor?.locationName) setF('shopLocation', req.vendor.locationName)
      if (req.vendor?.locationLat && req.vendor?.locationLng) {
        setShopCoords({ lat: req.vendor.locationLat, lng: req.vendor.locationLng })
      }
      toast.success(`${req.vendor?.shopName || 'Vendor'} confirmed availability!`)
    } else if (req.status === 'REJECTED') {
      setAvailabilityStatus('declined')
      toast.error(`${req.vendor?.shopName || 'Vendor'} says item is not available`)
    } else if (req.status === 'PENDING' && new Date(req.expiresAt) < new Date()) {
      setAvailabilityStatus('expired')
    }
  }, [myRequests, activeRequestId, availabilityStatus])

  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return { expired: true, minutes: 0, seconds: 0, text: 'Expired' }
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    return { expired: false, minutes, seconds, text: `${minutes}:${String(seconds).padStart(2, '0')}` }
  }

  const handleBroadcastRequest = async (requestId: string) => {
    setBroadcastLoading(true)
    try {
      await vendorsApi.broadcastRequest(requestId)
      toast.success('Request sent to all vendors!')
      fetchMyRequests()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setBroadcastLoading(false) }
  }

  const handleLetRiderDecide = (req: ItemRequest) => {
    setForm(p => ({
      ...p,
      itemName: req.itemName,
      expectedPrice: String(req.maxPrice || ''),
      shopMode: 'ENTIRE_AREA',
      vendorId: '',
      itemRequestId: '',
      shopName: '',
      shopLocation: '',
    }))
    setSelectedVendorItem(null)
    setAvailabilityStatus('idle')
    setActiveRequestId(null)
    toast.success('Switched to "Search Area" mode — rider will find the item (+₹25)')
  }

  const totalItemPrice = items.reduce((s, it) => s + (parseFloat(it.price) || 0), 0)
  const totalWeight = items.reduce((s, it) => s + (parseFloat(it.weightKg) || 0), 0)
  const price = totalItemPrice
  const weight = totalWeight
  const dist = (shopCoords && clientCoords) ? Math.round(haversine(shopCoords, clientCoords) * 10) / 10 : 0
  const tip = parseFloat(form.tip) || 0
  const modeFees: Record<ShopMode, number> = { SINGLE_SHOP: 0, MULTIPLE_SHOPS: 15, ENTIRE_AREA: 25, URGENT: 0 }
  const baseFee = 10, weightFee = weight * 5, distFee = dist * 2, modeFee = modeFees[form.shopMode]
  let deliveryFee = baseFee + weightFee + distFee + modeFee
  if (form.shopMode === 'URGENT') deliveryFee = deliveryFee * 2
  const platformFee = Math.min(price * 0.08, 50)
  const total = price + deliveryFee + platformFee + tip
  
  // Safe limits check
  const levelKey = user ? `LEVEL_${user.trustLevel}` as keyof typeof TRUST_LEVEL_LIMITS : 'LEVEL_1';
  const limit = TRUST_LEVEL_LIMITS ? TRUST_LEVEL_LIMITS[levelKey as keyof typeof TRUST_LEVEL_LIMITS] : 500;

  // ──🔥 FIREBASE DIRECT SUBMIT ──────────────────────────────────────────────
  const handleSubmit = async () => {
    const actualUserId = user?.uid || user?.id;
    if (!actualUserId) {
    toast.error("Session error. Please log out and log back in.");
    return;
  }
    const validItems = items.filter(it => it.name.trim())
    if (validItems.length === 0) { toast.error('Add at least one item'); return }
    if (price <= 0) { toast.error('Enter expected price for items'); return }
    if (price > limit) { toast.error(`Your trust level allows max ₹${limit === Infinity ? '∞' : limit}`); return }
    if (!clientCoords) { toast.error('Please select your current location'); return }
    
    setLoading(true)
    try {
      const itemNameStr = validItems.map(it => it.name).join(', ')
      const itemDescStr = validItems.map(it => it.description).filter(Boolean).join('; ') || ''
      const shopNameStr = validItems.map(it => it.shopName).filter(Boolean).join(', ') || ''
      const vendorId = validItems[0]?.vendorId || null

      // Build the Firestore Document
      const orderPayload = {
        clientId: user.uid,
        clientName: user.name,
        clientPhone: user.phone || '',
        clientAddress: clientAddress || '',
        clientLat: clientCoords.lat,
        clientLng: clientCoords.lng,
        shopLocation: form.shopLocation || '',
        shopLat: shopCoords?.lat || null,
        shopLng: shopCoords?.lng || null,
        shopName: shopNameStr,
        itemName: itemNameStr,
        itemDescription: itemDescStr,
        items: validItems, // Saving the full array for rich detailed views later!
        shopMode: form.shopMode,
        expectedPrice: price,
        deliveryFee,
        platformFee,
        tip,
        totalAmount: total,
        weightKg: weight,
        distanceKm: dist,
        vendorId,
        status: 'PENDING',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      // 1. Push to Firestore directly
      const docRef = await addDoc(collection(db, 'orders'), orderPayload)

      // 2. Trigger the cool searching overlay!
      setSearchingOverlay({ 
        show: true, 
        orderId: docRef.id, 
        shopMode: form.shopMode, 
        shopName: shopNameStr, 
        step: 0 
      })
      
      setLoading(false)
    } catch (e: any) { 
      toast.error(e.message || "Failed to create order"); 
      setLoading(false) 
    }
  }

  // Animate searching steps
  useEffect(() => {
    if (!searchingOverlay.show) return
    const steps = [0, 1, 2, 3]
    let current = 0
    const timer = setInterval(() => {
      current++
      if (current >= steps.length) {
        clearInterval(timer)
        router.push(`/orders/${searchingOverlay.orderId}`)
        return
      }
      setSearchingOverlay(p => ({ ...p, step: current }))
    }, 1200)
    return () => clearInterval(timer)
  }, [searchingOverlay.show])

  const acceptedRequests = myRequests.filter(r => r.status === 'ACCEPTED')
  const pendingRequests = myRequests.filter(r => r.status === 'PENDING')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20 md:pb-4">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-navy dark:hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-extrabold text-navy dark:text-white">New Order</h1>
          {myRequests.filter(r => r.status === 'PENDING').length > 0 && (
            <button onClick={() => setShowMyRequests(true)} className="ml-auto flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-full">
              <Timer className="w-3 h-3" /> {myRequests.filter(r => r.status === 'PENDING').length} pending
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">

        {/* ── Vendor Status & Requests ─────────────────────────────────────── */}
        {(selectedVendorItem || activeRequestId || pendingRequests.length > 0) && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 space-y-3">
          <h2 className="font-bold text-navy dark:text-white text-sm flex items-center gap-2">
            <Search className="w-4 h-4 text-brand" /> Vendor Status
            <button onClick={() => setShowRequestModal(true)}
              className="ml-auto text-[11px] font-bold text-brand hover:underline flex items-center gap-1">
              <Send className="w-3 h-3" /> Request Item
            </button>
          </h2>

          {/* Selected vendor item badge with availability status */}
          {selectedVendorItem && (
            <div className="space-y-2">
              <div className={cn('flex items-center gap-2 rounded-xl px-3 py-2',
                availabilityStatus === 'confirmed' ? 'bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30' :
                availabilityStatus === 'declined' || availabilityStatus === 'expired' ? 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30' :
                availabilityStatus === 'checking' ? 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30' :
                'bg-brand-50 dark:bg-brand/10')}>
                <div className="text-lg">{CAT_EMOJI[selectedVendorItem.vendor?.category || ''] || '📦'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-brand">{selectedVendorItem.name}</p>
                  <p className="text-[10px] text-gray-500">{selectedVendorItem.vendor?.shopName}</p>
                  {availabilityStatus === 'checking' && (
                    <p className="text-[10px] text-amber-600 font-bold flex items-center gap-1 mt-0.5">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" /> Checking availability...
                    </p>
                  )}
                  {availabilityStatus === 'confirmed' && (
                    <p className="text-[10px] text-green-600 font-bold flex items-center gap-1 mt-0.5">
                      <Check className="w-2.5 h-2.5" /> Available — ready to order!
                    </p>
                  )}
                  {availabilityStatus === 'declined' && (
                    <p className="text-[10px] text-red-600 font-bold mt-0.5">Not available at this shop</p>
                  )}
                  {availabilityStatus === 'expired' && (
                    <p className="text-[10px] text-red-600 font-bold mt-0.5">Vendor did not respond</p>
                  )}
                </div>
                <p className="text-sm font-bold text-brand">{fmt.currency(selectedVendorItem.price)}</p>
                <button onClick={clearVendorSelection} className="p-1 rounded-lg hover:bg-brand/10 transition-colors">
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>

              {/* Fallback options when item is not available or vendor didn't respond */}
              {(availabilityStatus === 'declined' || availabilityStatus === 'expired') && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-bold text-navy dark:text-white">
                    {availabilityStatus === 'declined' ? 'Item not available here. What would you like to do?' : 'No response from vendor. Try:'}
                  </p>
                  <div className="flex gap-2">
                    {activeRequestId && (
                      <button onClick={() => handleBroadcastRequest(activeRequestId)} disabled={broadcastLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand/90 transition-colors disabled:opacity-50">
                        {broadcastLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        Search all vendors
                      </button>
                    )}
                    <button onClick={() => {
                      const req = myRequests.find(r => r.id === activeRequestId)
                      if (req) handleLetRiderDecide(req)
                      else {
                        setForm(p => ({ ...p, shopMode: 'ENTIRE_AREA', vendorId: '', shopName: '', shopLocation: '' }))
                        setSelectedVendorItem(null)
                        setAvailabilityStatus('idle')
                        setActiveRequestId(null)
                        toast.success('Switched to "Search Area" — rider will find it (+₹25)')
                      }
                    }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gray-800 dark:bg-gray-700 text-white text-xs font-bold hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                      <Users className="w-3 h-3" />
                      Let rider decide
                    </button>
                  </div>
                </div>
              )}

              {/* Checking availability timer */}
              {availabilityStatus === 'checking' && activeRequestId && (() => {
                const req = myRequests.find(r => r.id === activeRequestId)
                if (!req) return null
                const remaining = getTimeRemaining(req.expiresAt)
                return (
                  <div className="flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl px-3 py-2">
                    <Timer className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                    <span className={cn('text-xs font-bold tabular-nums', remaining.minutes < 1 ? 'text-red-600' : 'text-amber-700 dark:text-amber-400')}>
                      Waiting for response: {remaining.text}
                    </span>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Accepted requests that can auto-fill */}
          {activeRequestId && acceptedRequests.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-bold text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> Accepted by vendor</p>
              {acceptedRequests.map(req => (
                <button key={req.id} onClick={() => {
                  updateItem(activeItemIdx, {
                    name: req.itemName,
                    price: String(req.vendorPrice || ''),
                    vendorId: req.vendorId,
                    shopName: req.vendor?.shopName || '',
                  })
                  setF('itemRequestId', req.id)
                  if (req.vendor?.locationName) setF('shopLocation', req.vendor.locationName)
                  if (req.vendor?.locationLat && req.vendor?.locationLng) {
                    setShopCoords({ lat: req.vendor.locationLat, lng: req.vendor.locationLng })
                  }
                  setSearchQuery(req.itemName)
                  toast.success(`Auto-filled from ${req.vendor?.shopName}`)
                }}
                  className="w-full flex items-center gap-3 p-2.5 bg-green-50 dark:bg-green-500/10 rounded-xl text-left hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors">
                  <Check className="w-4 h-4 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-green-700 dark:text-green-400">{req.itemName}</p>
                    <p className="text-[10px] text-gray-500">{req.vendor?.shopName} · {req.vendorDescription || ''}</p>
                  </div>
                  <p className="text-sm font-bold text-green-700 dark:text-green-400">{fmt.currency(req.vendorPrice || 0)}</p>
                </button>
              ))}
            </div>
          )}

          {/* Pending requests with countdown timer */}
          {pendingRequests.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-amber-600 flex items-center gap-1"><Timer className="w-3 h-3" /> Waiting for vendor response</p>
              {pendingRequests.map(req => {
                const remaining = getTimeRemaining(req.expiresAt)
                return (
                  <div key={req.id} className="p-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-navy dark:text-white">{req.itemName}</p>
                        <p className="text-[10px] text-gray-500">{req.vendor?.shopName}</p>
                      </div>
                      {!remaining.expired ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 bg-amber-100 dark:bg-amber-500/20 px-2.5 py-1 rounded-full">
                            <Timer className="w-3 h-3 text-amber-600 animate-pulse" />
                            <span className={cn('text-xs font-bold tabular-nums', remaining.minutes < 1 ? 'text-red-600' : 'text-amber-700 dark:text-amber-400')}>
                              {remaining.text}
                            </span>
                          </div>
                          <button onClick={() => handleCancelRequest(req.id)} className="text-[10px] font-bold text-red-500 hover:text-red-700 px-2 py-1 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full">Timed out</span>
                      )}
                    </div>
                    {/* Show fallback options when expired */}
                    {remaining.expired && (
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => handleBroadcastRequest(req.id)} disabled={broadcastLoading}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand/90 transition-colors disabled:opacity-50">
                          {broadcastLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          Send to all vendors
                        </button>
                        <button onClick={() => handleLetRiderDecide(req)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gray-800 dark:bg-gray-700 text-white text-xs font-bold hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                          <Users className="w-3 h-3" />
                          Let rider decide
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        )}

        {/* Item Details */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-navy dark:text-white text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-brand" /> Items ({items.length})
            </h2>
            <button onClick={addItem} className="flex items-center gap-1 text-xs font-bold text-brand hover:text-brand/80 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add item
            </button>
          </div>

          {/* Item tabs */}
          {items.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {items.map((it, idx) => (
                <button key={it.id} onClick={() => { setActiveItemIdx(idx); setSearchQuery(it.name); setSelectedVendorItem(it.vendorItem) }}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all',
                    activeItemIdx === idx ? 'border-brand bg-brand text-white' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-brand/50')}>
                  {it.name || `Item ${idx + 1}`}
                  {items.length > 1 && (
                    <span onClick={e => { e.stopPropagation(); removeItem(idx) }} className="hover:text-red-300 ml-0.5"><X className="w-3 h-3" /></span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <Input placeholder="e.g. Rice 2kg, Medicines, Notebook..." value={activeItem.name}
              onChange={e => { handleSearchInput(e.target.value) }}
              onFocus={() => activeItem.name.length >= 2 && setShowSearch(true)}
              disabled={!!activeItem.vendorItem}
              icon={searchLoading ? <Loader2 className="w-4 h-4 animate-spin text-brand" /> : <Search className="w-4 h-4" />} />
            {/* Inline search results */}
            {showSearch && !activeItem.vendorItem && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
                {searchLoading ? (
                  <div className="flex items-center justify-center gap-2 p-4">
                    <Loader2 className="w-4 h-4 animate-spin text-brand" />
                    <span className="text-xs text-gray-500">Searching shops...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                  {searchResults.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <button onClick={() => selectVendorItem(item)} className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
                      {item.photoUrl ? (
                        <img src={item.photoUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-lg shrink-0">
                          {item.vendor?.category ? CAT_EMOJI[item.vendor.category] || '📦' : '📦'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-navy dark:text-white text-sm truncate">{item.name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{item.vendor?.shopName}</p>
                      </div>
                      <p className="font-bold text-brand text-sm shrink-0">{fmt.currency(item.price)}</p>
                    </button>
                    <button onClick={() => {
                      setRequestForm({ vendorId: item.vendorId, itemName: item.name, description: '', maxPrice: String(item.price), timerMinutes: '2' })
                      setShowSearch(false)
                      setShowRequestModal(true)
                      fetchAllVendors()
                    }}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors border border-amber-200 dark:border-amber-500/30">
                      <Clock className="w-3 h-3" /> Check Availability
                    </button>
                  </div>
                  ))}
                  </>
                ) : (
                  <div className="p-4 text-center space-y-3">
                    <p className="text-xs text-gray-400">No items found for &quot;{activeItem.name}&quot;</p>
                    <p className="text-[10px] text-gray-400">Item not in our database yet — ask vendors directly!</p>
                    <button onClick={() => {
                      setRequestForm(p => ({ ...p, itemName: activeItem.name, vendorId: '', description: '', maxPrice: '', timerMinutes: '2' }))
                      setShowSearch(false)
                      setShowRequestModal(true)
                      fetchAllVendors()
                    }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand/90 transition-colors">
                      <Send className="w-3.5 h-3.5" /> Search Among Vendors
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <textarea className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10 resize-none transition-all bg-gray-50 dark:bg-gray-800 dark:text-white"
            rows={2} placeholder="Brand, size, color, or any specific details (optional)"
            value={activeItem.description} onChange={e => updateItem(activeItemIdx, { description: e.target.value })} />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Expected Price (₹)" type="number" placeholder="200" value={activeItem.price}
              onChange={e => updateItem(activeItemIdx, { price: e.target.value })}
              hint={`Limit: ₹${limit === Infinity ? '∞' : limit}`}
              disabled={!!activeItem.vendorItem} />

            {/* Weight Dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Weight {activeItem.vendorItem ? <span className="text-brand">(locked)</span> : null}</label>
              <div className="flex flex-wrap gap-1.5">
                {WEIGHT_OPTIONS.map((opt, i) => (
                  <button key={i} disabled={!!activeItem.vendorItem} onClick={() => {
                    setSelectedWeightOption(i)
                    if (opt.value === -1) { setCustomWeight(true) }
                    else { setCustomWeight(false); updateItem(activeItemIdx, { weightKg: String(opt.value) }) }
                  }}
                    className={cn('px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all',
                      selectedWeightOption === i ? 'border-brand bg-brand text-white' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-brand/50',
                      activeItem.vendorItem && 'opacity-60 cursor-not-allowed')}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {customWeight && (
                <Input type="number" placeholder="Enter kg" value={activeItem.weightKg} onChange={e => updateItem(activeItemIdx, { weightKg: e.target.value })} hint="+₹5/kg" disabled={!!activeItem.vendorItem} />
              )}
              {!customWeight && <p className="text-[10px] text-gray-400 mt-0.5">+₹5/kg</p>}
            </div>
          </div>
        </div>

        {/* Shop Details */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 space-y-4">
          <h2 className="font-bold text-navy dark:text-white text-sm flex items-center gap-2">
            <Store className="w-4 h-4 text-brand" /> Shop Info
          </h2>
          <Input placeholder="Shop name (optional)" value={items.map(it => it.shopName).filter(Boolean).join(', ')} disabled />

          {/* Shop location with search */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Shop Location</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input placeholder="Type address or tap on map" icon={<MapPin className="w-4 h-4" />}
                  value={form.shopLocation} onChange={e => setF('shopLocation', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && geocodeSearch(form.shopLocation)}
                  disabled={!!selectedVendorItem} />
              </div>
              <button onClick={() => geocodeSearch(form.shopLocation)} disabled={searchingShop || !form.shopLocation || !!selectedVendorItem}
                className="px-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
                {searchingShop ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : <Search className="w-4 h-4 text-gray-500" />}
              </button>
            </div>
            <p className="text-[11px] text-gray-400">Search an address or tap on the map to place the shop pin</p>
          </div>

          {/* Map */}
          <MapPicker shopCoords={shopCoords} clientCoords={clientCoords} onShopCoordsChange={handleShopPinChange} />

          {/* Shop mode */}
          <div className="grid grid-cols-2 gap-2">
            {SHOP_MODES.map(m => (
              <button key={m.value} onClick={() => setF('shopMode', m.value)}
                className={cn('flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all',
                  form.shopMode === m.value ? 'border-brand bg-brand-50/50 dark:bg-brand/10' : 'border-gray-100 dark:border-gray-800 hover:border-gray-200')}>
                <span className="text-xl">{m.emoji}</span>
                <div>
                  <p className={cn('text-xs font-bold', form.shopMode === m.value ? 'text-brand' : 'text-navy dark:text-white')}>{m.label}</p>
                  <p className="text-[10px] text-gray-400">{m.desc} · {m.fee}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Your Location + Distance */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 space-y-4">
          <h2 className="font-bold text-navy dark:text-white text-sm flex items-center gap-2">
            <Navigation className="w-4 h-4 text-brand" /> Your Location <span className="text-[10px] text-red-400 font-normal">Required</span>
          </h2>
          <button onClick={detectMyLocation} disabled={gpsLoading}
            className={cn('w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
              clientCoords ? 'border-green-300 bg-green-50/50 dark:bg-green-500/10' : 'border-brand/30 bg-brand-50/30 dark:bg-brand/10 hover:border-brand')}>
            {gpsLoading ? <Loader2 className="w-5 h-5 animate-spin text-brand" /> : <Navigation className={cn('w-5 h-5', clientCoords ? 'text-green-600' : 'text-brand')} />}
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-semibold', clientCoords ? 'text-green-700 dark:text-green-400' : 'text-brand')}>
                {clientCoords ? 'Location detected' : 'Use my current location'}
              </p>
              {clientAddress && <p className="text-xs text-gray-500 truncate">{clientAddress}</p>}
            </div>
          </button>

          {/* Auto-calculated distance */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Distance (km)" value={dist > 0 ? dist.toFixed(1) : '—'} readOnly disabled hint="Auto-calculated" />
            <Input label="Delivery fee" value={dist > 0 ? `₹${deliveryFee}` : '—'} readOnly disabled hint="Based on distance" />
          </div>
        </div>

        {/* Tip */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 space-y-3">
          <h2 className="font-bold text-navy dark:text-white text-sm">Add a Tip 🙏</h2>
          <div className="flex gap-2">
            {[0, 5, 10, 20, 50].map(t => (
              <button key={t} onClick={() => setF('tip', String(t))}
                className={cn('flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all',
                  parseInt(form.tip) === t ? 'border-brand bg-brand text-white' : 'border-gray-200 dark:border-gray-700 text-navy dark:text-white hover:border-brand/50')}>
                {t === 0 ? 'No tip' : `₹${t}`}
              </button>
            ))}
          </div>
          <Input type="number" placeholder="Custom tip amount" value={parseInt(form.tip) > 50 || ![0, 5, 10, 20, 50].includes(parseInt(form.tip)) ? form.tip : ''} onChange={e => setF('tip', e.target.value)} />
        </div>

        {/* Summary */}
        {price > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="p-4 space-y-1.5">
              <h3 className="font-bold text-navy dark:text-white text-sm mb-2">Price Breakdown</h3>
              {[
                ...(items.filter(it => parseFloat(it.price) > 0).length > 1
                  ? items.filter(it => parseFloat(it.price) > 0).map((it, i) => ({ l: `${it.name || `Item ${i + 1}`}`, v: parseFloat(it.price) || 0 }))
                  : []),
                { l: items.filter(it => parseFloat(it.price) > 0).length > 1 ? 'Items subtotal' : 'Item price', v: price },
                { l: `Delivery (base ₹${baseFee} + ${weight}kg + ${dist}km)`, v: deliveryFee },
                ...(modeFee > 0 ? [{ l: 'Shop mode fee', v: modeFee }] : []),
                { l: 'Platform fee', v: platformFee },
                ...(tip > 0 ? [{ l: 'Tip', v: tip }] : []),
              ].map(r => (
                <div key={r.l} className="flex justify-between text-sm">
                  <span className="text-gray-500">{r.l}</span>
                  <span className="font-medium text-navy dark:text-white">{fmt.currency(r.v)}</span>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 flex justify-between items-center border-t border-gray-100 dark:border-gray-700">
              <span className="font-bold text-navy dark:text-white">Total</span>
              <span className="text-xl font-extrabold text-brand">{fmt.currency(total)}</span>
            </div>
          </div>
        )}
        {/* Place Order Button */}
        <Button className="w-full shadow-lg shadow-brand/20" size="lg" onClick={handleSubmit} loading={loading} disabled={!items.some(it => it.name.trim()) || totalItemPrice <= 0}>
          Place Order{price > 0 ? ` — ${fmt.currency(total)}` : ''}
        </Button>
      </div>

      {/* My Requests Modal */}
      <Modal open={showMyRequests} onClose={() => setShowMyRequests(false)} title="My Item Requests" size="md">
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {myRequests.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">No requests sent yet</p>
          ) : myRequests.map(req => {
            const remaining = req.status === 'PENDING' ? getTimeRemaining(req.expiresAt) : null
            return (
            <div key={req.id} className={cn('p-3 rounded-xl border',
              req.status === 'ACCEPTED' ? 'border-green-200 bg-green-50 dark:bg-green-500/10' :
              remaining?.expired ? 'border-red-200 bg-red-50/50 dark:bg-red-500/5' :
              'border-gray-200 dark:border-gray-700')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-navy dark:text-white text-sm">{req.itemName}</p>
                  <p className="text-xs text-gray-400">{req.vendor?.shopName}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {req.status === 'PENDING' && remaining ? (
                    !remaining.expired ? (
                      <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 rounded-full">
                        <Timer className="w-3 h-3 text-amber-600 animate-pulse" />
                        <span className={cn('text-[10px] font-bold tabular-nums', remaining.minutes < 1 ? 'text-red-600' : 'text-amber-700')}>
                          {remaining.text}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full">Timed out</span>
                    )
                  ) : (
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                      req.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                      req.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-500'
                    )}>{req.status}</span>
                  )}
                  <button onClick={() => handleDeleteRequest(req.id)}
                    className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    title="Delete request">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {req.status === 'ACCEPTED' && req.vendorPrice && (
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm text-green-700 dark:text-green-400">Vendor price: {fmt.currency(req.vendorPrice)}</p>
                  <Button size="sm" onClick={() => {
                    updateItem(activeItemIdx, {
                      name: req.itemName, price: String(req.vendorPrice),
                      vendorId: req.vendorId, shopName: req.vendor?.shopName || '',
                    })
                    setF('itemRequestId', req.id)
                    if (req.vendor?.locationName) setF('shopLocation', req.vendor.locationName)
                    if (req.vendor?.locationLat && req.vendor?.locationLng) {
                      setShopCoords({ lat: req.vendor.locationLat, lng: req.vendor.locationLng })
                    }
                    setSearchQuery(req.itemName)
                    setShowMyRequests(false)
                    toast.success('Order auto-filled!')
                  }}>Use this</Button>
                </div>
              )}
              {req.status === 'PENDING' && remaining?.expired && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleBroadcastRequest(req.id)} disabled={broadcastLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-brand text-white text-[11px] font-bold hover:bg-brand/90 transition-colors disabled:opacity-50">
                    {broadcastLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    All vendors
                  </button>
                  <button onClick={() => { handleLetRiderDecide(req); setShowMyRequests(false) }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-gray-800 dark:bg-gray-700 text-white text-[11px] font-bold hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                    <Users className="w-3 h-3" />
                    Rider decide
                  </button>
                </div>
              )}
            </div>
          )})}
        </div>
      </Modal>

      {/* Send Item Request Modal */}
      <Modal open={showRequestModal} onClose={() => setShowRequestModal(false)} title="Request Item from Vendor" size="md">
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-bold text-navy dark:text-white">Select Vendor *</label>
            <select
              value={requestForm.vendorId}
              onChange={e => setRequestForm(p => ({ ...p, vendorId: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-navy dark:text-white focus:ring-2 focus:ring-brand focus:border-brand outline-none"
            >
              <option value="">Choose a shop...</option>
              {allVendors.filter(v => v.isVerified && v.isActive).map(v => (
                <option key={v.id} value={v.id}>{v.shopName} — {v.category}</option>
              ))}
            </select>
          </div>
          <Input label="Item Name *" placeholder="e.g. Amul Butter 500g"
            value={requestForm.itemName}
            onChange={e => setRequestForm(p => ({ ...p, itemName: e.target.value }))} />
          <Input label="Description (optional)" placeholder="Brand preference, size, etc."
            value={requestForm.description}
            onChange={e => setRequestForm(p => ({ ...p, description: e.target.value }))} />
          <Input label="Max Budget (₹, optional)" type="number" placeholder="100"
            value={requestForm.maxPrice}
            onChange={e => setRequestForm(p => ({ ...p, maxPrice: e.target.value }))} />
          <div className="space-y-1">
            <label className="text-sm font-bold text-navy dark:text-white">Response timer</label>
            <select
              value={requestForm.timerMinutes}
              onChange={e => setRequestForm(p => ({ ...p, timerMinutes: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-navy dark:text-white focus:ring-2 focus:ring-brand focus:border-brand outline-none"
            >
              <option value="2">2 minutes</option>
              <option value="5">5 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="ghost" className="flex-1" onClick={() => setShowRequestModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={requestLoading} onClick={sendRequest}>
              <Send className="w-3.5 h-3.5" /> Send Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Searching Overlay (after order placed) ─────────────────────────── */}
      {searchingOverlay.show && (
        <div className="fixed inset-0 z-[100] bg-gradient-to-br from-navy via-slate-900 to-brand/30 flex flex-col items-center justify-center">
          {/* Animated radar rings */}
          <div className="relative w-40 h-40 mb-8">
            {[0, 1, 2].map(i => (
              <div key={i} className="absolute inset-0 rounded-full border-2 border-brand/30 animate-ping"
                style={{ animationDelay: `${i * 0.5}s`, animationDuration: '2s' }} />
            ))}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-brand/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Package className="w-10 h-10 text-brand animate-pulse" />
              </div>
            </div>
          </div>

          <h2 className="text-white text-xl font-extrabold mb-2">Order Placed!</h2>

          {/* Searching steps */}
          <div className="space-y-3 w-72">
            {[
              { label: 'Sending order to nearby riders...', icon: '📡' },
              { label: searchingOverlay.shopMode === 'SINGLE_SHOP' && searchingOverlay.shopName
                  ? `Shop: ${searchingOverlay.shopName}`
                  : searchingOverlay.shopMode === 'MULTIPLE_SHOPS' ? 'Checking 2–3 shops nearby...'
                  : searchingOverlay.shopMode === 'ENTIRE_AREA' ? 'Searching all shops in Dwarahat...'
                  : searchingOverlay.shopMode === 'URGENT' ? '⚡ Priority: Urgent order!'
                  : 'Finding the best shop...', icon: '🏪' },
              { label: 'Notifying vendors in the area...', icon: '🔔' },
              { label: 'Waiting for rider to accept...', icon: '🚴' },
            ].map((step, i) => (
              <div key={i} className={cn('flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500',
                searchingOverlay.step >= i ? 'bg-white/10 backdrop-blur-sm' : 'opacity-30')}>
                <span className="text-lg shrink-0">{step.icon}</span>
                <p className="text-sm text-white/90 font-medium flex-1">{step.label}</p>
                {searchingOverlay.step === i && <Loader2 className="w-4 h-4 text-brand animate-spin shrink-0" />}
                {searchingOverlay.step > i && <Check className="w-4 h-4 text-green-400 shrink-0" />}
              </div>
            ))}
          </div>

          <p className="text-white/40 text-xs mt-6">You&apos;ll be redirected to your order shortly...</p>
        </div>
      )}
    </div>
  )
}