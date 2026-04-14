'use client'
import { useEffect, useState } from 'react'
import { adminApi, getErrorMessage } from '@/lib/api'
import { Complaint } from '@/types'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { fmt, cn } from '@/lib/utils'
import { MessageSquareWarning, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'text-amber-700 bg-amber-50', UNDER_REVIEW: 'text-blue-700 bg-blue-50',
  RESOLVED: 'text-green-700 bg-green-50', DISMISSED: 'text-gray-700 bg-gray-50',
}

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('OPEN')
  const [resolving, setResolving] = useState<Complaint | null>(null)
  const [form, setForm] = useState({ adminNotes: '', resolution: 'RESOLVED' as 'RESOLVED' | 'DISMISSED' })
  const [acting, setActing] = useState(false)

  const fetch = () => {
    setLoading(true)
    adminApi.complaints({ status: status || undefined })
      .then(r => setComplaints(r.data.data || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [status])

  const handleResolve = async () => {
    if (!resolving || !form.adminNotes) { toast.error('Enter admin notes'); return }
    setActing(true)
    try {
      await adminApi.resolveComplaint(resolving.id, form)
      toast.success(`Complaint ${form.resolution.toLowerCase()}`)
      setResolving(null)
      fetch()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setActing(false) }
  }

  return (
    <div className="page-container max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-extrabold text-navy">Manage Complaints</h1>

      <div className="flex gap-2">
        {['OPEN','UNDER_REVIEW','RESOLVED','DISMISSED',''].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={cn('px-3.5 py-2 rounded-full text-sm font-bold transition-all',
              status === s ? 'bg-brand text-white' : 'bg-white text-gray-600 border border-gray-200')}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>
      ) : (
        <div className="space-y-3">
          {complaints.map(c => (
            <Card key={c.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-extrabold text-navy text-sm">{c.category.replace(/_/g,' ')}</p>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-extrabold', STATUS_COLORS[c.status])}>{c.status}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      By: {c.raisedBy?.name} · Order: {c.order?.itemName} · {fmt.relative(c.createdAt)}
                    </p>
                    <p className="text-sm text-gray-700 mt-2 line-clamp-2">{c.description}</p>
                    {c.evidenceUrl && (
                      <a href={c.evidenceUrl} target="_blank" rel="noreferrer" className="text-xs text-brand font-bold mt-1 inline-block">
                        View Evidence →
                      </a>
                    )}
                    {c.adminNotes && (
                      <div className="mt-2 bg-teal-50 rounded-xl px-3 py-2">
                        <p className="text-xs font-bold text-teal-700">Your note: {c.adminNotes}</p>
                      </div>
                    )}
                  </div>
                  {['OPEN','UNDER_REVIEW'].includes(c.status) && (
                    <Button size="sm" onClick={() => { setResolving(c); setForm({ adminNotes: '', resolution: 'RESOLVED' }) }}>
                      Resolve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {complaints.length === 0 && (
            <Card><CardContent className="py-12 text-center">
              <MessageSquareWarning className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">No complaints in this category</p>
            </CardContent></Card>
          )}
        </div>
      )}

      <Modal open={!!resolving} onClose={() => setResolving(null)} title="Resolve Complaint">
        {resolving && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="font-extrabold text-navy text-sm">{resolving.category.replace(/_/g,' ')}</p>
              <p className="text-sm text-gray-600 mt-1">{resolving.description}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setForm(p => ({ ...p, resolution: 'RESOLVED' }))}
                className={cn('flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-sm font-bold border-2 transition-all',
                  form.resolution === 'RESOLVED' ? 'border-green-600 bg-green-600 text-white' : 'border-gray-200 text-gray-600')}>
                <CheckCircle className="w-4 h-4" /> Resolve
              </button>
              <button onClick={() => setForm(p => ({ ...p, resolution: 'DISMISSED' }))}
                className={cn('flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-sm font-bold border-2 transition-all',
                  form.resolution === 'DISMISSED' ? 'border-gray-600 bg-gray-600 text-white' : 'border-gray-200 text-gray-600')}>
                <XCircle className="w-4 h-4" /> Dismiss
              </button>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-bold text-navy-700">Admin Notes (shown to user) *</label>
              <textarea className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none resize-none"
                rows={3} placeholder="Explain your decision to the user..."
                value={form.adminNotes} onChange={e => setForm(p => ({ ...p, adminNotes: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setResolving(null)}>Cancel</Button>
              <Button className="flex-1" loading={acting} onClick={handleResolve}>Submit</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
