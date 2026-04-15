'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { vendorsApi, getErrorMessage } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Store, Package, ArrowLeft, Sparkles, Phone, MapPin, Clock } from 'lucide-react'

const CATEGORIES = ['GROCERY', 'MEDICAL', 'FOOD', 'UTENSILS', 'STATIONERY', 'OTHER'] as const
const CAT_EMOJI: Record<string, string> = {
  GROCERY: '🛒', MEDICAL: '💊', FOOD: '🍱', UTENSILS: '🍽️', STATIONERY: '📚', OTHER: '📦'
}

export default function VendorRegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    shopName: '', ownerName: '', phone: '', category: 'GROCERY',
    locationName: '', openingTime: '09:00', closingTime: '20:00',
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.shopName || !form.ownerName || !form.phone) {
      toast.error('Fill all required fields')
      return
    }
    if (!/^[6-9]\d{9}$/.test(form.phone)) {
      toast.error('Enter a valid 10-digit phone number')
      return
    }
    setLoading(true)
    try {
      await vendorsApi.register(form)
      toast.success('Shop registered! Pending admin approval.')
      router.push('/auth')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-gray-50 dark:bg-slate-950 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50/50 via-white to-emerald-50/30 dark:from-brand-950/20 dark:via-slate-950 dark:to-emerald-950/20" />
        <motion.div
          animate={{ y: [0, -30, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{ y: [0, 40, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-brand/10 dark:bg-brand/20 rounded-full blur-[100px]"
        />
      </div>

      <div className="relative w-full max-w-md z-10">
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Link href="/" className="flex flex-col items-center justify-center gap-3 mb-8 group">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-brand rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/30"
            >
              <Store className="w-8 h-8 text-white" />
            </motion.div>
            <div className="text-center">
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">
                Register <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-brand">Shop</span>
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium tracking-wide mt-1">
                Join the ApnaParcel vendor network
              </p>
            </div>
          </Link>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)] border border-white/50 dark:border-slate-700/50 overflow-hidden"
        >
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Shop Name *</label>
              <div className="relative group">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand transition-colors" />
                <input value={form.shopName} onChange={e => set('shopName', e.target.value)} placeholder="Sharma General Store"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-slate-900 dark:text-white font-semibold placeholder:text-slate-400" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Owner Name *</label>
              <input value={form.ownerName} onChange={e => set('ownerName', e.target.value)} placeholder="Ramesh Sharma"
                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-slate-900 dark:text-white font-semibold placeholder:text-slate-400" required />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Phone *</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand transition-colors" />
                <input value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" type="tel"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-slate-900 dark:text-white font-semibold placeholder:text-slate-400" required />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(cat => (
                  <motion.button whileTap={{ scale: 0.95 }} key={cat} type="button" onClick={() => set('category', cat)}
                    className={`p-2.5 rounded-2xl border-2 text-center transition-all ${
                      form.category === cat
                        ? 'border-brand bg-brand/5 dark:bg-brand/20 ring-2 ring-brand/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-transparent'
                    }`}>
                    <span className="text-lg">{CAT_EMOJI[cat]}</span>
                    <p className={`text-[10px] font-bold mt-0.5 ${form.category === cat ? 'text-brand' : 'text-slate-500'}`}>
                      {cat.charAt(0) + cat.slice(1).toLowerCase()}
                    </p>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Location</label>
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand transition-colors" />
                <input value={form.locationName} onChange={e => set('locationName', e.target.value)} placeholder="Main Market, Dwarahat"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-slate-900 dark:text-white font-semibold placeholder:text-slate-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Opens</label>
                <input type="time" value={form.openingTime} onChange={e => set('openingTime', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-brand text-sm font-semibold text-slate-900 dark:text-white" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Closes</label>
                <input type="time" value={form.closingTime} onChange={e => set('closingTime', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-brand text-sm font-semibold text-slate-900 dark:text-white" />
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl px-4 py-3 border border-amber-200/50 dark:border-amber-800/30">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                🔒 Registration is pending admin approval. Once verified, your shop will appear to all campus users.
              </p>
            </div>

            <motion.button type="submit" disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-emerald-500 to-brand hover:from-emerald-600 hover:to-brand-600 text-white font-bold py-4 px-6 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Sparkles className="w-4 h-4" /> Register My Shop</>
              )}
            </motion.button>
          </form>

          <div className="px-8 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-700/50 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              🏔️ Part of the ApnaParcel Campus Delivery Network
            </p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-center mt-6">
          <Link href="/auth" className="text-sm text-slate-500 dark:text-slate-400 hover:text-brand font-bold transition-colors">
            ← Back to Login
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
