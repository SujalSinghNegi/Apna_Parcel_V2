'use client'
import { useState } from 'react'
import { ordersApi, paymentsApi, getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { fmt, cn } from '@/lib/utils'
import { ShopMode, TRUST_LEVEL_LIMITS } from '@/types'
import { Package, Info, Zap, MapPin, Store } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

const SHOP_MODES: { value: ShopMode; label: string; desc: string; fee: string; emoji: string }[] = [
  { value: 'SINGLE_SHOP', label: 'Single Shop', desc: 'Rider goes to one shop', fee: 'No extra charge', emoji: '🏪' },
  { value: 'MULTIPLE_SHOPS', label: 'Multiple Shops', desc: 'Check 2–3 shops', fee: '+₹15', emoji: '🏬' },
  { value: 'ENTIRE_AREA', label: 'Search Area', desc: 'Search all of Dwarahat', fee: '+₹25', emoji: '🗺️' },
  { value: 'URGENT', label: 'Urgent', desc: 'Next available rider', fee: '2× delivery fee', emoji: '⚡' },
]

export default function NewOrderPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    itemName: '', itemDescription: '', shopName: '', shopLocation: '',
    shopMode: 'SINGLE_SHOP' as ShopMode, expectedPrice: '', weightKg: '0',
    distanceKm: '5', tip: '20', declaredEtaMinutes: '',
  })

  const setF = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const price = parseFloat(form.expectedPrice) || 0
  const weight = parseFloat(form.weightKg) || 0
  const dist = parseFloat(form.distanceKm) || 0
  const tip = parseFloat(form.tip) || 5
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
    <div className="page-container max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-brand to-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand/20">
          <Package className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Place Order</h1>
          <p className="text-sm text-gray-400 font-medium">Tell us what you need from town</p>
        </div>
      </div>

      {/* Item Details */}
      <Card>
        <CardHeader><h2 className="font-extrabold text-navy">Item Details</h2></CardHeader>
        <CardContent className="space-y-4 pt-0">
          <Input label="What do you need? *" placeholder="e.g. Rice 2kg, Medicines, Notebook..." value={form.itemName} onChange={e => setF('itemName', e.target.value)} />
          <div className="space-y-1">
            <label className="block text-sm font-bold text-navy-700">Description (optional)</label>
            <textarea className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 resize-none transition-all"
              rows={2} placeholder="Brand, size, color, or any specific details..."
              value={form.itemDescription} onChange={e => setF('itemDescription', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Expected Price (₹) *" type="number" placeholder="200" value={form.expectedPrice} onChange={e => setF('expectedPrice', e.target.value)}
              hint={`Limit: ₹${limit === Infinity ? 'Unlimited' : limit}`} />
            <Input label="Weight (kg)" type="number" placeholder="0" value={form.weightKg} onChange={e => setF('weightKg', e.target.value)} hint="+₹5 per kg" />
          </div>
        </CardContent>
      </Card>

      {/* Shop Details */}
      <Card>
        <CardHeader><h2 className="font-extrabold text-navy">Shop Details</h2></CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Shop Name" placeholder="Sharma Store" icon={<Store className="w-4 h-4" />} value={form.shopName} onChange={e => setF('shopName', e.target.value)} />
            <Input label="Distance (km)" type="number" placeholder="5" value={form.distanceKm} onChange={e => setF('distanceKm', e.target.value)} hint="+₹2 per km" />
          </div>
          <Input label="Shop Location" placeholder="Main Market, Dwarahat" icon={<MapPin className="w-4 h-4" />} value={form.shopLocation} onChange={e => setF('shopLocation', e.target.value)} />

          <div className="space-y-1">
            <label className="block text-sm font-bold text-navy-700">Shop Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {SHOP_MODES.map(m => (
                <button key={m.value} onClick={() => setF('shopMode', m.value)}
                  className={cn('flex items-start gap-2 p-3 rounded-xl border-2 text-left transition-all',
                    form.shopMode === m.value ? 'border-brand bg-brand-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200')}>
                  <span className="text-lg mt-0.5">{m.emoji}</span>
                  <div>
                    <p className={cn('text-xs font-bold', form.shopMode === m.value ? 'text-brand' : 'text-navy')}>{m.label}</p>
                    <p className="text-[11px] text-gray-500">{m.desc}</p>
                    <p className={cn('text-[11px] font-bold mt-0.5', form.shopMode === m.value ? 'text-brand' : 'text-gray-400')}>{m.fee}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tip */}
      <Card>
        <CardHeader><h2 className="font-extrabold text-navy">Add a Tip 🙏</h2></CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2 mb-3">
            {[5, 10, 20, 50].map(t => (
              <button key={t} onClick={() => setF('tip', String(t))}
                className={cn('flex-1 py-2 rounded-xl text-sm font-extrabold border-2 transition-all',
                  parseInt(form.tip) === t ? 'border-brand bg-brand text-white' : 'border-gray-200 text-navy hover:border-brand')}>
                ₹{t}
              </button>
            ))}
          </div>
          <Input type="number" placeholder="Custom tip" value={form.tip} onChange={e => setF('tip', e.target.value)} hint="Minimum ₹5" />
        </CardContent>
      </Card>

      {/* Fee Summary */}
      {price > 0 && (
        <Card className="border-brand/20 bg-gradient-to-br from-brand-50/40 to-orange-50/40">
          <CardContent className="py-5 space-y-2">
            <h3 className="font-extrabold text-navy text-sm mb-3">Order Summary</h3>
            {[
              { label: 'Item price', val: fmt.currency(price) },
              { label: `Base fee`, val: fmt.currency(baseFee) },
              { label: `Weight fee (${weight}kg × ₹5)`, val: fmt.currency(weightFee) },
              { label: `Distance fee (${dist}km × ₹2)`, val: fmt.currency(distFee) },
              ...(modeFee > 0 ? [{ label: 'Shop mode fee', val: fmt.currency(modeFee) }] : []),
              { label: 'Platform fee (8%, max ₹50)', val: fmt.currency(platformFee) },
              { label: 'Tip', val: fmt.currency(tip) },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-sm text-gray-600">
                <span>{r.label}</span><span>{r.val}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-3 flex justify-between font-extrabold text-navy">
              <span>Total</span><span className="text-brand text-xl">{fmt.currency(total)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Button className="w-full shadow-lg shadow-brand/20" size="lg" onClick={handleSubmit} loading={loading} disabled={!form.itemName || !form.expectedPrice}>
        Place Order — {price > 0 ? fmt.currency(total) : '₹0'} <Package className="w-4 h-4" />
      </Button>
    </div>
  )
}
