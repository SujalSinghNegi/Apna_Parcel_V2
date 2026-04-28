'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminApi, getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { initSocket } from '@/lib/socket'
import { motion } from 'framer-motion'
import { Shield, Mail, Lock, Loader2, Package } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminLoginPage() {
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
      const { data } = await adminApi.login(email, password)
      const d = data.data
      setAuth(d.user, d.accessToken, d.refreshToken)
      initSocket(d.accessToken)
      toast.success('Welcome, Admin!')
      router.push('/admin')
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-brand to-brand-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-brand/30 mb-4">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">ApnaParcel</h1>
          <p className="text-sm text-gray-400 mt-1 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Admin Portal
          </p>
        </div>

        {/* Login Card */}
        <form onSubmit={handleLogin} className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-6 space-y-5 shadow-2xl">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@apnaparcel.dev"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-brand to-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand/30 hover:shadow-brand/50 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            {loading ? 'Signing in…' : 'Sign in as Admin'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          Not an admin? <a href="/auth" className="text-brand hover:underline">User login →</a>
        </p>
      </motion.div>
    </div>
  )
}
