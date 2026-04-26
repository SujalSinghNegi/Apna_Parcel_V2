'use client'
import { useEffect, useState, useRef } from 'react'
import { useAuthStore } from '@/store/auth'
import { db } from '@/lib/firebase'
import { doc, onSnapshot, updateDoc, collection, addDoc, query, orderBy, serverTimestamp } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Order, Message, RiderLocation, ORDER_STATUS_LABELS } from '@/types'
import { Button } from '@/components/ui/Button'
import { StatusBadge, TrustBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { fmt, cn } from '@/lib/utils'
import {
  Send, Image as ImageIcon, CheckCircle2, XCircle, MapPin, Star,
  Package, Loader2, Camera, ChevronDown, Clock, Store, CreditCard, 
  Truck, ShieldCheck, ArrowLeft, Eye, ChevronRight, MessageCircle, Bike
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useParams, useRouter } from 'next/navigation'

const LiveMapDynamic = dynamic(
  () => import('@/components/ui/LiveMap').then(m => ({ default: m.LiveMap })),
  { ssr: false, loading: () => <div className="w-full h-48 rounded-2xl bg-gray-100 animate-pulse" /> }
)

const TRACKABLE = ['RIDER_LEFT', 'AT_SHOP', 'ITEM_PURCHASED', 'PHOTO_APPROVED', 'DELIVERING', 'ARRIVED']

/* ─── Order Flow Steps ─── */
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
        </div>
        <div className="h-px bg-gray-100" />
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
              className={cn('w-16 h-16 rounded-xl border-2 overflow-hidden transition-all', i === idx ? 'border-brand scale-105' : 'border-white/20 opacity-60')}>
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
  const { user } = useAuthStore() as any
  
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
  const [hasRated, setHasRated] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showPhotoViewer, setShowPhotoViewer] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)

  const [lastKnownLocation, setLastKnownLocation] = useState<RiderLocation | null>(null)
  const mapLocationUpdater = useRef<((loc: RiderLocation) => void) | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

 // Use user.uid for Firebase, fallback to user.id for compatibility
  const currentUserId = user?.uid || user?.id;
  const isRider = order?.riderId === currentUserId;
  const isClient = order?.clientId === currentUserId;

  // IMPORTANT: Ensure counterpart logic doesn't crash if objects are missing
  const counterpart = isClient ? order?.rider : order?.client;
  const showMap = order && TRACKABLE.includes(order.status) && isClient

  // ──🔥 REAL-TIME ORDER SYNC ───────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "orders", id), (docSnap) => {
      if (docSnap.exists()) {
        setOrder({ id: docSnap.id, ...docSnap.data() } as any);
        setLoading(false);
      } else {
        toast.error('Order not found');
        setLoading(false);
      }
    });
    return () => unsub();
  }, [id]);

  // ──🔥 REAL-TIME CHAT SYNC ────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const messagesRef = collection(db, "orders", id, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setMessages(msgs);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsub();
  }, [id]);

  // ──🔥 STATUS ACTIONS ─────────────────────────────────────────────────────
  const updateStatus = async (status: string, extraData = {}) => {
    setActionLoading(status.toLowerCase());
    try {
      await updateDoc(doc(db, "orders", id), {
        status,
        updatedAt: serverTimestamp(),
        ...extraData
      });
      toast.success(`Order updated to ${status.replace(/_/g, ' ')}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to update order");
    } finally {
      setActionLoading('');
    }
  };

  const handlePay = async () => {
    setActionLoading('pay');
    // Mock Payment Flow for Serverless Setup
    setTimeout(async () => {
      await updateStatus('PAID');
      toast.success('Payment successful! ✅');
      setActionLoading('');
    }, 1500);
  };

  const handleSendMsg = async (textOveride?: string) => {
    const text = textOveride || msgText;
    if (!text.trim()) return;
    
    setMsgText('');
    await addDoc(collection(db, 'orders', id, 'messages'), {
      content: text,
      sender: { id: user.uid, name: user.name, profilePhoto: user.profilePhoto || '' },
      createdAt: serverTimestamp()
    });
  };

  const handlePhotoSend = async (file: File) => {
    toast('Uploading photo...', { icon: '⏳' });
    try {
      const storage = getStorage();
      const photoRef = ref(storage, `chat/${id}/${Date.now()}_${file.name}`);
      await uploadBytes(photoRef, file);
      const url = await getDownloadURL(photoRef);
      
      await addDoc(collection(db, 'orders', id, 'messages'), {
        photoUrl: url,
        sender: { id: user.uid, name: user.name, profilePhoto: user.profilePhoto || '' },
        createdAt: serverTimestamp()
      });
    } catch (e) {
      toast.error("Photo upload failed. Ensure Storage Rules are public for testing.");
    }
  };

  const handleItemPurchased = async () => {
    if (photoFiles.length === 0) { toast.error('Take at least one photo'); return; }
    if (!actualPrice) { toast.error('Enter actual price'); return; }
    
    setActionLoading('purchased');
    try {
      const storage = getStorage();
      const urls: string[] = [];
      
      for (const file of photoFiles) {
        const photoRef = ref(storage, `orders/${id}/receipts/${Date.now()}_${file.name}`);
        await uploadBytes(photoRef, file);
        urls.push(await getDownloadURL(photoRef));
      }
      
      await updateStatus('ITEM_PURCHASED', {
        purchasedPhotoUrls: urls,
        actualPrice: parseFloat(actualPrice)
      });
      
      setPhotoFiles([]); 
      setShowPhotoUpload(false);
      toast.success('Photos sent for approval!');
    } catch (e) {
      toast.error("Upload failed.");
      setActionLoading('');
    }
  };

  const handleOtpSubmit = async () => {
    const code = otpInput.join('');
    if (code.length !== 4) { toast.error('Enter 4-digit OTP'); return; }
    
    // In a real app, verify against the OTP generated in Firestore
    // For migration, we will accept any 4-digit code to complete the flow.
    setActionLoading('otp');
    await updateStatus('DELIVERED');
    toast.success('Order successfully Delivered! 🎉');
    setShowOtp(false);
  };

  const handleOtpChange = (i: number, val: string) => {
    const v = val.replace(/\D/g, '').slice(-1)
    const next = [...otpInput]; next[i] = v; setOtpInput(next)
    if (v && i < 3) otpRefs.current[i + 1]?.focus()
  }
if (loading) return <OrderSkeleton />
  
  // If loading finished but Firestore returned nothing
  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-gray-500">Order not found or has been deleted.</p>
        <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
      </div>
    )
  }
  //const counterpart = isClient ? order.rider : order.client
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

        ─── Live Map ───
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

        {/* ─── Searching for Rider Banner (PENDING) ─── */}
        {order.status === 'PENDING' && (
          <div className="bg-gradient-to-r from-brand/10 via-brand/5 to-orange-50 dark:from-brand/20 dark:via-brand/10 dark:to-orange-500/10 rounded-2xl border border-brand/20 overflow-hidden">
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 shrink-0">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="absolute inset-0 rounded-full border border-brand/40 animate-ping"
                      style={{ animationDelay: `${i * 0.6}s`, animationDuration: '2s' }} />
                  ))}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-brand/20 rounded-full flex items-center justify-center">
                      <Bike className="w-4 h-4 text-brand" />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="font-extrabold text-navy dark:text-white text-sm">Searching for a rider</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {order.shopMode === 'SINGLE_SHOP' && order.shopName ? `📍 ${order.shopName}` : ''}
                    {order.shopMode === 'MULTIPLE_SHOPS' ? '🏬 Checking 2–3 shops nearby' : ''}
                    {order.shopMode === 'ENTIRE_AREA' ? '🗺️ Searching all of Dwarahat' : ''}
                    {order.shopMode === 'URGENT' ? '⚡ Priority delivery' : ''}
                  </p>
                </div>
              </div>
              <div className="relative h-1.5 bg-gray-200/60 dark:bg-gray-700/60 rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-brand to-orange-400 rounded-full animate-search-strip" />
              </div>
            </div>
          </div>
        )}

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
          </div>
        )}

        {/* ─── ACTION AREA ─── */}
        <div className="space-y-2">
          {isClient && (
            <>
              {order.status === 'ACCEPTED' && (
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

              {order.status === 'PAID' && (
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
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="danger" onClick={() => setShowReject(true)} loading={actionLoading === 'reject'}>
                      <XCircle className="w-4 h-4" /> Reject
                    </Button>
                    <Button onClick={() => updateStatus('PHOTO_APPROVED')} loading={actionLoading === 'photo_approved'}>
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </Button>
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
                      <p className="text-xs text-gray-400">Share your 4-Digit OTP to complete order</p>
                    </div>
                  </div>
                  <div className="bg-green-50 border-2 border-dashed border-green-300 rounded-2xl py-4 px-4 text-center">
                    <span className="text-3xl font-extrabold tracking-[12px] text-green-600">8421</span>
                  </div>
                </div>
              )}
            </>
          )}

          {isRider && (
            <>
              {order.status === 'ACCEPTED' && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0 animate-pulse-soft">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-bold text-amber-700 text-sm">Waiting for Payment</p>
                  </div>
                </div>
              )}

              {order.status === 'PAID' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
                  <div className="bg-green-50 rounded-xl p-3 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
                    <p className="text-xs text-green-700 font-medium">{fmt.currency(order.totalAmount)} secured. Go buy the item!</p>
                  </div>
                  <Button className="w-full" size="lg" onClick={() => updateStatus('RIDER_LEFT')} loading={actionLoading === 'rider_left'}>
                    🚴 I&apos;m Leaving Now
                  </Button>
                </div>
              )}

              {order.status === 'RIDER_LEFT' && (
                <Button className="w-full" size="lg" onClick={() => updateStatus('AT_SHOP')} loading={actionLoading === 'at_shop'}>
                  <Store className="w-4 h-4" /> Arrived at Shop
                </Button>
              )}

              {order.status === 'AT_SHOP' && (
                <div className="bg-white rounded-2xl shadow-sm border-2 border-brand/20 p-4 space-y-3">
                  <Button className="w-full" size="lg" onClick={() => setShowPhotoUpload(true)}>
                    <Camera className="w-4 h-4" /> Upload Photos & Price
                  </Button>
                </div>
              )}

              {order.status === 'PHOTO_APPROVED' && (
                <Button className="w-full" size="lg" onClick={() => updateStatus('DELIVERING')} loading={actionLoading === 'delivering'}>
                  🚴 Start Delivering
                </Button>
              )}

              {order.status === 'DELIVERING' && (
                <Button className="w-full" size="lg" onClick={() => updateStatus('ARRIVED')} loading={actionLoading === 'arrived'}>
                  <MapPin className="w-4 h-4" /> Arrived at Location
                </Button>
              )}

              {order.status === 'ARRIVED' && (
                <Button className="w-full" size="lg" onClick={() => setShowOtp(true)}>
                  🔑 Enter Client OTP
                </Button>
              )}
            </>
          )}

          {['PENDING', 'ACCEPTED'].includes(order.status) && (
            <button onClick={() => setShowCancel(true)} className="w-full py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-2xl">
              Cancel Order
            </button>
          )}
        </div>

        {/* ─── Inline Chat ─── */}
        {showChat && order.status !== 'PENDING' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-navy text-sm flex items-center gap-2"><MessageCircle className="w-4 h-4 text-brand" /> Chat</h3>
              <button onClick={() => setShowChat(false)} className="text-xs font-bold text-gray-400 hover:text-gray-600">Close</button>
            </div>
            <div className="p-3 space-y-2 max-h-60 overflow-y-auto scrollbar-none">
              {messages.length === 0 && <p className="text-center text-sm text-gray-400 py-6">No messages yet</p>}
              {messages.map(msg => {
                const isMine = msg.sender?.id === user?.uid
                return (
                  <div key={msg.id} className={cn('flex gap-2', isMine ? 'flex-row-reverse' : '')}>
                    <Avatar src={msg.sender?.profilePhoto} name={msg.sender?.name} size="sm" className="shrink-0 mt-1" />
                    <div className={cn('max-w-[70%] rounded-2xl px-3 py-2', isMine ? 'bg-brand text-white' : 'bg-gray-100 text-navy')}>
                      {msg.photoUrl && <img src={msg.photoUrl} alt="" className="rounded-xl mb-1 max-w-full" />}
                      {msg.content && <p className="text-sm">{msg.content}</p>}
                    </div>
                  </div>
                )
              })}
              <div ref={chatEndRef} />
            </div>
            <div className="border-t border-gray-100 p-2">
              <div className="flex gap-2">
                <button onClick={() => fileRef.current?.click()} className="p-2.5 bg-gray-100 text-gray-500 rounded-xl"><ImageIcon className="w-4 h-4" /></button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoSend(f) }} />
                <input className="flex-1 bg-gray-100 rounded-xl px-3 py-2.5 text-sm" placeholder="Message..." value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMsg()} />
                <button onClick={() => handleSendMsg()} className="p-2.5 bg-brand text-white rounded-xl"><Send className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        )}

        {!showChat && order.status !== 'PENDING' && (
          <button onClick={() => setShowChat(true)} className="fixed bottom-24 right-4 z-30 w-14 h-14 bg-brand text-white rounded-full shadow-xl flex items-center justify-center">
            <MessageCircle className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* ─── MODALS ─── */}
      <Modal open={showCancel} onClose={() => setShowCancel(false)} title="Cancel Order">
        <div className="space-y-4">
          <Input label="Reason" placeholder="Why are you cancelling?" value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
          <Button variant="danger" className="w-full" onClick={() => { updateStatus('CANCELLED', { cancelReason }); setShowCancel(false) }}>Cancel Order</Button>
        </div>
      </Modal>

      <Modal open={showOtp} onClose={() => setShowOtp(false)} title={'Enter Client OTP'}>
        <div className="space-y-4 text-center">
          <div className="flex gap-2 justify-center">
            {otpInput.map((d, i) => (
              <input key={i} ref={el => { otpRefs.current[i] = el }} maxLength={1} value={d} onChange={e => handleOtpChange(i, e.target.value)} 
                     className="w-14 h-16 text-center text-2xl font-extrabold border-2 border-gray-200 rounded-xl" />
            ))}
          </div>
          <Button className="w-full" size="lg" onClick={handleOtpSubmit} loading={actionLoading === 'otp'}>Verify & Complete</Button>
        </div>
      </Modal>

      <Modal open={showPhotoUpload} onClose={() => setShowPhotoUpload(false)} title="Upload Item Photos">
        <div className="space-y-4">
          <input type="file" accept="image/*" multiple onChange={e => setPhotoFiles(Array.from(e.target.files || []))} />
          <Input label="Actual price paid (₹)" type="number" value={actualPrice} onChange={e => setActualPrice(e.target.value)} />
          <Button className="w-full" onClick={handleItemPurchased} disabled={photoFiles.length === 0 || !actualPrice}>Send for Approval</Button>
        </div>
      </Modal>

      {showPhotoViewer && photoUrls.length > 0 && <PhotoViewer urls={photoUrls} onClose={() => setShowPhotoViewer(false)} />}
    </div>
  )
}