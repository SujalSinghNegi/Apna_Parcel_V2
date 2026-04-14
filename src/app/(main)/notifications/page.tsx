'use client'
import { useEffect, useState, useCallback } from 'react'
import { usersApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { initSocket, EVENTS } from '@/lib/socket'
import { Notification } from '@/types'
import { Card, CardContent } from '@/components/ui/Card'
import { fmt, cn } from '@/lib/utils'
import { Bell, Package, CreditCard, Star, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

const ICON_MAP: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  ORDER_ACCEPTED: { icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
  ORDER_DELIVERED: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  ORDER_CANCELLED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  PAYMENT_CONFIRMED: { icon: CreditCard, color: 'text-green-600', bg: 'bg-green-50' },
  RIDER_LEFT: { icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  RIDER_ARRIVED: { icon: Package, color: 'text-lime-600', bg: 'bg-lime-50' },
  STRIKE_ISSUED: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  COMPLAINT_RESOLVED: { icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50' },
  NO_RIDER_FOUND: { icon: Bell, color: 'text-gray-600', bg: 'bg-gray-50' },
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const { accessToken } = useAuthStore() as any

  const fetchNotifications = useCallback(() => {
    usersApi.notifications(1)
      .then(r => setNotifications(r.data.data || []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  // Real-time: listen for new notifications via socket
  useEffect(() => {
    if (!accessToken) return
    const sock = initSocket(accessToken)

    sock.on(EVENTS.NOTIFICATION, (notification: Notification) => {
      setNotifications(prev => [notification, ...prev])
    })

    return () => { sock.off(EVENTS.NOTIFICATION) }
  }, [accessToken])

  return (
    <div className="page-container max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-brand to-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand/20">
          <Bell className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-navy">Notifications</h1>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <p className="text-sm text-gray-400 font-medium">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-bold text-gray-400 text-lg">All caught up!</p>
            <p className="text-sm text-gray-400 mt-1">No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const conf = ICON_MAP[n.type] || { icon: Bell, color: 'text-navy', bg: 'bg-navy-50' }
            const Icon = conf.icon
            const content = (
              <Card key={n.id} className={cn('transition-all card-hover', !n.isRead && 'border-l-4 border-l-brand')}>
                <CardContent className="py-4 flex items-start gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', conf.bg)}>
                    <Icon className={cn('w-5 h-5', conf.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-navy text-sm">{n.title}</p>
                      {!n.isRead && <span className="w-2 h-2 bg-brand rounded-full shrink-0 mt-1" />}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{fmt.relative(n.createdAt)}</p>
                  </div>
                </CardContent>
              </Card>
            )
            return n.orderId ? (
              <Link key={n.id} href={`/orders/${n.orderId}`}>{content}</Link>
            ) : (
              <div key={n.id}>{content}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}
