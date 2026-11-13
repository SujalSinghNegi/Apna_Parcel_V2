'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'

import { useAuthStore } from '@/store/auth'
import { db, functions } from '@/lib/firebase'
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'

import { Order, Message, RiderLocation, ORDER_STATUS_LABELS } from '@/types'
import { fmt, cn } from '@/lib/utils'

import { Button } from '@/components/ui/Button'
import { StatusBadge, TrustBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { StripePaymentModal } from '@/components/ui/StripePaymentModal'

import {
  Send, Image as ImageIcon, CheckCircle2, XCircle, MapPin, Star,
  Package, Loader2, Camera, ChevronDown, Clock, Store, CreditCard, 
  Truck, ShieldCheck, ArrowLeft, Eye, ChevronRight, MessageCircle, Bike
} from 'lucide-react'
import toast from 'react-hot-toast'


// ─── DYNAMIC MAP IMPORT ──────────────────────────────────────────────────
const LiveMapDynamic = dynamic(
  () => import('@/components/ui/LiveMap').then(m => ({ default: m.LiveMap })),
  { ssr: false, loading: () => <div className="w-full h-48 rounded-2xl bg-gray-100 animate-pulse" /> }
)

const TRACKABLE = ['RIDER_LEFT', 'AT_SHOP', 'ITEM_PURCHASED', 'PHOTO_APPROVED', 'DELIVERING', 'ARRIVED']


// ─── ORDER FLOW STEPS ────────────────────────────────────────────────────
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


// ─── SKELETON LOADER ─────────────────────────────────────────────────────
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


// ─── PHOTO VIEWER OVERLAY ────────────────────────────────────────────────
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


// ═════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════

export default function OrderDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { user } = useAuthStore() as any
  
  const [order, setOrder] = useState<Order | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  
  const [msgText, setMsgText] = useState('')
  const [otpInput, setOtpInput] = useState(Array(6).fill(''))
  const [deliveryOtp, setDeliveryOtp] = useState<string | null>(null)
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


  // Determine User Role safely
  const currentUserId = user?.uid || user?.id;
  const isRider = order?.riderId === currentUserId;
  const isClient = order?.clientId === currentUserId;
  const showMap = order && TRACKABLE.includes(order.status) && isClient;


  // ──🔥 FIREBASE: REAL-TIME ORDER SYNC ─────────────────────────────────────
  
  useEffect(() => {
    if (!id) return;
    
    // Open a live tunnel to the Firestore document
    const unsub = onSnapshot(doc(db, "orders", id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        const statusTimestamps = Object.fromEntries(
          Object.entries(data.statusTimestamps || {}).map(([status, value]) => [
            status,
            (value as any)?.toDate ? (value as any).toDate().toISOString() : value,
          ])
        )
        setOrder({ 
          id: docSnap.id, 
          ...data,
          // Safely handle Firebase Timestamps
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
          statusTimestamps,
        } as any);
        
        setLoading(false);
      } else {
        toast.error('Order not found');
        setLoading(false);
      }
    });

    return () => unsub();
  }, [id]);


  // ──🔥 FIREBASE: REAL-TIME CHAT SYNC ──────────────────────────────────────
  
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


  // ──🔥 FIREBASE: STATUS UPDATER ───────────────────────────────────────────
  
  const updateStatus = async (status: string, extraData = {}) => {
    setActionLoading(status.toLowerCase());
    try {
      await httpsCallable(functions, 'transitionOrder')({
        orderId: id,
        status,
        extraData,
      });
      toast.success(`Order updated to ${status.replace(/_/g, ' ')}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to update order");
    } finally {
      setActionLoading('');
    }
  };

  const cancelOrder = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a cancellation reason.');
      return;
    }
    setActionLoading('cancelled');
    try {
      await httpsCallable(functions, 'cancelOrder')({
        orderId: id,
        reason: cancelReason.trim(),
      });
      setShowCancel(false);
      setCancelReason('');
      toast.success('Order cancelled.');
    } catch (e: any) {
      toast.error(e.message || 'Unable to cancel order.');
    } finally {
      setActionLoading('');
    }
  };


  // ─── ACTION HANDLERS ─────────────────────────────────────────────────────

  const handlePay = async () => {
    setActionLoading('pay');
    
    // Payment remains a demo action until Razorpay verification is implemented.
    setTimeout(async () => {
      await updateStatus('PAID');
      toast.success('Payment successful! ✅');
      setActionLoading('');
    }, 1500);
  };


  const handleSendMsg = async (textOverride?: string) => {
    const text = textOverride || msgText;
    if (!text.trim()) return;
    
    setMsgText('');
    
    await httpsCallable(functions, 'sendOrderMessage')({
      orderId: id,
      content: text,
    });
  };

  const handleQuickMsg = (key: string) => {
    const msg = QUICK_MSGS.find(q => q.key === key)?.label || key;
    handleSendMsg(msg);
  };


  // ──📸 FUTURE CODE: HANDLE CHAT PHOTOS (BLAZE PLAN) ───────────────────────
  
  const handlePhotoSend = async (file: File) => {
    toast.error("Photo uploads are disabled (Free Tier Mode).");
    
    /* ========================================================================
    🚀 WHEN YOU UPGRADE TO BLAZE PLAN, UNCOMMENT THIS CODE:
    ========================================================================
    
    toast('Uploading photo...', { icon: '⏳' });
    try {
      const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const storage = getStorage();
      
      // Create a reference in Firebase Storage
      const photoRef = ref(storage, `chat/${id}/${Date.now()}_${file.name}`);
      
      // Upload the file
      await uploadBytes(photoRef, file);
      
      // Get the URL
      const url = await getDownloadURL(photoRef);
      
      // Save URL to Firestore Chat Collection
      await addDoc(collection(db, 'orders', id, 'messages'), {
        senderId: currentUserId,
        photoUrl: url,
        sender: { id: currentUserId, name: user.name, profilePhoto: user.profilePhoto || '' },
        createdAt: serverTimestamp()
      });
      
    } catch (e) {
      toast.error("Photo upload failed. Ensure Storage Rules are public.");
    }
    ========================================================================
    */
  };


  // ──📸 FUTURE CODE: HANDLE RIDER RECEIPT (BLAZE PLAN) ─────────────────────

  const handleItemPurchased = async () => {
    
    if (!actualPrice) { 
      toast.error('Enter actual price'); 
      return; 
    }
    
    setActionLoading('purchased');
    
    try {
      // 🚧 PLACEHOLDER IMAGE FOR FREE TIER
      const photoUrls = ["https://via.placeholder.com/400x300/e2e8f0/0f172a?text=Receipt+Omitted+(Testing)"];
      
      /* ======================================================================
      🚀 WHEN YOU UPGRADE TO BLAZE PLAN, REPLACE THE LINE ABOVE WITH THIS:
      ======================================================================
      
      if (photoFiles.length === 0) { toast.error('Take at least one photo'); setActionLoading(''); return; }
      
      const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const storage = getStorage();
      const photoUrls: string[] = [];
      
      for (const file of photoFiles) {
        const photoRef = ref(storage, `orders/${id}/receipts/${Date.now()}_${file.name}`);
        await uploadBytes(photoRef, file);
        const url = await getDownloadURL(photoRef);
        photoUrls.push(url);
      }
      ======================================================================
      */

      // Update Firestore directly to move the order forward
      await httpsCallable(functions, 'transitionOrder')({
        orderId: id,
        status: 'ITEM_PURCHASED',
        extraData: {
          purchasedPhotoUrls: photoUrls,
          actualPrice: parseFloat(actualPrice),
        },
      });
      
      setPhotoFiles([]); 
      setShowPhotoUpload(false);
      toast.success('Item purchased!');
      
    } catch (e: any) {
      toast.error("Failed to update status.");
    } finally {
      setActionLoading('');
    }
  };


  // ─── OTP HANDLERS ────────────────────────────────────────────────────────

  const handleOtpSubmit = async () => {
    const code = otpInput.join('');
    if (code.length !== 6) { toast.error('Enter 6-digit OTP'); return; }
    
    setActionLoading('otp');
    try {
      await httpsCallable(functions, 'verifyDeliveryOtp')({ orderId: id, code });
      toast.success('Order successfully Delivered! 🎉');
      setShowOtp(false);
      setOtpInput(Array(6).fill(''));
    } catch (e: any) {
      toast.error(e.message || 'Delivery verification failed.');
    } finally {
      setActionLoading('');
    }
  };

  const handleOtpChange = (i: number, val: string) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const next = [...otpInput]; next[i] = v; setOtpInput(next);
    if (v && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleShowOtp = async () => {
    if (isClient) {
      setActionLoading('otp-view');
      try {
        const result = await httpsCallable<{ orderId: string }, { code: string }>(functions, 'getDeliveryOtp')({ orderId: id });
        setDeliveryOtp(result.data.code);
        setShowOtp(true);
      } catch (e: any) {
        toast.error(e.message || 'Unable to load the delivery OTP.');
      } finally {
        setActionLoading('');
      }
      return;
    }
    setShowOtp(true);
  };



  // ═════════════════════════════════════════════════════════════════════════
  // RENDER LOGIC
  // ═════════════════════════════════════════════════════════════════════════

  if (loading) return <OrderSkeleton />
  
  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-gray-500">Order not found or has been deleted.</p>
        <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }

  // Safely grab the other person's info, depending on who is looking
  const counterpartName = isClient ? (order as any).rider?.name : (order as any).clientName || (order as any).client?.name;
  const counterpartPhoto = isClient ? (order as any).rider?.profilePhoto : (order as any).client?.profilePhoto;
  const counterpartTrust = isClient ? (order as any).rider?.trustLevel : (order as any).client?.trustLevel;
  const counterpartRating = isClient ? (order as any).rider?.rating : 0;

  const currentStep = getStepIndex(order.status)
  const isCancelled = ['CANCELLED', 'ITEM_NOT_FOUND', 'DISPUTED'].includes(order.status)
  
  // Safely handle photos array
  const photoUrls = order.purchasedPhotoUrls?.length 
    ? order.purchasedPhotoUrls 
    : order.purchasedPhotoUrl ? [order.purchasedPhotoUrl] : []

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
                      {order.statusTimestamps?.[step.key as keyof typeof order.statusTimestamps] && (
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {fmt.datetime(order.statusTimestamps[step.key as keyof typeof order.statusTimestamps]!)}
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

        {/* ─── Rider / Client Info Card ─── */}
        {counterpartName && order.status !== 'PENDING' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            <Avatar src={counterpartPhoto} name={counterpartName} size="md" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-navy text-sm truncate">{counterpartName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <TrustBadge level={counterpartTrust || 'LEVEL_1'} />
                {counterpartRating > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-gray-500">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />{counterpartRating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
            <button onClick={() => setShowChat(!showChat)}
              className="w-10 h-10 bg-brand-50 hover:bg-brand-100 rounded-xl flex items-center justify-center transition-colors">
              <MessageCircle className="w-5 h-5 text-brand" />
            </button>
          </div>
        )}

        {/* ─── ACTION AREA (BUTTONS FOR CLIENT AND RIDER) ─── */}
        <div className="space-y-2">
          
          {/* CLIENT VIEW */}
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
                      <p className="text-xs text-gray-400">Check the photos and approve or reject</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="danger" onClick={() => setShowReject(true)}>
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
                      <p className="text-xs text-gray-400">Share OTP after receiving your item</p>
                    </div>
                  </div>
                  <Button className="w-full" size="lg" onClick={handleShowOtp} loading={actionLoading === 'otp-view'}>
                    🔑 View Delivery OTP
                  </Button>
                </div>
              )}

              {order.status === 'DELIVERED' && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-7 h-7 text-green-600 shrink-0" />
                    <div>
                      <p className="font-extrabold text-green-700">Delivery completed successfully!</p>
                      <p className="text-xs text-green-600">Thank you for using Apna Parcel.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => router.push('/dashboard')}>Home</Button>
                    <Button variant="ghost" className="flex-1" onClick={() => router.back()}>Next order</Button>
                  </div>
                </div>
              )}
            </>
          )}


          {/* RIDER VIEW */}
          {isRider && (
            <>
              {order.status === 'ACCEPTED' && (
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
                    <Camera className="w-4 h-4" /> Upload Price & Photos
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
                    <p className="text-xs text-amber-600">Client is reviewing the item details</p>
                  </div>
                </div>
              )}

              {order.status === 'PHOTO_APPROVED' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
                  <div className="bg-green-50 rounded-xl p-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <p className="text-xs text-green-700 font-medium">Client approved! Head to delivery location.</p>
                  </div>
                  <Button className="w-full" size="lg" onClick={() => updateStatus('DELIVERING')} loading={actionLoading === 'delivering'}>
                    🚴 Start Delivering
                  </Button>
                </div>
              )}

              {order.status === 'DELIVERING' && (
                <Button className="w-full" size="lg" onClick={() => updateStatus('ARRIVED')} loading={actionLoading === 'arrived'}>
                  <MapPin className="w-4 h-4" /> Arrived at Location
                </Button>
              )}

              {order.status === 'ARRIVED' && (
                <Button className="w-full" size="lg" onClick={handleShowOtp}>
                  🔑 Enter Client OTP
                </Button>
              )}

            </>
          )}

          {/* Cancel Order Button */}
          {['PENDING', 'ACCEPTED'].includes(order.status) && (
            <button onClick={() => setShowCancel(true)}
              className="w-full py-3 text-sm font-bold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors">
              Cancel Order
            </button>
          )}
        </div>


        {/* ─── INLINE CHAT COMPONENT ──────────────────────────────────────── */}
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
                const isMine = msg.sender.id === currentUserId;
                return (
                  <div key={msg.id} className={cn('flex gap-2', isMine ? 'flex-row-reverse' : '')}>
                    <Avatar src={msg.sender.profilePhoto} name={msg.sender.name} size="sm" className="shrink-0 mt-1" />
                    <div className={cn('max-w-[70%] rounded-2xl px-3 py-2', isMine ? 'bg-brand text-white rounded-tr-sm' : 'bg-gray-100 text-navy rounded-tl-sm')}>
                      {msg.photoUrl && <img src={msg.photoUrl} alt="" className="rounded-xl mb-1 max-w-full" />}
                      {msg.content && <p className="text-sm">{msg.content}</p>}
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
                
                <button onClick={() => handleSendMsg()} disabled={!msgText.trim()} className="p-2.5 rounded-xl bg-brand text-white disabled:opacity-40 hover:bg-brand-600 transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Chat Button */}
        {!showChat && order.status !== 'PENDING' && !['DELIVERED', 'CANCELLED', 'ITEM_NOT_FOUND'].includes(order.status) && (
          <button onClick={() => setShowChat(true)}
            className="fixed bottom-24 right-4 md:right-8 z-30 w-14 h-14 bg-brand text-white rounded-full shadow-xl shadow-brand/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
            <MessageCircle className="w-6 h-6" />
          </button>
        )}
      </div>


      {/* ─── ALL MODALS ───────────────────────────────────────────────────────── */}
      
      <Modal open={showCancel} onClose={() => setShowCancel(false)} title="Cancel Order">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Are you sure? This action cannot be undone.</p>
          <Input label="Reason" placeholder="Why are you cancelling?" value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowCancel(false)}>Back</Button>
            <Button variant="danger" className="flex-1" loading={actionLoading === 'cancelled'}
              onClick={cancelOrder}>
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
              onClick={() => { updateStatus('AT_SHOP', { rejectReason }); setShowReject(false); }}>
              Reject
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showOtp} onClose={() => setShowOtp(false)} title={isClient ? 'Delivery OTP' : 'Enter OTP'}>
        <div className="space-y-4 text-center">
          {isClient ? (
            <>
              <p className="text-sm text-gray-500">Share only <strong>after</strong> receiving your item</p>
              <div className="bg-green-50 border-2 border-dashed border-green-300 rounded-2xl py-6 px-4">
                <span className="text-4xl font-extrabold tracking-[12px] text-green-600">
                  {deliveryOtp || '------'}
                </span>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500">Ask the client for the 6-digit OTP</p>
              <p className="text-xs text-gray-400">The code is checked securely by the server and can only be used once.</p>
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

      <Modal open={showPhotoUpload} onClose={() => setShowPhotoUpload(false)} title="Confirm Purchase">
        <div className="space-y-4">
          
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-xs text-amber-700 font-medium">Photo uploads disabled in Free Tier Testing.</p>
          </div>

          <Input label="Actual price paid (₹)" type="number" placeholder={`Expected: ₹${order?.expectedPrice || ''}`} value={actualPrice} onChange={e => setActualPrice(e.target.value)} />
          
          {/* Note that disabled ONLY checks for actualPrice now, not the photo length */}
          <Button className="w-full" size="lg" onClick={handleItemPurchased} loading={actionLoading === 'purchased'} disabled={!actualPrice}>
            Send for Approval
          </Button>
        </div>
      </Modal>

      {/* Photo viewer */}
      {showPhotoViewer && photoUrls.length > 0 && (
        <PhotoViewer urls={photoUrls} onClose={() => setShowPhotoViewer(false)} />
      )}

    </div>
  )
}