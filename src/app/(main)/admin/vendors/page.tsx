'use client'
import { useEffect, useState } from 'react'
import { adminApi, getErrorMessage } from '@/lib/api'
import { Vendor } from '@/types'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Store, Check, X, Loader2, MapPin, Phone } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState('')

  const fetch = () => {
    setLoading(true)
    adminApi.pendingVendors().then(r => setVendors(r.data.data || [])).finally(() => setLoading(false))
  }
  useEffect(() => { fetch() }, [])

  const handle = async (id: string, action: 'verify' | 'reject') => {
    setActing(id)
    try {
      if (action === 'verify') await adminApi.verifyVendor(id)
      else await adminApi.rejectVendor(id)
      toast.success(action === 'verify' ? 'Vendor approved!' : 'Vendor rejected')
      fetch()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setActing('') }
  }

  return (
    <div className="page-container max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-display font-bold text-navy">Pending Vendor Approvals</h1>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>
      ) : vendors.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Store className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-display text-gray-400">No pending vendor registrations</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {vendors.map(v => (
            <Card key={v.id}>
              <CardContent className="py-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center text-2xl shrink-0">🏪</div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-navy">{v.shopName}</p>
                  <p className="text-xs text-gray-500 font-sans">{v.ownerName} · {v.category}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {v.locationName && <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400" /><p className="text-xs text-gray-500 font-sans">{v.locationName}</p></div>}
                    <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" /><p className="text-xs text-gray-500 font-sans">{v.phone}</p></div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" loading={acting === v.id} onClick={() => handle(v.id, 'verify')} className="bg-green-600 hover:bg-green-700">
                    <Check className="w-3.5 h-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="danger" loading={acting === v.id} onClick={() => handle(v.id, 'reject')}>
                    <X className="w-3.5 h-3.5" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
