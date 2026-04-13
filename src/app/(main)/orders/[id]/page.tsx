'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { ordersApi, paymentsApi, chatApi, uploadApi, trackingApi, getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { initSocket, joinOrderRoom, leaveOrderRoom, sendChatMessage, EVENTS } from '@/lib/socket'
import { Order, Message, RiderLocation } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { StatusBadge, TrustBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { LiveMap } from '@/components/ui/LiveMap'
import { fmt, cn } from '@/lib/utils'
import { Send, Image as ImageIcon, CheckCircle2, XCircle, MapPin, Star, AlertTriangle, Package, Loader2, Camera } from 'lucide-react'
import toast from 'react-hot-toast'
import { loadStripe } from '@stripe/stripe-js'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'

// Dynamically import LiveMap to prevent SSR issues with Leaflet
const LiveMapDynamic = dynamic(
  () => import('@/components/ui/LiveMap').then(m => ({ default: m.LiveMap })),
  { ssr: false, loading: () => <div className="w-full h-64 rounded-2xl bg-gray-100 animate-pulse" /> }
)

const TRACKABLE_STATUSES = ['RIDER_LEFT', 'AT_SHOP', 'ITEM_PURCHASED', 'PHOTO_APPROVED', 'DELIVERING', 'ARRIVED']

const QUICK_MSGS = [
  { key: 'ON_THE_WAY', label: '🚴 On my way' },
  { key: 'ARRIVED', label: '📍 Arrived' },
  { key: 'SHARE_OTP', label: '🔑 Share OTP' },
  { key: 'ITEM_NOT_AVAILABLE', label: '❓ Not available?' },
  { key: 'WAIT_OUTSIDE', label: '⏳ Wait outside' },
  { key: 'COMING_IN_5', label: '⏱️ 5 min away' },
]

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // FIXED: Type assertion ensures Next.js and TypeScript know 'id' is a string
  const { id } = useParams() as { id: string }
  
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
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [actualPrice, setActualPrice] = useState('')
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)

  // ── Live map state ─────────────────────────────────────────────────────────
  const [lastKnownLocation, setLastKnownLocation] = useState<RiderLocation | null>(null)
  // This ref holds the updater function exposed by LiveMap
  const mapLocationUpdater = useRef<((loc: RiderLocation) => void) | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const isRider = order?.riderId === user?.id
  const isClient = order?.clientId === user?.id
  const showMap = order && TRACKABLE_STATUSES.includes(order.status) && isClient

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await ordersApi.getById(id)
      setOrder(data.data)
    } catch { toast.error('Order not found') }
    finally { setLoading(false) }
  }, [id])

  // Fetch last known location from REST when order enters tracking phase
  useEffect(() => {
    if (!order) return
    if (TRACKABLE_STATUSES.includes(order.status) && isClient) {
      trackingApi.getLocation(id)
        .then(r => { if (r.data.data) setLastKnownLocation(r.data.data) })
        .catch(() => {})
    }
  }, [order?.status, isClient, id])

  useEffect(() => {
    fetchOrder()
    chatApi.history(id).then(r => setMessages(r.data.data || [])).catch(() => {})
  }, [fetchOrder, id])

  useEffect(() => {
    if (!accessToken) return
    const sock = initSocket(accessToken)
    joinOrderRoom(id)

    sock.on(EVENTS.ORDER_STATUS, ({ status }: any) => {
      setOrder(p => p ? { ...p, status } : p)
      toast.success(`Status: ${status.replace(/_/g, ' ')}`)
    })

    sock.on(EVENTS.MESSAGE_RECEIVE, (msg: Message) => {
      setMessages(p => [...p, msg])
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    })

    // ── Live location — forward to map component via stored updater ──────────
    sock.on(EVENTS.RIDER_LOCATION, (payload: any) => {
      const loc: RiderLocation = {
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy,
        heading: payload.heading,
        speed: payload.speed,
        updatedAt: payload.timestamp ?? new Date().toISOString(),
      }
      // Update last known for re-mounts
      setLastKnownLocation(loc)
      // Push directly into the map for smooth animation
      if (mapLocationUpdater.current) mapLocationUpdater.current(loc)
    })

    return () => {
      leaveOrderRoom(id)
      sock.off(EVENTS.ORDER_STATUS)
      sock.off(EVENTS.MESSAGE_RECEIVE)
      sock.off(EVENTS.RIDER_LOCATION)
    }
  }, [accessToken, id])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const doAction = async (action: string, fn: () => Promise<any>) => {
    setActionLoading(action)
    try { await fn(); await fetchOrder() } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setActionLoading('') }
  }

  const handlePay = async () => {
    doAction('pay', async () => {
      const { data } = await paymentsApi.createIntent(id)
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')
      if (!stripe) return
      const { error } = await stripe.confirmCardPayment(data.data.clientSecret, {
        payment_method: { card: { number: '4242424242424242', exp_month: 12, exp_year: 2030, cvc: '123' } as any },
      })
      if (error) throw new Error(error.message)
      toast.success('Payment successful! Rider can now leave.')
    })
  }

  const handleSendMsg = () => {
    if (!msgText.trim()) return
    sendChatMessage(id, msgText)
    setMsgText('')
  }

  const handleQuickMsg = (key: string) => sendChatMessage(id, undefined, undefined, key)

  const handlePhotoSend = async (file: File) => {
    doAction('photo', async () => {
      const { data } = await uploadApi.chatPhoto(file, id)
      setMessages(p => [...p, data.data.message])
    })
  }

  const handleItemPurchased = async () => {
    if (!photoFile) { toast.error('Take a photo of the item first'); return }
    if (!actualPrice) { toast.error('Enter actual price paid'); return }
    doAction('purchased', async () => {
      const { data: upData } = await uploadApi.orderItemPhoto(photoFile, id)
      await ordersApi.itemPurchased(id, upData.data.url, parseFloat(actualPrice))
      setPhotoFile(null); setShowPhotoUpload(false)
      toast.success('Photo sent to client for approval!')
    })
  }

  const handleOtpSubmit = async () => {
    const code = otpInput.join('')
    if (code.length !== 4) { toast.error('Enter 4-digit OTP'); return }
    doAction('otp', async () => {
      await ordersApi.verifyOtp(id, code)
      toast.success('Delivered! 🎉 Payment released.')
      setShowOtp(false)
    })
  }

  const handleOtpChange = (i: number, val: string) => {
    const v = val.replace(/\D/g, '').slice(-1)
    const next = [...otpInput]; next[i] = v; setOtpInput(next)
    if (v && i < 3) otpRefs.current[i + 1]?.focus()
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-brand" />
    </div>
  )
  if (!order) return <div className="page-container text-center text-gray-500">Order not found</div>

  const counterpart = isClient ? order.rider : order.client

  return (
    <div className="page-container max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-brand" />
              </div>
              <div>
                <h1 className="font-display font-bold text-navy">{order.itemName}</h1>
                <p className="text-xs text-gray-500 font-sans">#{order.id.slice(-8).toUpperCase()} · {fmt.datetime(order.createdAt)}</p>
              </div>
            </div>
            <StatusBadge status={order.status} />
          </div>

          {order.itemDescription && (
            <p className="text-sm text-gray-600 font-sans mt-3 bg-gray-50 rounded-xl px-3 py-2">{order.itemDescription}</p>
          )}

          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'Item', val: fmt.currency(order.expectedPrice) },
              { label: 'Delivery', val: fmt.currency(order.deliveryFee) },
              { label: 'Platform', val: fmt.currency(order.platformFee) },
              { label: 'Tip', val: fmt.currency(order.tip) },
            ].map(c => (
              <div key={c.label} className="bg-gray-50 rounded-xl py-2">
                <p className="text-[11px] text-gray-500 font-sans">{c.label}</p>
                <p className="text-sm font-display font-bold text-navy">{c.val}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between items-center font-display font-bold text-navy bg-brand-50 rounded-xl px-3 py-2">
            <span>Total</span><span className="text-brand text-lg">{fmt.currency(order.totalAmount)}</span>
          </div>
        </CardContent>
      </Card>

      {/* ── LIVE MAP — shown to client when rider is in transit ── */}
      {showMap && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-navy text-sm">Rider Location</h3>
              <span className="text-xs text-gray-500 font-sans">Updates every 5 seconds</span>
            </div>
            <LiveMapDynamic
              orderId={id}
              lastKnownLocation={lastKnownLocation}
              onLocationRef={(fn) => { mapLocationUpdater.current = fn }}
            />
            {lastKnownLocation && (
              <p className="text-xs text-gray-400 font-sans mt-2 text-right">
                Last update: {fmt.relative(lastKnownLocation.updatedAt)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Counterpart info */}
      {counterpart && (
        <Card>
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar src={counterpart.profilePhoto} name={counterpart.name} size="md" />
              <div>
                <p className="font-display font-semibold text-navy text-sm">{counterpart.name}</p>
                <TrustBadge level={counterpart.trustLevel} />
              </div>
            </div>
            <div className="text-right">
              {counterpart.rating > 0 && (
                <div className="flex items-center gap-1 justify-end">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-bold font-display">{counterpart.rating.toFixed(1)}</span>
                </div>
              )}
              <p className="text-xs text-gray-500 font-sans">{counterpart.completedOrders} orders</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {isClient && (
          <>
            {order.status === 'ACCEPTED' && !order.payment?.status?.match(/AUTHORIZED|CAPTURED/) && (
              <Button className="w-full" size="lg" onClick={handlePay} loading={actionLoading === 'pay'}>
                💳 Pay {fmt.currency(order.totalAmount)} to Confirm
              </Button>
            )}
            {order.status === 'ITEM_PURCHASED' && (
              <div className="space-y-2">
                {order.purchasedPhotoUrl && (
                  <div className="rounded-2xl overflow-hidden border-2 border-brand/20">
                    <img src={order.purchasedPhotoUrl} alt="Purchased item" className="w-full max-h-64 object-cover" />
                    <div className="p-3 bg-brand-50">
                      <p className="text-sm font-semibold text-navy font-display">Rider bought: {order.itemName}</p>
                      {order.actualPrice && <p className="text-xs text-gray-600 font-sans">Paid: {fmt.currency(order.actualPrice)}</p>}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => doAction('approve', () => ordersApi.approvePhoto(id))} loading={actionLoading === 'approve'}>
                    <CheckCircle2 className="w-4 h-4" /> Approve Photo
                  </Button>
                  <Button variant="danger" onClick={() => setShowReject(true)}>
                    <XCircle className="w-4 h-4" /> Reject
                  </Button>
                </div>
              </div>
            )}
            {order.status === 'ARRIVED' && (
              <Button className="w-full" size="lg" onClick={() => setShowOtp(true)}>
                🔑 Share Delivery OTP
              </Button>
            )}
            {order.status === 'DELIVERED' && (
              <Link href={`/ratings/${id}?ratedUserId=${order.riderId}`}>
                <Button className="w-full" variant="secondary">
                  <Star className="w-4 h-4" /> Rate Your Rider
                </Button>
              </Link>
            )}
          </>
        )}

        {isRider && (
          <>
            {order.status === 'ACCEPTED' && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="py-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-800 font-sans">Wait for client payment before leaving. You have 30 minutes.</p>
                </CardContent>
              </Card>
            )}
            {order.status === 'ACCEPTED' && order.payment?.status === 'AUTHORIZED' && (
              <Button className="w-full" size="lg" onClick={() => doAction('leaving', () => ordersApi.leaving(id))} loading={actionLoading === 'leaving'}>
                🚴 I Am Leaving Now
              </Button>
            )}
            {order.status === 'RIDER_LEFT' && (
              <Button className="w-full" onClick={() => doAction('atshop', () => ordersApi.atShop(id))} loading={actionLoading === 'atshop'}>
                <MapPin className="w-4 h-4" /> Arrived at Shop
              </Button>
            )}
            {order.status === 'AT_SHOP' && (
              <div className="space-y-2">
                <Button className="w-full" onClick={() => setShowPhotoUpload(true)}>
                  <Camera className="w-4 h-4" /> Take Item Photo
                </Button>
                <Button variant="outline" className="w-full" onClick={() => doAction('notfound', () => ordersApi.itemNotFound(id))} loading={actionLoading === 'notfound'}>
                  Item Not Found
                </Button>
              </div>
            )}
            {order.status === 'PHOTO_APPROVED' && (
              <Button className="w-full" onClick={() => doAction('delivering', () => ordersApi.atShop(id))} loading={actionLoading === 'delivering'}>
                Heading Back 🏃
              </Button>
            )}
            {order.status === 'DELIVERING' && (
              <Button className="w-full" size="lg" onClick={() => doAction('arrived', () => ordersApi.arrived(id))} loading={actionLoading === 'arrived'}>
                <MapPin className="w-4 h-4" /> Arrived at Delivery Location
              </Button>
            )}
            {order.status === 'ARRIVED' && (
              <Button className="w-full" size="lg" onClick={() => setShowOtp(true)}>
                🔑 Enter Client OTP
              </Button>
            )}
            {order.status === 'DELIVERED' && (
              <Link href={`/ratings/${id}?ratedUserId=${order.clientId}`}>
                <Button className="w-full" variant="secondary"><Star className="w-4 h-4" /> Rate Client</Button>
              </Link>
            )}
          </>
        )}

        {['PENDING', 'ACCEPTED'].includes(order.status) && (
          <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50" onClick={() => setShowCancel(true)}>
            Cancel Order
          </Button>
        )}
      </div>

      {/* Chat */}
      {order.status !== 'PENDING' && !['DELIVERED', 'CANCELLED', 'ITEM_NOT_FOUND'].includes(order.status) && (
        <Card>
          <CardContent className="pt-4 pb-2">
            <h3 className="font-display font-semibold text-navy text-sm mb-3">Chat</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-none mb-3">
              {messages.map(msg => {
                const isMine = msg.sender.id === user?.id
                return (
                  <div key={msg.id} className={cn('flex gap-2', isMine ? 'flex-row-reverse' : '')}>
                    <Avatar src={msg.sender.profilePhoto} name={msg.sender.name} size="sm" className="shrink-0 mt-1" />
                    <div className={cn('max-w-[70%] rounded-2xl px-3 py-2', isMine ? 'bg-brand text-white rounded-tr-sm' : 'bg-gray-100 text-navy rounded-tl-sm')}>
                      {msg.photoUrl && <img src={msg.photoUrl} alt="" className="rounded-xl mb-1 max-w-full" />}
                      {msg.content && <p className="text-sm font-sans">{msg.content}</p>}
                      <p className={cn('text-[10px] mt-0.5', isMine ? 'text-white/60' : 'text-gray-400')}>{fmt.time(msg.createdAt)}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={chatEndRef} />
            </div>

            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-2">
              {QUICK_MSGS.map(q => (
                <button key={q.key} onClick={() => handleQuickMsg(q.key)}
                  className="shrink-0 px-2.5 py-1.5 bg-gray-100 rounded-full text-xs font-sans text-navy hover:bg-brand-50 hover:text-brand transition-colors whitespace-nowrap">
                  {q.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mt-2">
              <button onClick={() => fileRef.current?.click()} className="p-2.5 rounded-xl bg-gray-100 hover:bg-brand-50 text-gray-600 hover:text-brand transition-colors">
                <ImageIcon className="w-4 h-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoSend(f) }} />
              <input className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-brand/30"
                placeholder="Type a message..." value={msgText} onChange={e => setMsgText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMsg()} />
              <button onClick={handleSendMsg} disabled={!msgText.trim()}
                className="p-2.5 rounded-xl bg-brand text-white disabled:opacity-40 hover:bg-brand-500 transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <Modal open={showCancel} onClose={() => setShowCancel(false)} title="Cancel Order">
        <div className="space-y-4">
          <Input label="Reason for cancellation" placeholder="Please explain why you're cancelling..."
            value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowCancel(false)}>Back</Button>
            <Button variant="danger" className="flex-1" loading={actionLoading === 'cancel'}
              onClick={() => doAction('cancel', async () => { await ordersApi.cancel(id, cancelReason); setShowCancel(false) })}>
              Confirm Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showReject} onClose={() => setShowReject(false)} title="Reject Photo">
        <div className="space-y-4">
          <Input label="Why are you rejecting?" placeholder="Wrong brand, wrong item..."
            value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowReject(false)}>Back</Button>
            <Button variant="danger" className="flex-1" loading={actionLoading === 'reject'}
              onClick={() => doAction('reject', async () => { await ordersApi.rejectPhoto(id, rejectReason); setShowReject(false) })}>
              Reject
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showOtp} onClose={() => setShowOtp(false)} title={isClient ? 'Share OTP with Rider' : 'Enter Delivery OTP'}>
        <div className="space-y-4 text-center">
          {isClient ? (
            <p className="text-gray-600 font-sans text-sm">Check your email for the 4-digit OTP. Share it with the rider when you receive your item.</p>
          ) : (
            <>
              <p className="text-gray-600 font-sans text-sm">Ask the client for the 4-digit OTP from their email.</p>
              <div className="flex gap-2 justify-center">
                {otpInput.map((d, i) => (
                  <input key={i} ref={el => { otpRefs.current[i] = el }}
                    className="w-14 h-16 text-center text-2xl font-display font-bold border-2 border-gray-200 rounded-xl focus:border-brand focus:outline-none"
                    maxLength={1} value={d} onChange={e => handleOtpChange(i, e.target.value)} />
                ))}
              </div>
              <Button className="w-full" size="lg" onClick={handleOtpSubmit} loading={actionLoading === 'otp'}>
                Verify OTP & Complete
              </Button>
            </>
          )}
        </div>
      </Modal>

      <Modal open={showPhotoUpload} onClose={() => setShowPhotoUpload(false)} title="Upload Item Photo">
        <div className="space-y-4">
          <input type="file" accept="image/*" capture="environment" className="w-full text-sm font-sans"
            onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
          {photoFile && <img src={URL.createObjectURL(photoFile)} alt="Preview" className="rounded-xl w-full max-h-48 object-cover" />}
          <Input label="Actual price paid (₹)" type="number" placeholder="195" value={actualPrice} onChange={e => setActualPrice(e.target.value)} />
          <Button className="w-full" onClick={handleItemPurchased} loading={actionLoading === 'purchased'} disabled={!photoFile || !actualPrice}>
            Send Photo to Client
          </Button>
        </div>
      </Modal>
    </div>
  )
}