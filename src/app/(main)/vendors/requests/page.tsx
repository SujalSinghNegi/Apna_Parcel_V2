'use client'
import { useEffect, useState, useCallback } from 'react'
import { vendorsApi, getErrorMessage } from '@/lib/api'
import { ItemRequest } from '@/types'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { fmt, cn } from '@/lib/utils'
import { Bell, Clock, Check, X, Loader2, ArrowLeft, Package, Timer } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  ACCEPTED: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  EXPIRED: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
}

export default function VendorRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<ItemRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [respondingTo, setRespondingTo] = useState<ItemRequest | null>(null)
  const [responseForm, setResponseForm] = useState({ vendorPrice: '', vendorDescription: '' })
  const [submitting, setSubmitting] = useState(false)

  const fetchRequests = useCallback(async () => {
    try {
      const { data } = await vendorsApi.vendorRequests()
      setRequests(data.data || [])
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  // Poll every 15 seconds for new requests
  useEffect(() => {
    const interval = setInterval(fetchRequests, 15000)
    return () => clearInterval(interval)
  }, [fetchRequests])

  const respond = async (accept: boolean) => {
    if (!respondingTo) return
    if (accept && !responseForm.vendorPrice) { toast.error('Please enter your price'); return }
    setSubmitting(true)
    try {
      await vendorsApi.respondRequest(respondingTo.id, {
        accept,
        vendorPrice: accept ? parseFloat(responseForm.vendorPrice) : undefined,
        vendorDescription: responseForm.vendorDescription || undefined,
      })
      toast.success(accept ? 'Request accepted!' : 'Request declined')
      setRespondingTo(null)
      fetchRequests()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSubmitting(false) }
  }

  const getTimeLeft = (expiresAt: string) => {
    const ms = new Date(expiresAt).getTime() - Date.now()
    if (ms <= 0) return 'Expired'
    const mins = Math.floor(ms / 60000)
    return `${mins}m left`
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-brand" />
      <p className="text-sm text-gray-400">Loading requests...</p>
    </div>
  )

  return (
    <div className="page-container max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-navy dark:hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
          <Bell className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-navy dark:text-white">Item Requests</h1>
          <p className="text-xs text-gray-400">Respond to customer requests</p>
        </div>
      </div>

      {requests.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200 dark:border-gray-700">
          <CardContent className="py-16 text-center">
            <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-bold text-gray-400 text-lg">No requests yet</p>
            <p className="text-sm text-gray-400 mt-1">When customers request items, they'll show up here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {requests.map(req => {
            const isPending = req.status === 'PENDING' && new Date(req.expiresAt) > new Date()
            return (
              <Card key={req.id} className={cn('transition-all', isPending && 'ring-2 ring-amber-300 dark:ring-amber-500/50')}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-navy dark:text-white text-sm">{req.itemName}</h3>
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', STATUS_STYLES[req.status])}>
                          {req.status}
                        </span>
                      </div>
                      {req.description && <p className="text-xs text-gray-500 mt-1">{req.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        {req.maxPrice && <span>Max: {fmt.currency(req.maxPrice)}</span>}
                        <span className="flex items-center gap-1">
                          <Timer className="w-3 h-3" /> {req.timerMinutes}min request
                        </span>
                        {isPending && (
                          <span className="text-amber-600 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {getTimeLeft(req.expiresAt)}
                          </span>
                        )}
                      </div>
                      {req.vendorPrice && (
                        <p className="text-sm font-bold text-brand mt-1">Your price: {fmt.currency(req.vendorPrice)}</p>
                      )}
                    </div>
                    {isPending && (
                      <div className="flex gap-1.5 shrink-0">
                        <Button size="sm" onClick={() => {
                          setRespondingTo(req)
                          setResponseForm({ vendorPrice: req.maxPrice ? String(req.maxPrice) : '', vendorDescription: '' })
                        }}>
                          <Check className="w-3.5 h-3.5" /> Accept
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50"
                          onClick={() => { setRespondingTo(req); respond(false) }}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Respond Modal */}
      <Modal open={!!respondingTo && respondingTo.status === 'PENDING'} onClose={() => setRespondingTo(null)} title={`Respond: ${respondingTo?.itemName}`} size="sm">
        <div className="space-y-4">
          {respondingTo?.description && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-500">{respondingTo.description}</p>
              {respondingTo.maxPrice && <p className="text-sm font-bold text-navy dark:text-white mt-1">Customer max: {fmt.currency(respondingTo.maxPrice)}</p>}
            </div>
          )}
          <Input label="Your Price (₹) *" type="number" placeholder="Enter your price" value={responseForm.vendorPrice}
            onChange={e => setResponseForm(p => ({ ...p, vendorPrice: e.target.value }))} />
          <Input label="Note (optional)" placeholder="e.g. Available in 500g pack" value={responseForm.vendorDescription}
            onChange={e => setResponseForm(p => ({ ...p, vendorDescription: e.target.value }))} />
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => { setRespondingTo(null); respond(false) }}>Decline</Button>
            <Button className="flex-1" loading={submitting} onClick={() => respond(true)}>Accept & Quote</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
