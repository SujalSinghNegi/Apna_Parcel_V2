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
    <div className="page-container max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand rounded-2xl flex items-center justify-center">
            <MessageSquareWarning className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold text-navy">Complaints</h1>
        </div>
        <Link href="/complaints/new">
          <Button size="sm"><Plus className="w-4 h-4" /> New</Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>
      ) : complaints.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MessageSquareWarning className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="font-display font-semibold text-gray-400">No complaints raised</p>
            <p className="text-sm text-gray-400 font-sans mt-1">Had an issue with an order? We're here to help.</p>
            <Link href="/complaints/new"><Button className="mt-4" size="sm"><Plus className="w-3.5 h-3.5" /> Raise Complaint</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {complaints.map(c => {
            const s = STATUS_CONF[c.status]
            const Icon = s.icon
            return (
              <Card key={c.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-display font-bold text-navy text-sm">{CAT_LABELS[c.category]}</p>
                      {c.order && <p className="text-xs text-gray-500 font-sans mt-0.5">Order: {c.order.itemName}</p>}
                    </div>
                    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold font-display', s.bg, s.color)}>
                      <Icon className="w-3 h-3" />{s.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 font-sans line-clamp-2">{c.description}</p>
                  {c.adminNotes && (
                    <div className="mt-2 bg-teal-50 rounded-xl px-3 py-2">
                      <p className="text-xs font-semibold text-teal-700 font-display">Admin response:</p>
                      <p className="text-xs text-teal-700 font-sans mt-0.5">{c.adminNotes}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 font-sans mt-2">{fmt.relative(c.createdAt)}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
