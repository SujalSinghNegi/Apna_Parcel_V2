'use client'
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fmt } from '@/lib/utils'
import { Users, Package, MessageSquareWarning, TrendingUp, ChevronRight, Loader2, AlertTriangle, Store } from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [revenue, setRevenue] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')

  useEffect(() => {
    Promise.all([adminApi.dashboard(), adminApi.revenue(period)])
      .then(([s, r]) => { setStats(s.data.data); setRevenue(r.data.data) })
      .finally(() => setLoading(false))
  }, [period])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>

  return (
    <div className="page-container max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-navy dark:text-white">Admin Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage your platform</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
          {['day','week','month'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold capitalize transition-all ${period === p ? 'bg-white dark:bg-gray-700 text-navy dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', val: stats?.users?.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' },
          { label: 'Active Orders', val: stats?.orders?.active, icon: Package, color: 'text-brand', bg: 'bg-brand-50 dark:bg-brand/10' },
          { label: 'Pending Complaints', val: stats?.complaints?.pending, icon: MessageSquareWarning, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { label: 'Monthly Revenue', val: fmt.currency(stats?.revenue?.platformFeesMonth || 0), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-500/10' },
        ].map(s => {
          const Icon = s.icon
          return (
            <Card key={s.label} className="card-hover">
              <CardContent className="py-4">
                <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <p className="text-2xl font-extrabold text-navy dark:text-white">{s.val ?? '—'}</p>
                <p className="text-xs text-gray-400 font-medium mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Revenue & Orders */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="py-4">
            <h3 className="font-extrabold text-navy dark:text-white text-sm mb-3">Revenue ({period})</h3>
            <div className="space-y-2">
              {[
                { label: 'Platform Fees', val: fmt.currency(revenue?.platformFees || 0), color: 'text-green-600' },
                { label: 'Transaction Volume', val: fmt.currency(revenue?.totalVolume || 0), color: 'text-navy dark:text-white' },
                { label: 'Refunds', val: fmt.currency(revenue?.refundAmount || 0), color: 'text-red-600' },
                { label: 'Delivered Orders', val: revenue?.deliveredOrders || 0, color: 'text-navy dark:text-white' },
              ].map(r => (
                <div key={r.label} className="flex justify-between items-center py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <span className="text-sm text-gray-400">{r.label}</span>
                  <span className={`text-sm font-bold ${r.color}`}>{r.val}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <h3 className="font-extrabold text-navy dark:text-white text-sm mb-3">Orders ({period})</h3>
            <div className="space-y-2">
              {[
                { label: 'Today', val: stats?.orders?.today },
                { label: 'This week', val: stats?.orders?.week },
                { label: 'This month', val: stats?.orders?.month },
                { label: 'Active now', val: stats?.orders?.active },
              ].map(r => (
                <div key={r.label} className="flex justify-between items-center py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <span className="text-sm text-gray-400">{r.label}</span>
                  <span className="text-sm font-bold text-navy dark:text-white">{r.val ?? '—'}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users breakdown */}
      {stats?.users?.byType && (
        <Card>
          <CardContent className="py-4">
            <h3 className="font-extrabold text-navy dark:text-white text-sm mb-3">Users by Type</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'STUDENT', label: 'Students', emoji: '🎓' },
                { key: 'LOCAL_PERSON', label: 'Local', emoji: '🏘️' },
                { key: 'STAFF_FACULTY', label: 'Staff', emoji: '👨‍🏫' },
              ].map(t => (
                <div key={t.key} className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-3 text-center">
                  <p className="text-2xl">{t.emoji}</p>
                  <p className="text-xl font-extrabold text-navy dark:text-white mt-1">{stats.users.byType[t.key] || 0}</p>
                  <p className="text-xs text-gray-400 font-medium">{t.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin nav */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { href: '/admin/users', label: 'Manage Users', desc: 'View, strike, ban users', icon: Users, color: 'bg-blue-500' },
          { href: '/admin/orders', label: 'Manage Orders', desc: 'View all orders & refunds', icon: Package, color: 'bg-brand' },
          { href: '/admin/complaints', label: 'Complaints', desc: `${stats?.complaints?.pending || 0} pending`, icon: MessageSquareWarning, color: 'bg-amber-500' },
          { href: '/admin/vendors', label: 'Vendors', desc: 'Verify & manage shops', icon: Store, color: 'bg-green-500' },
        ].map(nav => {
          const Icon = nav.icon
          return (
            <Link key={nav.href} href={nav.href}>
              <Card className="card-hover h-full">
                <CardContent className="py-4 flex items-center gap-3">
                  <div className={`w-10 h-10 ${nav.color} rounded-xl flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-navy dark:text-white text-sm">{nav.label}</p>
                    <p className="text-xs text-gray-400">{nav.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
