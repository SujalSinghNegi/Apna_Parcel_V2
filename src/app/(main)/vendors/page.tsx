'use client'
import { useEffect, useState } from 'react'
import { vendorsApi, getErrorMessage } from '@/lib/api'
import { Vendor, VendorItem } from '@/types'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { fmt, cn } from '@/lib/utils'
import { Store, MapPin, Phone, Clock, Loader2, Package, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

const CATEGORIES = ['ALL', 'GROCERY', 'MEDICAL', 'FOOD', 'UTENSILS', 'STATIONERY', 'OTHER']
const CAT_EMOJI: Record<string, string> = {
  GROCERY: '🛒', MEDICAL: '💊', FOOD: '🍱', UTENSILS: '🍽️', STATIONERY: '📚', OTHER: '📦'
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)

  const fetchVendors = (cat?: string) => {
    setLoading(true)
    vendorsApi.list(cat && cat !== 'ALL' ? cat : undefined)
      .then(r => setVendors(r.data.data || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchVendors() }, [])

  return (
    <div className="page-container space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-brand to-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand/20">
            <Store className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Shops</h1>
            <p className="text-sm text-gray-400 font-medium">Verified stores in Dwarahat</p>
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => { setActiveCategory(cat); fetchVendors(cat) }}
            className={cn('shrink-0 px-3.5 py-2 rounded-full text-sm font-bold transition-all',
              activeCategory === cat ? 'bg-brand text-white shadow-md shadow-brand/20' : 'bg-white text-gray-600 border border-gray-200 hover:border-brand')}>
            {cat !== 'ALL' && <span className="mr-1">{CAT_EMOJI[cat]}</span>}
            {cat === 'ALL' ? 'All' : cat.charAt(0) + cat.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <p className="text-sm text-gray-400 font-medium">Loading shops...</p>
        </div>
      ) : vendors.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Store className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-bold text-gray-400 text-lg">No shops found</p>
            <p className="text-sm text-gray-400 mt-1">Try a different category</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {vendors.map(v => {
            const items = v.vendorItems || []
            return (
              <Card key={v.id} className="card-hover">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center shrink-0 text-2xl">
                      {CAT_EMOJI[v.category] || '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="font-extrabold text-navy text-sm leading-tight">{v.shopName}</h3>
                        {v.isVerified && <span className="shrink-0 text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">✓ Verified</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{v.category.charAt(0) + v.category.slice(1).toLowerCase()}</p>
                      {v.locationName && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                          <p className="text-xs text-gray-500 truncate">{v.locationName}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        {v.openingTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <p className="text-xs text-gray-500">{v.openingTime}–{v.closingTime}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <p className="text-xs text-gray-500">{v.phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* View items button */}
                  {items.length > 0 ? (
                    <button
                      onClick={() => setSelectedVendor(v)}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-50 dark:bg-brand/10 rounded-xl text-xs font-bold text-brand hover:bg-brand-100 dark:hover:bg-brand/20 transition-colors"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      View {items.length} item{items.length !== 1 ? 's' : ''}
                    </button>
                  ) : (
                    <p className="mt-3 text-[11px] text-gray-400 text-center">No items listed yet</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Items Modal */}
      <Modal open={!!selectedVendor} onClose={() => setSelectedVendor(null)} title={selectedVendor?.shopName || 'Shop Items'} size="md">
        {selectedVendor && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
              {selectedVendor.locationName && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedVendor.locationName}</span>}
              {selectedVendor.openingTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{selectedVendor.openingTime}–{selectedVendor.closingTime}</span>}
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[60vh] overflow-y-auto -mx-1 px-1">
              {(selectedVendor.vendorItems || []).map(item => (
                <div key={item.id} className="flex items-center gap-3 py-3">
                  {item.photoUrl ? (
                    <img src={item.photoUrl} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-navy dark:text-white truncate">{item.name}</p>
                    <p className="text-[11px] text-gray-400">{item.weightKg}kg</p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <p className="text-sm font-extrabold text-brand">{fmt.currency(item.price)}</p>
                    <Link href={`/orders/new?item=${encodeURIComponent(item.name)}&price=${item.price}&vendor=${selectedVendor.id}&shop=${encodeURIComponent(selectedVendor.shopName)}`}>
                      <Button size="sm" className="text-[10px] h-7 px-2.5">Order</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
