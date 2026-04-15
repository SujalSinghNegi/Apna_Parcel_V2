'use client'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { initSocket, EVENTS } from '@/lib/socket'
import { Notification } from '@/types'
import toast from 'react-hot-toast'
import { Package, CreditCard, CheckCircle, XCircle, AlertTriangle, Bell, MapPin, Truck } from 'lucide-react'
import Link from 'next/link'

const TOAST_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  ORDER_ACCEPTED: { icon: Package, color: '#3b82f6' },
  ORDER_DELIVERED: { icon: CheckCircle, color: '#22c55e' },
  ORDER_CANCELLED: { icon: XCircle, color: '#ef4444' },
  PAYMENT_CONFIRMED: { icon: CreditCard, color: '#22c55e' },
  RIDER_LEFT: { icon: Truck, color: '#6366f1' },
  RIDER_ARRIVED: { icon: MapPin, color: '#84cc16' },
  STRIKE_ISSUED: { icon: AlertTriangle, color: '#f59e0b' },
  COMPLAINT_RESOLVED: { icon: CheckCircle, color: '#14b8a6' },
  NO_RIDER_FOUND: { icon: Bell, color: '#6b7280' },
}

export function NotificationListener() {
  const { accessToken } = useAuthStore() as any

  useEffect(() => {
    if (!accessToken) return
    const socket = initSocket(accessToken)

    const handler = (notification: Notification) => {
      const conf = TOAST_ICONS[notification.type] || { icon: Bell, color: '#FF6B35' }
      const Icon = conf.icon

      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? 'animate-slide-in-right' : 'animate-slide-out-right'
            } max-w-sm w-full bg-white dark:bg-gray-800 shadow-2xl rounded-2xl pointer-events-auto border border-gray-100 dark:border-gray-700 overflow-hidden`}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${conf.color}15` }}
                >
                  <Icon className="w-5 h-5" style={{ color: conf.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{notification.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notification.message}</p>
                </div>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              {notification.orderId && (
                <Link
                  href={`/orders/${notification.orderId}`}
                  onClick={() => toast.dismiss(t.id)}
                  className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-brand hover:text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl py-2 transition-colors"
                >
                  View Order <Package className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
            <div className="h-1 bg-gray-100 dark:bg-gray-700">
              <div
                className="h-full rounded-full animate-toast-progress"
                style={{ backgroundColor: conf.color }}
              />
            </div>
          </div>
        ),
        { duration: 5000, position: 'top-right' }
      )
    }

    socket.on(EVENTS.NOTIFICATION, handler)
    return () => { socket.off(EVENTS.NOTIFICATION, handler) }
  }, [accessToken])

  return null
}
