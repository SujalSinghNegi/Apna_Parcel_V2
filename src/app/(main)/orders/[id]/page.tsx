'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { ordersApi, paymentsApi, chatApi, uploadApi, trackingApi, ratingsApi, getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { initSocket, joinOrderRoom, leaveOrderRoom, sendChatMessage, EVENTS } from '@/lib/socket'
import { usePolling } from '@/hooks/usePolling'
import { Order, Message, RiderLocation, ORDER_STATUS_LABELS } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { StatusBadge, TrustBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { fmt, cn } from '@/lib/utils'
import {
  Send, Image as ImageIcon, CheckCircle2, XCircle, MapPin, Star,
  AlertTriangle, Package, Loader2, Camera, ChevronDown,
  Clock, Store, CreditCard, Truck, ShieldCheck, ArrowLeft, Eye,
  ChevronRight, MessageCircle, Bike
} from 'lucide-react'
import toast from 'react-hot-toast'
import { StripePaymentModal } from '@/components/ui/StripePaymentModal'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useParams, useRouter } from 'next/navigation'

const LiveMapDynamic = dynamic(
  () => import('@/components/ui/LiveMap').then(m => ({ default: m.LiveMap })),
  { ssr: false, loading: () => <div className="w-full h-48 rounded-2xl bg-gray-100 animate-pulse" /> }
)

const TRACKABLE = ['RIDER_LEFT', 'AT_SHOP', 'ITEM_PURCHASED', 'PHOTO_APPROVED', 'DELIVERING', 'ARRIVED']

/* ─── Order Flow Steps (Rapido-style timeline) ─── */
const STEPS = [
  { key: 'PENDING', label: 'Order Placed', icon: Package },
  { key: 'ACCEPTED', label: 'Rider Assigned', icon: Bike },
  { key: 'PAID', label: 'Payment Done', icon: CreditCard },
  { key: 'RIDER_LEFT', label: 'On the Way to Shop', icon: Truck },
  { key: 'AT_SHOP', label: 'At Shop', icon: Store },
  { key: 'ITEM_PURCHASED', label: 'Photo Sent', icon: Camera },
  { key: 'PHOTO_APPROVED', label: 'Photo Verified', icon: CheckCircle2 },
  { key: 'DELIVERING', label: 'Delivering to You', icon: Truck },
  { key: 'ARRIVED', label: 'Rider Arrived', icon: MapPin },
  { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
]

const STATUS_ORDER = STEPS.map(s => s.key)

function getStepIndex(status: string) {
  const idx = STATUS_ORDER.indexOf(status)
  return idx === -1 ? 0 : idx
}

/* ─── Skeleton ─── */
function OrderSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-200" />
        <div className="h-5 w-32 bg-gray-200 rounded-lg" />
      </div>
      <div className="bg-white rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-gray-100 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-40 bg-gray-100 rounded" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
          </div>
          <div className="h-7 w-24 bg-gray-100 rounded-full" />
        </div>
        <div className="h-px bg-gray-100" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full" />
              <div className="flex-1 h-4 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl p-5 space-y-3">
        <div className="h-5 w-32 bg-gray-100 rounded" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="h-14 bg-gray-200 rounded-2xl" />
    </div>
  )
}

