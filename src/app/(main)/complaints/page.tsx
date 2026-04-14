'use client'
import { useEffect, useState } from 'react'
import { complaintsApi } from '@/lib/api'
import { Complaint } from '@/types'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fmt, cn } from '@/lib/utils'
import { MessageSquareWarning, Plus, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react'
import Link from 'next/link'

const STATUS_CONF = {
  OPEN: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Open' },
  UNDER_REVIEW: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Under Review' },
  RESOLVED: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Resolved' },
  DISMISSED: { icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Dismissed' },
}

const CAT_LABELS: Record<string, string> = {
  WRONG_ITEM: 'Wrong Item', ITEM_DAMAGED: 'Item Damaged', RIDER_MISBEHAVIOUR: 'Rider Misbehaviour',
  PAYMENT_ISSUE: 'Payment Issue', REFUND_NOT_RECEIVED: 'Refund Not Received', OTHER: 'Other',
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    complaintsApi.mine().then(r => setComplaints(r.data.data || [])).finally(() => setLoading(false))
  }, [])

  return (
    <div className="page-container max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-brand to-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand/20">
            <MessageSquareWarning className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-navy">Complaints</h1>
        </div>
        <Link href="/complaints/new">
          <Button size="sm"><Plus className="w-4 h-4" /> New</Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <p className="text-sm text-gray-400 font-medium">Loading complaints...</p>
        </div>
      ) : complaints.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquareWarning className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-bold text-gray-400 text-lg">No complaints raised</p>
            <p className="text-sm text-gray-400 mt-1">Had an issue with an order? We're here to help.</p>
            <Link href="/complaints/new"><Button className="mt-4" size="sm"><Plus className="w-3.5 h-3.5" /> Raise Complaint</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {complaints.map(c => {
            const s = STATUS_CONF[c.status]
            const Icon = s.icon
            return (
              <Card key={c.id} className="card-hover">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-bold text-navy text-sm">{CAT_LABELS[c.category]}</p>
                      {c.order && <p className="text-xs text-gray-400 mt-0.5">Order: {c.order.itemName}</p>}
                    </div>
                    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold', s.bg, s.color)}>
                      <Icon className="w-3 h-3" />{s.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{c.description}</p>
                  {c.adminNotes && (
                    <div className="mt-2 bg-teal-50 rounded-xl px-3 py-2">
                      <p className="text-xs font-bold text-teal-700">Admin response:</p>
                      <p className="text-xs text-teal-700 mt-0.5">{c.adminNotes}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">{fmt.relative(c.createdAt)}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
