'use client'
import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { ordersApi, getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { fmt, cn } from '@/lib/utils'
import { ShopMode, TRUST_LEVEL_LIMITS } from '@/types'
import { Package, MapPin, Store, ArrowLeft, Navigation, Search, Loader2 } from 'lucide-react'
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

export default function NewOrderPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    itemName: '', itemDescription: '', shopName: '', shopLocation: '',
    shopMode: 'SINGLE_SHOP' as ShopMode, expectedPrice: '', weightKg: '0',
    tip: '0', declaredEtaMinutes: '',
  })
  const [shopCoords, setShopCoords] = useState<LatLng | null>(null)
  const [clientCoords, setClientCoords] = useState<LatLng | null>(null)
  const [clientAddress, setClientAddress] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [searchingShop, setSearchingShop] = useState(false)

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

  const price = parseFloat(form.expectedPrice) || 0
  const weight = parseFloat(form.weightKg) || 0
  const dist = (shopCoords && clientCoords) ? Math.round(haversine(shopCoords, clientCoords) * 10) / 10 : 0
  const tip = parseFloat(form.tip) || 0
  const modeFees: Record<ShopMode, number> = { SINGLE_SHOP: 0, MULTIPLE_SHOPS: 15, ENTIRE_AREA: 25, URGENT: 0 }
  const baseFee = 10, weightFee = weight * 5, distFee = dist * 2, modeFee = modeFees[form.shopMode]
  let deliveryFee = baseFee + weightFee + distFee + modeFee
  if (form.shopMode === 'URGENT') deliveryFee = deliveryFee * 2
  const platformFee = Math.min(price * 0.08, 50)
  const total = price + deliveryFee + platformFee + tip
  const limit = user ? TRUST_LEVEL_LIMITS[user.trustLevel] : 500

  const handleSubmit = async () => {
    if (!form.itemName) { toast.error('Item name is required'); return }
    if (!form.expectedPrice || price <= 0) { toast.error('Enter expected price'); return }
    if (price > limit) { toast.error(`Your trust level allows max ₹${limit === Infinity ? '∞' : limit}`); return }
    if (!clientCoords) { toast.error('Please select your current location'); return }
    setLoading(true)
    try {
      const { data } = await ordersApi.create({
        itemName: form.itemName, itemDescription: form.itemDescription || undefined,
        shopName: form.shopName || undefined, shopLocation: form.shopLocation || undefined,
        shopMode: form.shopMode, expectedPrice: price, weightKg: weight,
        distanceKm: dist, tip, declaredEtaMinutes: form.declaredEtaMinutes ? parseInt(form.declaredEtaMinutes) : undefined,
      })
      toast.success('Order placed! Searching for a rider...')
      router.push(`/orders/${data.data.id}`)
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-navy transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-extrabold text-navy">New Order</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
        {/* Item Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
          <h2 className="font-bold text-navy text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-brand" /> What do you need?
          </h2>
          <Input placeholder="e.g. Rice 2kg, Medicines, Notebook..." value={form.itemName} onChange={e => setF('itemName', e.target.value)} />
          <textarea className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10 resize-none transition-all bg-gray-50"
            rows={2} placeholder="Brand, size, color, or any specific details (optional)"
            value={form.itemDescription} onChange={e => setF('itemDescription', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Expected Price (₹)" type="number" placeholder="200" value={form.expectedPrice} onChange={e => setF('expectedPrice', e.target.value)}
              hint={`Limit: ₹${limit === Infinity ? '∞' : limit}`} />
            <Input label="Weight (kg)" type="number" placeholder="0" value={form.weightKg} onChange={e => setF('weightKg', e.target.value)} hint="+₹5/kg" />
          </div>
        </div>

        {/* Shop Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
          <h2 className="font-bold text-navy text-sm flex items-center gap-2">
            <Store className="w-4 h-4 text-brand" /> Shop Info
          </h2>
          <Input placeholder="Shop name (optional)" value={form.shopName} onChange={e => setF('shopName', e.target.value)} />

          {/* Shop location with search */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600">Shop Location</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input placeholder="Type address or tap on map" icon={<MapPin className="w-4 h-4" />}
                  value={form.shopLocation} onChange={e => setF('shopLocation', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && geocodeSearch(form.shopLocation)} />
              </div>
              <button onClick={() => geocodeSearch(form.shopLocation)} disabled={searchingShop || !form.shopLocation}
                className="px-3 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors">
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
                  form.shopMode === m.value ? 'border-brand bg-brand-50/50 dark:bg-brand/10' : 'border-gray-100 hover:border-gray-200')}>
                <span className="text-xl">{m.emoji}</span>
                <div>
                  <p className={cn('text-xs font-bold', form.shopMode === m.value ? 'text-brand' : 'text-navy')}>{m.label}</p>
                  <p className="text-[10px] text-gray-400">{m.desc} · {m.fee}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Your Location + Distance */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
          <h2 className="font-bold text-navy text-sm flex items-center gap-2">
            <Navigation className="w-4 h-4 text-brand" /> Your Location <span className="text-[10px] text-red-400 font-normal">Required</span>
          </h2>
          <button onClick={detectMyLocation} disabled={gpsLoading}
            className={cn('w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
              clientCoords ? 'border-green-300 bg-green-50/50 dark:bg-green-500/10' : 'border-brand/30 bg-brand-50/30 dark:bg-brand/10 hover:border-brand')}>
            {gpsLoading ? <Loader2 className="w-5 h-5 animate-spin text-brand" /> : <Navigation className={cn('w-5 h-5', clientCoords ? 'text-green-600' : 'text-brand')} />}
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-semibold', clientCoords ? 'text-green-700' : 'text-brand')}>
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <h2 className="font-bold text-navy text-sm">Add a Tip 🙏</h2>
          <div className="flex gap-2">
            {[0, 5, 10, 20, 50].map(t => (
              <button key={t} onClick={() => setF('tip', String(t))}
                className={cn('flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all',
                  parseInt(form.tip) === t ? 'border-brand bg-brand text-white' : 'border-gray-200 text-navy hover:border-brand/50')}>
                {t === 0 ? 'No tip' : `₹${t}`}
              </button>
            ))}
          </div>
          <Input type="number" placeholder="Custom tip amount" value={parseInt(form.tip) > 50 || ![0, 5, 10, 20, 50].includes(parseInt(form.tip)) ? form.tip : ''} onChange={e => setF('tip', e.target.value)} />
        </div>

        {/* Summary */}
        {price > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 space-y-1.5">
              <h3 className="font-bold text-navy text-sm mb-2">Price Breakdown</h3>
              {[
                { l: 'Item price', v: price },
                { l: `Delivery (base ₹${baseFee} + ${weight}kg + ${dist}km)`, v: deliveryFee },
                ...(modeFee > 0 ? [{ l: 'Shop mode fee', v: modeFee }] : []),
                { l: 'Platform fee', v: platformFee },
                ...(tip > 0 ? [{ l: 'Tip', v: tip }] : []),
              ].map(r => (
                <div key={r.l} className="flex justify-between text-sm">
                  <span className="text-gray-500">{r.l}</span>
                  <span className="font-medium text-navy">{fmt.currency(r.v)}</span>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-t border-gray-100">
              <span className="font-bold text-navy">Total</span>
              <span className="text-xl font-extrabold text-brand">{fmt.currency(total)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom button */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-gray-100 p-4 z-20">
        <div className="max-w-2xl mx-auto">
          <Button className="w-full shadow-lg shadow-brand/20" size="lg" onClick={handleSubmit} loading={loading} disabled={!form.itemName || !form.expectedPrice}>
            Place Order{price > 0 ? ` — ${fmt.currency(total)}` : ''}
          </Button>
        </div>
      </div>
    </div>
  )
}
