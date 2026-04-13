'use client'
import { useEffect, useState, useRef } from 'react'
import { complaintsApi, ordersApi, uploadApi, getErrorMessage } from '@/lib/api'
import { Order } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Camera, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  { value: 'WRONG_ITEM', label: '📦 Wrong Item', desc: 'Received different item than ordered' },
  { value: 'ITEM_DAMAGED', label: '💔 Item Damaged', desc: 'Item arrived broken or damaged' },
  { value: 'RIDER_MISBEHAVIOUR', label: '😠 Rider Misbehaviour', desc: 'Rider was rude or unprofessional' },
  { value: 'PAYMENT_ISSUE', label: '💳 Payment Issue', desc: 'Problem with charge or escrow' },
  { value: 'REFUND_NOT_RECEIVED', label: '🔄 Refund Not Received', desc: 'Expected refund hasn\'t arrived' },
  { value: 'OTHER', label: '📝 Other', desc: 'Something else went wrong' },
]

export default function NewComplaintPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [form, setForm] = useState({ orderId: '', category: '', description: '' })
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ordersApi.list('client').then(r => {
      const eligible = (r.data.data || []).filter((o: Order) =>
        ['DELIVERED', 'CANCELLED', 'ITEM_NOT_FOUND'].includes(o.status))
      setOrders(eligible)
    }).catch(() => {})
  }, [])

  const handleSubmit = async () => {
    if (!form.orderId) { toast.error('Select an order'); return }
    if (!form.category) { toast.error('Select a category'); return }
    if (form.description.length < 20) { toast.error('Describe the issue in at least 20 characters'); return }
    setLoading(true)
    try {
      let evidenceUrl: string | undefined
      if (files.length > 0) {
        const { data } = await uploadApi.complaintEvidence(files, form.orderId)
        evidenceUrl = data.data.urls[0]
      }
      await complaintsApi.create({ ...form, evidenceUrl })
      toast.success('Complaint raised! Admin will review within 24 hours.')
      router.push('/complaints')
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setLoading(false) }
  }

  const addFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || [])
    setFiles(p => [...p, ...newFiles].slice(0, 4))
    e.target.value = ''
  }

  return (
    <div className="page-container max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-display font-bold text-navy">Raise a Complaint</h1>

      <Card>
        <CardHeader><h2 className="font-display font-semibold text-navy">Select Order</h2></CardHeader>
        <CardContent className="pt-0">
          {orders.length === 0 ? (
            <p className="text-sm text-gray-500 font-sans">No eligible orders found. Complaints can only be raised for delivered or cancelled orders.</p>
          ) : (
            <div className="space-y-2">
              {orders.map(o => (
                <button key={o.id} onClick={() => setForm(p => ({ ...p, orderId: o.id }))}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all ${form.orderId === o.id ? 'border-brand bg-brand-50' : 'border-gray-100 hover:border-gray-200'}`}>
                  <div>
                    <p className={`text-sm font-semibold font-display ${form.orderId === o.id ? 'text-brand' : 'text-navy'}`}>{o.itemName}</p>
                    <p className="text-xs text-gray-500 font-sans">#{o.id.slice(-8).toUpperCase()} · ₹{o.totalAmount}</p>
                  </div>
                  <span className="text-xs font-sans text-gray-500">{o.status}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="font-display font-semibold text-navy">Category</h2></CardHeader>
        <CardContent className="pt-0 grid grid-cols-1 gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat.value} onClick={() => setForm(p => ({ ...p, category: cat.value }))}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${form.category === cat.value ? 'border-brand bg-brand-50' : 'border-gray-100 hover:border-gray-200'}`}>
              <span className="text-lg">{cat.label.split(' ')[0]}</span>
              <div>
                <p className={`text-sm font-semibold font-display ${form.category === cat.value ? 'text-brand' : 'text-navy'}`}>{cat.label.split(' ').slice(1).join(' ')}</p>
                <p className="text-xs text-gray-500 font-sans">{cat.desc}</p>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="font-display font-semibold text-navy">Description</h2></CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="space-y-1">
            <textarea className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-sans focus:border-brand focus:outline-none resize-none"
              rows={5} placeholder="Describe what went wrong in detail. The more specific, the faster we can resolve it..."
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            <p className={`text-xs font-sans ${form.description.length < 20 ? 'text-amber-600' : 'text-green-600'}`}>
              {form.description.length}/1000 characters {form.description.length < 20 ? `(${20 - form.description.length} more needed)` : '✓'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="font-display font-semibold text-navy">Evidence (optional)</h2></CardHeader>
        <CardContent className="pt-0 space-y-3">
          <p className="text-sm text-gray-500 font-sans">Upload photos or videos (MP4, MOV) of damaged goods. Up to 4 files.</p>
          {files.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {files.map((f, i) => (
                <div key={i} className="relative">
                  {f.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-24 object-cover rounded-xl" />
                  ) : (
                    <div className="w-full h-24 bg-gray-100 rounded-xl flex items-center justify-center">
                      <p className="text-xs text-gray-500 font-sans text-center px-2">{f.name}</p>
                    </div>
                  )}
                  <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {files.length < 4 && (
            <button onClick={() => fileRef.current?.click()}
              className="w-full h-20 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-brand hover:text-brand transition-colors">
              <Upload className="w-5 h-5" />
              <span className="text-xs font-sans">Add photo or video</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*,video/mp4,video/quicktime,video/webm" multiple className="hidden" onChange={addFile} />
        </CardContent>
      </Card>

      <Button className="w-full" size="lg" onClick={handleSubmit} loading={loading} disabled={!form.orderId || !form.category || form.description.length < 20}>
        Submit Complaint
      </Button>
    </div>
  )
}
