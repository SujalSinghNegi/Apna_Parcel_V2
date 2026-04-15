'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { vendorsApi, getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { initSocket } from '@/lib/socket'
import { motion } from 'framer-motion'
import { Store, Mail, Lock, Loader2, Package } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function VendorLoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Fill all fields'); return }
    setLoading(true)
    try {
      const { data } = await vendorsApi.login(email, password)
      const d = data.data
      setAuth(d.user, d.accessToken, d.refreshToken)
      initSocket(d.accessToken)
      toast.success(`Welcome, ${d.vendor?.shopName || 'Vendor'}!`)
      router.push('/vendors/dashboard')
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 flex items-center justify-center px-4">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-brand rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30 mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">ApnaParcel</h1>
          <p className="text-sm text-gray-400 mt-1 flex items-center justify-center gap-1.5">
            <Store className="w-3.5 h-3.5" /> Vendor Portal
          </p>
        </div>

        {/* Login Card */}
        <form onSubmit={handleLogin} className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 space-y-5 shadow-2xl">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="vendor@example.com"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-brand hover:from-emerald-600 hover:to-brand-600 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Store className="w-4 h-4" /> Sign In</>}
          </button>
        </form>

        <div className="text-center mt-6 space-y-2">
          <Link href="/vendor-register" className="text-sm text-emerald-400 hover:text-emerald-300 font-bold transition-colors block">
            Don&apos;t have a shop? Register here →
          </Link>
          <Link href="/auth" className="text-sm text-gray-500 hover:text-gray-300 font-bold transition-colors block">
            ← Back to User Login
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