/* ─── Photo Viewer Overlay ─── */
function PhotoViewer({ urls, onClose }: { urls: string[]; onClose: () => void }) {
  const [idx, setIdx] = useState(0)
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between p-4">
        <p className="text-white/70 text-sm font-medium">{idx + 1}/{urls.length}</p>
        <button className="text-white/70 hover:text-white text-2xl font-bold">×</button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
        <img src={urls[idx]} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
      </div>
      {urls.length > 1 && (
        <div className="flex justify-center gap-2 p-4">
          {urls.map((u, i) => (
            <button key={i} onClick={e => { e.stopPropagation(); setIdx(i) }}
              className={cn('w-16 h-16 rounded-xl border-2 overflow-hidden transition-all',
                i === idx ? 'border-brand scale-105' : 'border-white/20 opacity-60')}>
              <img src={u} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const QUICK_MSGS = [
  { key: 'ON_THE_WAY', label: '🚴 On my way' },
  { key: 'ARRIVED', label: '📍 Arrived' },
  { key: 'SHARE_OTP', label: '🔑 Share OTP' },
  { key: 'ITEM_NOT_AVAILABLE', label: '❓ Not found?' },
  { key: 'WAIT_OUTSIDE', label: '⏳ Wait outside' },
  { key: 'COMING_IN_5', label: '⏱️ 5 min' },
]

export default function OrderDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { user, accessToken } = useAuthStore() as any
  const [order, setOrder] = useState<Order | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const [msgText, setMsgText] = useState('')
  const [otpInput, setOtpInput] = useState(['', '', '', ''])
  const [cancelReason, setCancelReason] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [showCancel, setShowCancel] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [showOtp, setShowOtp] = useState(false)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [actualPrice, setActualPrice] = useState('')
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; clientSecret: string; amount: number }>({ open: false, clientSecret: '', amount: 0 })
  const [hasRated, setHasRated] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showPhotoViewer, setShowPhotoViewer] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)

  const [lastKnownLocation, setLastKnownLocation] = useState<RiderLocation | null>(null)
  const mapLocationUpdater = useRef<((loc: RiderLocation) => void) | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const isRider = order?.riderId === user?.id
  const isClient = order?.clientId === user?.id
  const showMap = order && TRACKABLE.includes(order.status) && isClient

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await ordersApi.getById(id)
      setOrder(data.data)
    } catch { toast.error('Order not found') }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => {
    if (!order) return
    if (TRACKABLE.includes(order.status) && isClient) {
      trackingApi.getLocation(id).then(r => { if (r.data.data) setLastKnownLocation(r.data.data) }).catch(() => {})
    }
  }, [order?.status, isClient, id])

  useEffect(() => {
    fetchOrder()
    chatApi.history(id).then(r => setMessages(r.data.data || [])).catch(() => {})
  }, [fetchOrder, id])

  const isActiveOrder = order && !['DELIVERED', 'CANCELLED', 'ITEM_NOT_FOUND'].includes(order.status)
  usePolling(fetchOrder, 10_000, !!isActiveOrder)

  useEffect(() => {
    if (order?.status === 'DELIVERED') {
      ratingsApi.check(id).then(r => { if (r.data.data?.hasRated) setHasRated(true) }).catch(() => {})
    }
  }, [order?.status, id])

  useEffect(() => {
    if (!accessToken) return
    const sock = initSocket(accessToken)
    joinOrderRoom(id)

    sock.on(EVENTS.ORDER_STATUS, ({ status }: any) => {
      setOrder(p => p ? { ...p, status } : p)
      toast.success(`Order ${status.replace(/_/g, ' ').toLowerCase()}`)
      fetchOrder()
    })
    sock.on(EVENTS.ORDER_ACCEPTED, () => { toast.success('Rider accepted! 🎉'); fetchOrder() })
    sock.on(EVENTS.RIDER_LEFT, () => { toast('Rider heading to shop 🚴', { icon: '🛵' }); fetchOrder() })
    sock.on(EVENTS.RIDER_ARRIVED, () => { toast.success('Rider arrived!'); fetchOrder() })
    sock.on(EVENTS.ORDER_DELIVERED, () => { toast.success('Delivered! 🎉'); fetchOrder() })
    sock.on(EVENTS.ORDER_CANCELLED, () => { toast.error('Order cancelled'); fetchOrder() })
    sock.on(EVENTS.ORDER_OTP, ({ otp }: any) => {
      if (otp) { setOrder(p => p ? { ...p, deliveryOtp: otp } : p); toast.success(`Delivery OTP: ${otp}`, { duration: 15000 }) }
    })
    sock.on(EVENTS.MESSAGE_RECEIVE, (msg: Message) => {
      setMessages(p => [...p, msg])
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
    sock.on(EVENTS.RIDER_LOCATION, (payload: any) => {
      const loc: RiderLocation = { latitude: payload.latitude, longitude: payload.longitude, accuracy: payload.accuracy, heading: payload.heading, speed: payload.speed, updatedAt: payload.timestamp ?? new Date().toISOString() }
      setLastKnownLocation(loc)
      if (mapLocationUpdater.current) mapLocationUpdater.current(loc)
    })

    return () => {
      leaveOrderRoom(id)
      ;[EVENTS.ORDER_STATUS, EVENTS.ORDER_ACCEPTED, EVENTS.RIDER_LEFT, EVENTS.RIDER_ARRIVED, EVENTS.ORDER_DELIVERED, EVENTS.ORDER_CANCELLED, EVENTS.ORDER_OTP, EVENTS.MESSAGE_RECEIVE, EVENTS.RIDER_LOCATION].forEach(e => sock.off(e))
    }
  }, [accessToken, id, fetchOrder])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const doAction = async (action: string, fn: () => Promise<any>) => {
    setActionLoading(action)
    try { await fn(); await fetchOrder() } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setActionLoading('') }
  }

  const handlePay = async () => {
    setActionLoading('pay')
    try {
      const { data } = await paymentsApi.createIntent(id)
      setPaymentModal({ open: true, clientSecret: data.data.clientSecret, amount: data.data.amount })
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setActionLoading('') }
  }

  const handlePaymentSuccess = async () => {
    setPaymentModal({ open: false, clientSecret: '', amount: 0 })
    setActionLoading('confirming')
    try {
      await paymentsApi.confirmPayment(id)
      await ordersApi.markPaid(id)
      toast.success('Payment successful! ✅')
    } catch (e) { toast.error(getErrorMessage(e)) }
    await fetchOrder()
    setActionLoading('')
  }

  const handleSendMsg = () => { if (!msgText.trim()) return; sendChatMessage(id, msgText); setMsgText('') }
  const handleQuickMsg = (key: string) => sendChatMessage(id, undefined, undefined, key)
  const handlePhotoSend = async (file: File) => {
    doAction('photo', async () => { const { data } = await uploadApi.chatPhoto(file, id); setMessages(p => [...p, data.data.message]) })
  }

  const handleItemPurchased = async () => {
    if (photoFiles.length === 0) { toast.error('Take at least one photo'); return }
    if (!actualPrice) { toast.error('Enter actual price'); return }
    doAction('purchased', async () => {
      const urls: string[] = []
      for (const file of photoFiles) { const { data: d } = await uploadApi.orderItemPhoto(file, id); urls.push(d.data.url) }
      await ordersApi.itemPurchased(id, urls[0], parseFloat(actualPrice), urls)
      setPhotoFiles([]); setShowPhotoUpload(false)
      toast.success('Photos sent for approval!')
    })
  }

  const handleOtpSubmit = async () => {
    const code = otpInput.join('')
    if (code.length !== 4) { toast.error('Enter 4-digit OTP'); return }
    doAction('otp', async () => { await ordersApi.verifyOtp(id, code); toast.success('Delivered! 🎉'); setShowOtp(false) })
  }

  const handleOtpChange = (i: number, val: string) => {
    const v = val.replace(/\D/g, '').slice(-1)
    const next = [...otpInput]; next[i] = v; setOtpInput(next)
    if (v && i < 3) otpRefs.current[i + 1]?.focus()
  }

  if (loading) return <OrderSkeleton />
  if (!order) return <div className="page-container text-center text-gray-500">Order not found</div>

  const counterpart = isClient ? order.rider : order.client
  const currentStep = getStepIndex(order.status)
  const isCancelled = ['CANCELLED', 'ITEM_NOT_FOUND', 'DISPUTED'].includes(order.status)
  const photoUrls = order.purchasedPhotoUrls?.length ? order.purchasedPhotoUrls : order.purchasedPhotoUrl ? [order.purchasedPhotoUrl] : []

  return (
    <div className="min-h-screen bg-gray-50 pb-36">
      {/* ─── Sticky Top Bar ─── */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-navy transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-bold text-sm">Back</span>
          </button>
          <div className="text-center">
            <p className="text-xs text-gray-400 font-medium">Order</p>
            <p className="text-xs font-bold text-navy">#{order.id.slice(-8).toUpperCase()}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">

        {/* ─── Live Map ─── */}
        {showMap && (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            <LiveMapDynamic orderId={id} lastKnownLocation={lastKnownLocation} onLocationRef={(fn) => { mapLocationUpdater.current = fn }} />
            {lastKnownLocation && (
              <div className="px-4 py-2 flex items-center justify-between bg-green-50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-bold text-green-700">Live Tracking</span>
                </div>
                <span className="text-[11px] text-green-600">{fmt.relative(lastKnownLocation.updatedAt)}</span>
              </div>
            )}
          </div>
        )}

        {/* ─── Order Status Card ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 flex items-start gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-50 to-orange-50 rounded-xl flex items-center justify-center shrink-0">
              <Package className="w-6 h-6 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-extrabold text-navy text-lg leading-tight">{order.itemName}</h1>
              {order.itemDescription && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{order.itemDescription}</p>}
              <p className="text-xs text-gray-400 mt-1">{fmt.datetime(order.createdAt)}</p>
            </div>
          </div>

          <button onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100 hover:bg-gray-100 transition-colors">
            <span className="text-sm font-bold text-navy">Total: {fmt.currency(order.totalAmount)}</span>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span>Price Details</span>
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showBreakdown && 'rotate-180')} />
            </div>
          </button>

          {showBreakdown && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 space-y-1.5 animate-slide-down text-sm">
              {[
                { l: 'Item Price', v: order.expectedPrice },
                ...(order.actualPrice != null && order.actualPrice !== order.expectedPrice ? [{ l: 'Actual Price', v: order.actualPrice }] : []),
                { l: 'Delivery Fee', v: order.deliveryFee },
                { l: 'Platform Fee', v: order.platformFee },
                { l: 'Tip', v: order.tip },
              ].map(r => (
                <div key={r.l} className="flex justify-between">
                  <span className="text-gray-500">{r.l}</span>
                  <span className="font-semibold text-navy">{fmt.currency(r.v)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-1.5 border-t border-gray-200 font-bold">
                <span className="text-navy">Total</span>
                <span className="text-brand">{fmt.currency(order.totalAmount)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ─── Progress Timeline ─── */}
        {!isCancelled && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-bold text-navy mb-4">Order Progress</h3>
            <div className="relative">
              {STEPS.map((step, i) => {
                const done = currentStep >= i
                const current = currentStep === i
                const Icon = step.icon
                if (i > currentStep + 2 && i < STEPS.length - 1) return null
                return (
                  <div key={step.key} className="flex items-start gap-3 relative">
                    {i < STEPS.length - 1 && i <= currentStep + 1 && (
                      <div className={cn('absolute left-[15px] top-8 w-0.5 h-full -bottom-0',
                        done ? 'bg-green-400' : 'bg-gray-200'
                      )} />
                    )}
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all',
                      current ? 'bg-brand text-white shadow-lg shadow-brand/30 ring-4 ring-brand/10' :
                      done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                    )}>
                      {done && !current ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <div className={cn('pb-5 flex-1')}>
                      <p className={cn('text-sm font-bold', current ? 'text-navy' : done ? 'text-green-700' : 'text-gray-400')}>
                        {step.label}
                      </p>
                      {current && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {order.status === 'PENDING' && 'Searching for a nearby rider...'}
                          {order.status === 'ACCEPTED' && 'Rider assigned, pay to continue'}
                          {order.status === 'PAID' && 'Payment done, rider will leave soon'}
                          {order.status === 'RIDER_LEFT' && (order.declaredEtaMinutes ? `ETA: ~${order.declaredEtaMinutes} min` : 'Heading to shop')}
                          {order.status === 'AT_SHOP' && 'Buying your item...'}
                          {order.status === 'ITEM_PURCHASED' && 'Review the item photos'}
                          {order.status === 'PHOTO_APPROVED' && 'Rider starting delivery'}
                          {order.status === 'DELIVERING' && 'On the way to you!'}
                          {order.status === 'ARRIVED' && 'Share OTP to receive item'}
                          {order.status === 'DELIVERED' && 'Order complete!'}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Cancelled banner */}
        {isCancelled && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-bold text-red-700 text-sm">{ORDER_STATUS_LABELS[order.status] || order.status}</p>
              {order.cancelReason && <p className="text-xs text-red-600 mt-0.5">{order.cancelReason}</p>}
            </div>
          </div>
        )}

        {/* ─── Item Photos ─── */}
        {photoUrls.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-navy flex items-center gap-2">
                <Camera className="w-4 h-4 text-brand" /> Item Photos
              </h3>
              <button onClick={() => setShowPhotoViewer(true)} className="text-xs font-bold text-brand flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> View Full
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-none">
              {photoUrls.map((url: string, i: number) => (
                <button key={i} onClick={() => setShowPhotoViewer(true)}
                  className="shrink-0 w-28 h-28 rounded-xl overflow-hidden border-2 border-gray-100 hover:border-brand/30 transition-all">
                  <img src={url} alt={`Item ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            {order.actualPrice != null && (
              <div className="mt-3 flex items-center gap-4 px-3 py-2 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-[11px] text-gray-400">Expected</p>
                  <p className="text-sm font-bold text-navy">{fmt.currency(order.expectedPrice)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
                <div>
                  <p className="text-[11px] text-gray-400">Actual</p>
                  <p className={cn('text-sm font-bold', order.actualPrice !== order.expectedPrice ? 'text-amber-600' : 'text-green-600')}>{fmt.currency(order.actualPrice)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Rider / Client Card ─── */}
        {counterpart && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            <Avatar src={counterpart.profilePhoto} name={counterpart.name} size="md" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-navy text-sm truncate">{counterpart.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <TrustBadge level={counterpart.trustLevel} />
                {counterpart.rating > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-gray-500">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />{counterpart.rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
            {isActiveOrder && (
              <button onClick={() => setShowChat(!showChat)}
                className="w-10 h-10 bg-brand-50 hover:bg-brand-100 rounded-xl flex items-center justify-center transition-colors">
                <MessageCircle className="w-5 h-5 text-brand" />
              </button>
            )}
          </div>
        )}

        {/* ─── ACTION AREA ─── */}
        <div className="space-y-2">
          {isClient && (
            <>
              {order.status === 'ACCEPTED' && !order.payment?.status?.match(/AUTHORIZED|CAPTURED/) && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-navy text-sm">Pay to Confirm</p>
                      <p className="text-xs text-gray-400">Rider is ready. Pay to start delivery.</p>
                    </div>
                  </div>
                  <Button className="w-full" size="lg" onClick={handlePay} loading={actionLoading === 'pay'}>
                    💳 Pay {fmt.currency(order.totalAmount)}
                  </Button>
                </div>
              )}

              {((order.status === 'ACCEPTED' && order.payment?.status?.match(/AUTHORIZED|CAPTURED/)) || order.status === 'PAID') && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-green-700 text-sm">Payment Secured</p>
                    <p className="text-xs text-green-600">{fmt.currency(order.totalAmount)} held safely until delivery</p>
                  </div>
                </div>
              )}

              {order.status === 'AT_SHOP' && (
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center shrink-0 animate-pulse-soft">
                    <Store className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-bold text-purple-700 text-sm">Rider is at the Shop</p>
                    <p className="text-xs text-purple-600">Purchasing your item. Photos coming soon...</p>
                  </div>
                </div>
              )}

              {order.status === 'ITEM_PURCHASED' && (
                <div className="bg-white rounded-2xl shadow-sm border-2 border-brand/20 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                      <Camera className="w-5 h-5 text-brand" />
                    </div>
                    <div>
                      <p className="font-bold text-navy text-sm">Verify Your Item</p>
                      <p className="text-xs text-gray-400">Check the photos and approve or reject</p>
                    </div>
                  </div>
                  {photoUrls.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-none">
                      {photoUrls.map((url: string, i: number) => (
                        <button key={i} onClick={() => setShowPhotoViewer(true)}
                          className="shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                  {order.actualPrice != null && (
                    <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl text-sm">
                      <span className="text-gray-500">Actual Price</span>
                      <span className={cn('font-bold', order.actualPrice !== order.expectedPrice ? 'text-amber-600' : 'text-green-600')}>
                        {fmt.currency(order.actualPrice)}
                        {order.actualPrice !== order.expectedPrice && (
                          <span className="text-xs text-gray-400 ml-1">(was {fmt.currency(order.expectedPrice)})</span>
                        )}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="danger" onClick={() => setShowReject(true)} loading={actionLoading === 'reject'}>
                      <XCircle className="w-4 h-4" /> Reject
                    </Button>
                    <Button onClick={() => doAction('approve', () => ordersApi.approvePhoto(id))} loading={actionLoading === 'approve'}>
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </Button>
                  </div>
                </div>
              )}

              {order.status === 'PHOTO_APPROVED' && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-green-700 text-sm">Photo Approved</p>
                    <p className="text-xs text-green-600">Rider will start delivering soon</p>
                  </div>
                </div>
              )}

              {order.status === 'DELIVERING' && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0 animate-pulse-soft">
                    <Truck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-blue-700 text-sm">On the Way!</p>
                    <p className="text-xs text-blue-600">Rider is heading to your location</p>
                  </div>
                </div>
              )}

              {order.status === 'ARRIVED' && (
                <div className="bg-white rounded-2xl shadow-sm border-2 border-green-300 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center animate-pulse-soft">
                      <MapPin className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-navy text-sm">Rider has Arrived!</p>
                      <p className="text-xs text-gray-400">Share OTP after receiving your item</p>
                    </div>
                  </div>
                  <Button className="w-full" size="lg" onClick={() => setShowOtp(true)}>
                    🔑 Share Delivery OTP
                  </Button>
                </div>
              )}

              {order.status === 'DELIVERED' && (
                hasRated ? (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                    <p className="text-sm font-bold text-green-700">You rated this order</p>
                    <Link href={`/ratings/${id}?ratedUserId=${order.riderId}`} className="ml-auto text-xs font-bold text-green-600">View →</Link>
                  </div>
                ) : (
                  <Link href={`/ratings/${id}?ratedUserId=${order.riderId}`}>
                    <Button className="w-full" size="lg" variant="secondary">
                      <Star className="w-4 h-4" /> Rate Your Rider
                    </Button>
                  </Link>
                )
              )}
            </>
          )}

          {isRider && (
            <>
              {order.status === 'ACCEPTED' && !order.payment?.status?.match(/AUTHORIZED|CAPTURED/) && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0 animate-pulse-soft">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-bold text-amber-700 text-sm">Waiting for Payment</p>
                    <p className="text-xs text-amber-600">Client needs to pay before you can proceed</p>
                  </div>
                </div>
              )}

              {((order.status === 'ACCEPTED' && order.payment?.status?.match(/AUTHORIZED|CAPTURED/)) || order.status === 'PAID') && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
                  <div className="bg-green-50 rounded-xl p-3 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
                    <p className="text-xs text-green-700 font-medium">{fmt.currency(order.totalAmount)} secured. Go buy the item!</p>
                  </div>
                  <Button className="w-full" size="lg" onClick={() => doAction('leaving', () => ordersApi.leaving(id))} loading={actionLoading === 'leaving'}>
                    🚴 I&apos;m Leaving Now
                  </Button>
                </div>
              )}

              {order.status === 'RIDER_LEFT' && (
                <Button className="w-full" size="lg" onClick={() => doAction('atShop', () => ordersApi.atShop(id))} loading={actionLoading === 'atShop'}>
                  <Store className="w-4 h-4" /> Arrived at Shop
                </Button>
              )}

              {order.status === 'AT_SHOP' && (
                <div className="bg-white rounded-2xl shadow-sm border-2 border-brand/20 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                      <Camera className="w-5 h-5 text-brand" />
                    </div>
                    <div>
                      <p className="font-bold text-navy text-sm">Purchase & Upload</p>
                      <p className="text-xs text-gray-400">Buy the item, take photos, send for verification</p>
                    </div>
                  </div>
                  <Button className="w-full" size="lg" onClick={() => setShowPhotoUpload(true)}>
                    <Camera className="w-4 h-4" /> Upload Photos & Price
                  </Button>
                </div>
              )}

              {order.status === 'ITEM_PURCHASED' && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0 animate-pulse-soft">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-bold text-amber-700 text-sm">Waiting for Approval</p>
                    <p className="text-xs text-amber-600">Client is reviewing the item photos</p>
                  </div>
                </div>
              )}

              {order.status === 'PHOTO_APPROVED' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
                  <div className="bg-green-50 rounded-xl p-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <p className="text-xs text-green-700 font-medium">Client approved! Head to delivery location.</p>
                  </div>
                  <Button className="w-full" size="lg" onClick={() => doAction('delivering', () => ordersApi.delivering(id))} loading={actionLoading === 'delivering'}>
                    🚴 Start Delivering
                  </Button>
                </div>
              )}

              {order.status === 'DELIVERING' && (
                <Button className="w-full" size="lg" onClick={() => doAction('arrived', () => ordersApi.arrived(id))} loading={actionLoading === 'arrived'}>
                  <MapPin className="w-4 h-4" /> Arrived at Location
                </Button>
              )}

              {order.status === 'ARRIVED' && (
                <Button className="w-full" size="lg" onClick={() => setShowOtp(true)}>
                  🔑 Enter Client OTP
                </Button>
              )}

              {order.status === 'DELIVERED' && (
                hasRated ? (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                    <p className="text-sm font-bold text-green-700">You rated this order</p>
                    <Link href={`/ratings/${id}?ratedUserId=${order.clientId}`} className="ml-auto text-xs font-bold text-green-600">View →</Link>
                  </div>
                ) : (
                  <Link href={`/ratings/${id}?ratedUserId=${order.clientId}`}>
                    <Button className="w-full" size="lg" variant="secondary"><Star className="w-4 h-4" /> Rate Client</Button>
                  </Link>
                )
              )}
            </>
          )}

          {['PENDING', 'ACCEPTED'].includes(order.status) && !order.payment?.status?.match(/AUTHORIZED|CAPTURED/) && (
            <button onClick={() => setShowCancel(true)}
              className="w-full py-3 text-sm font-bold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors">
              Cancel Order
            </button>
          )}
        </div>

        {/* ─── Inline Chat ─── */}
        {showChat && order.status !== 'PENDING' && !['DELIVERED', 'CANCELLED', 'ITEM_NOT_FOUND'].includes(order.status) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-navy text-sm flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-brand" /> Chat
              </h3>
              <button onClick={() => setShowChat(false)} className="text-xs font-bold text-gray-400 hover:text-gray-600">Close</button>
            </div>
            <div className="p-3 space-y-2 max-h-60 overflow-y-auto scrollbar-none">
              {messages.length === 0 && <p className="text-center text-sm text-gray-400 py-6">No messages yet</p>}
              {messages.map(msg => {
                const isMine = msg.sender.id === user?.id
                return (
                  <div key={msg.id} className={cn('flex gap-2', isMine ? 'flex-row-reverse' : '')}>
                    <Avatar src={msg.sender.profilePhoto} name={msg.sender.name} size="sm" className="shrink-0 mt-1" />
                    <div className={cn('max-w-[70%] rounded-2xl px-3 py-2', isMine ? 'bg-brand text-white rounded-tr-sm' : 'bg-gray-100 text-navy rounded-tl-sm')}>
                      {msg.photoUrl && <img src={msg.photoUrl} alt="" className="rounded-xl mb-1 max-w-full" />}
                      {msg.content && <p className="text-sm">{msg.content}</p>}
                      <p className={cn('text-[10px] mt-0.5', isMine ? 'text-white/60' : 'text-gray-400')}>{fmt.time(msg.createdAt)}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={chatEndRef} />
            </div>
            <div className="border-t border-gray-100 p-2">
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-2">
                {QUICK_MSGS.map(q => (
                  <button key={q.key} onClick={() => handleQuickMsg(q.key)}
                    className="shrink-0 px-2.5 py-1.5 bg-gray-100 rounded-full text-xs text-navy hover:bg-brand-50 hover:text-brand transition-colors whitespace-nowrap">
                    {q.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => fileRef.current?.click()} className="p-2.5 rounded-xl bg-gray-100 hover:bg-brand-50 text-gray-500 hover:text-brand transition-colors">
                  <ImageIcon className="w-4 h-4" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoSend(f) }} />
                <input className="flex-1 bg-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                  placeholder="Message..." value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMsg()} />
                <button onClick={handleSendMsg} disabled={!msgText.trim()} className="p-2.5 rounded-xl bg-brand text-white disabled:opacity-40 hover:bg-brand-600 transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat FAB */}
        {!showChat && isActiveOrder && order.status !== 'PENDING' && (
          <button onClick={() => setShowChat(true)}
            className="fixed bottom-24 right-4 md:right-8 z-30 w-14 h-14 bg-brand text-white rounded-full shadow-xl shadow-brand/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
            <MessageCircle className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* ─── MODALS ─── */}
      <Modal open={showCancel} onClose={() => setShowCancel(false)} title="Cancel Order">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Are you sure? This action cannot be undone.</p>
          <Input label="Reason" placeholder="Why are you cancelling?" value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowCancel(false)}>Back</Button>
            <Button variant="danger" className="flex-1" loading={actionLoading === 'cancel'}
              onClick={() => doAction('cancel', async () => { await ordersApi.cancel(id, cancelReason); setShowCancel(false) })}>
              Cancel Order
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showReject} onClose={() => setShowReject(false)} title="Reject Item">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">The rider will need to buy the correct item again.</p>
          <Input label="What's wrong?" placeholder="Wrong brand, wrong item..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowReject(false)}>Back</Button>
            <Button variant="danger" className="flex-1" loading={actionLoading === 'reject'}
              onClick={() => doAction('reject', async () => { await ordersApi.rejectPhoto(id, rejectReason); setShowReject(false) })}>
              Reject
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showOtp} onClose={() => setShowOtp(false)} title={isClient ? 'Delivery OTP' : 'Enter OTP'}>
        <div className="space-y-4 text-center">
          {isClient ? (
            <>
              {order?.deliveryOtp ? (
                <>
                  <p className="text-sm text-gray-500">Share only <strong>after</strong> receiving your item</p>
                  <div className="bg-green-50 border-2 border-dashed border-green-300 rounded-2xl py-6 px-4">
                    <span className="text-4xl font-extrabold tracking-[12px] text-green-600">{order.deliveryOtp}</span>
                  </div>
                  <p className="text-xs text-gray-400">Valid for 15 minutes</p>
                </>
              ) : (
                <p className="text-sm text-gray-500">Check your email for the OTP</p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500">Ask client for the 4-digit OTP</p>
              <div className="flex gap-2 justify-center">
                {otpInput.map((d, i) => (
                  <input key={i} ref={el => { otpRefs.current[i] = el }}
                    className="w-14 h-16 text-center text-2xl font-extrabold border-2 border-gray-200 rounded-xl focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
                    maxLength={1} value={d} onChange={e => handleOtpChange(i, e.target.value)} />
                ))}
              </div>
              <Button className="w-full" size="lg" onClick={handleOtpSubmit} loading={actionLoading === 'otp'}>
                Verify & Complete
              </Button>
            </>
          )}
        </div>
      </Modal>

      <Modal open={showPhotoUpload} onClose={() => setShowPhotoUpload(false)} title="Upload Item Photos">
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center relative">
            <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">Tap to take photos</p>
            <p className="text-xs text-gray-400 mt-1">Show the item clearly</p>
            <input type="file" accept="image/*" capture="environment" multiple className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={e => { const files = Array.from(e.target.files || []); setPhotoFiles(prev => [...prev, ...files]) }} />
          </div>
          {photoFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photoFiles.map((f, i) => (
                <div key={i} className="relative">
                  <img src={URL.createObjectURL(f)} alt="" className="rounded-xl w-full h-24 object-cover" />
                  <button onClick={() => setPhotoFiles(prev => prev.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center shadow-sm">×</button>
                </div>
              ))}
            </div>
          )}
          <Input label="Actual price paid (₹)" type="number" placeholder={`Expected: ₹${order?.expectedPrice || ''}`} value={actualPrice} onChange={e => setActualPrice(e.target.value)} />
          <Button className="w-full" size="lg" onClick={handleItemPurchased} loading={actionLoading === 'purchased'} disabled={photoFiles.length === 0 || !actualPrice}>
            Send for Approval
          </Button>
        </div>
      </Modal>

      {/* Photo viewer */}
      {showPhotoViewer && photoUrls.length > 0 && (
        <PhotoViewer urls={photoUrls} onClose={() => setShowPhotoViewer(false)} />
      )}

      {/* Payment confirming overlay */}
      {actionLoading === 'confirming' && (
        <div className="fixed inset-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
          <div className="w-20 h-20 bg-gradient-to-br from-brand to-brand-600 rounded-3xl flex items-center justify-center shadow-xl shadow-brand/30 mb-6 animate-pulse-soft">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
          <p className="text-xl font-extrabold text-navy">Processing Payment</p>
          <p className="text-sm text-gray-400 mt-1.5">Please wait a moment...</p>
        </div>
      )}

      <StripePaymentModal open={paymentModal.open} onClose={() => setPaymentModal({ open: false, clientSecret: '', amount: 0 })}
        clientSecret={paymentModal.clientSecret} amount={paymentModal.amount} onSuccess={handlePaymentSuccess} />
    </div>
  )
}
