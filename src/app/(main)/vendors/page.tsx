'use client'
import { useEffect, useState } from 'react'
import { vendorsApi, getErrorMessage } from '@/lib/api'
import { Vendor } from '@/types'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { fmt, cn } from '@/lib/utils'
import { Store, MapPin, Phone, Clock, Plus, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = ['ALL', 'GROCERY', 'MEDICAL', 'FOOD', 'UTENSILS', 'STATIONERY', 'OTHER']
const CAT_EMOJI: Record<string, string> = {
  GROCERY: '🛒', MEDICAL: '💊', FOOD: '🍱', UTENSILS: '🍽️', STATIONERY: '📚', OTHER: '📦'
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [showRegister, setShowRegister] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [form, setForm] = useState({ shopName: '', ownerName: '', phone: '', category: 'GROCERY', locationName: '', openingTime: '09:00', closingTime: '20:00' })

  const fetchVendors = (cat?: string) => {
    setLoading(true)
    vendorsApi.list(cat && cat !== 'ALL' ? cat : undefined)
      .then(r => setVendors(r.data.data || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchVendors() }, [])

  const handleRegister = async () => {
    if (!form.shopName || !form.ownerName || !form.phone) { toast.error('Fill all required fields'); return }
    setRegistering(true)
    try {
      await vendorsApi.register(form)
      toast.success('Shop registered! Pending admin approval.')
      setShowRegister(false)
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setRegistering(false) }
  }

  return (
    <div className="page-container space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand rounded-2xl flex items-center justify-center">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-navy">Shops</h1>
            <p className="text-sm text-gray-500 font-sans">Verified stores in Dwarahat</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowRegister(true)}>
          <Plus className="w-3.5 h-3.5" /> Register Shop
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => { setActiveCategory(cat); fetchVendors(cat) }}
            className={cn('shrink-0 px-3.5 py-2 rounded-full text-sm font-display font-semibold transition-all',
              activeCategory === cat ? 'bg-brand text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-brand')}>
            {cat !== 'ALL' && <span className="mr-1">{CAT_EMOJI[cat]}</span>}
            {cat === 'ALL' ? 'All' : cat.charAt(0) + cat.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>
      ) : vendors.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Store className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="font-display font-semibold text-gray-400">No shops found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {vendors.map(v => (
            <Card key={v.id}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center shrink-0 text-2xl">
                    {CAT_EMOJI[v.category] || '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="font-display font-bold text-navy text-sm leading-tight">{v.shopName}</h3>
                      {v.isVerified && <span className="shrink-0 text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-display">✓ Verified</span>}
                    </div>
                    <p className="text-xs text-gray-500 font-sans mt-0.5">{v.category.charAt(0) + v.category.slice(1).toLowerCase()}</p>
                    {v.locationName && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        <p className="text-xs text-gray-500 font-sans truncate">{v.locationName}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      {v.openingTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <p className="text-xs text-gray-500 font-sans">{v.openingTime}–{v.closingTime}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <p className="text-xs text-gray-500 font-sans">{v.phone}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showRegister} onClose={() => setShowRegister(false)} title="Register Your Shop" size="md">
        <div className="space-y-3">
          <Input label="Shop Name *" placeholder="Sharma General Store" value={form.shopName} onChange={e => setForm(p => ({ ...p, shopName: e.target.value }))} />
          <Input label="Owner Name *" placeholder="Ramesh Sharma" value={form.ownerName} onChange={e => setForm(p => ({ ...p, ownerName: e.target.value }))} />
          <Input label="Phone *" placeholder="9876500001" type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-navy-700 font-display">Category</label>
            <select className="w-full rounded-xl border-2 border-gray-200 px-3 py-3 text-sm font-sans focus:border-brand focus:outline-none"
              value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {['GROCERY','MEDICAL','FOOD','UTENSILS','STATIONERY','OTHER'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <Input label="Location" placeholder="Main Market, Dwarahat" value={form.locationName} onChange={e => setForm(p => ({ ...p, locationName: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Opens at" type="time" value={form.openingTime} onChange={e => setForm(p => ({ ...p, openingTime: e.target.value }))} />
            <Input label="Closes at" type="time" value={form.closingTime} onChange={e => setForm(p => ({ ...p, closingTime: e.target.value }))} />
          </div>
          <p className="text-xs text-gray-500 font-sans bg-amber-50 rounded-xl px-3 py-2">Registration is pending admin approval. Verified shops appear to riders first.</p>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowRegister(false)}>Cancel</Button>
            <Button className="flex-1" loading={registering} onClick={handleRegister}>Register</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
