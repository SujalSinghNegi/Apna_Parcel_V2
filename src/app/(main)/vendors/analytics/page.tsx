'use client'
import { useEffect, useState } from 'react'
import { vendorsApi, getErrorMessage } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/Card'
import { fmt } from '@/lib/utils'
import { BarChart3, TrendingUp, Package, Loader2, ArrowLeft, Crown, ShoppingBag, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export default function VendorAnalyticsPage() {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    vendorsApi.analytics()
      .then(r => setData(r.data.data))
      .catch(e => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-brand" />
      <p className="text-sm text-gray-400">Loading analytics...</p>
    </div>
  )

  if (error) return (
    <div className="page-container max-w-lg mx-auto text-center py-20 space-y-4">
      <Crown className="w-12 h-12 text-amber-500 mx-auto" />
      <h2 className="text-xl font-extrabold text-navy dark:text-white">Premium Required</h2>
      <p className="text-gray-400 text-sm">{error}</p>
      <button onClick={() => router.back()} className="text-brand font-bold text-sm hover:underline">← Go back</button>
    </div>
  )

  const maxRevenue = data?.revenueByDay?.length > 0
    ? Math.max(...data.revenueByDay.map((d: any) => Number(d.revenue)))
    : 0

  return (
    <div className="page-container max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-navy dark:hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-navy dark:text-white flex items-center gap-2">Analytics <Crown className="w-4 h-4 text-amber-500" /></h1>
          <p className="text-xs text-gray-400">Premium trend analysis</p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Orders', value: data?.totalOrders, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' },
          { label: 'Total Revenue', value: fmt.currency(data?.totalRevenue || 0), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-500/10' },
          { label: 'Last 30 Days', value: data?.last30Days, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-500/10' },
          { label: 'Last 7 Days', value: data?.last7Days, icon: Package, color: 'text-brand', bg: 'bg-brand-50 dark:bg-brand/10' },
        ].map(s => {
          const Icon = s.icon
          return (
            <Card key={s.label}>
              <CardContent className="py-4">
                <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-2`}>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className="text-xl font-extrabold text-navy dark:text-white">{s.value ?? '—'}</p>
                <p className="text-[10px] text-gray-400 font-medium">{s.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Revenue Chart (bar chart with divs) */}
      {data?.revenueByDay?.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <h3 className="font-extrabold text-navy dark:text-white text-sm mb-4">Revenue (Last 30 Days)</h3>
            <div className="flex items-end gap-1 h-32 overflow-x-auto scrollbar-none">
              {data.revenueByDay.map((d: any, i: number) => {
                const pct = maxRevenue > 0 ? (Number(d.revenue) / maxRevenue) * 100 : 0
                return (
                  <div key={i} className="flex-1 min-w-[8px] flex flex-col items-center gap-1 group relative">
                    <div className="absolute -top-8 bg-navy text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {fmt.currency(Number(d.revenue))} · {d.orders} orders
                    </div>
                    <div className="w-full bg-brand/80 rounded-t transition-all hover:bg-brand"
                      style={{ height: `${Math.max(pct, 4)}%` }} />
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-2 text-[9px] text-gray-400">
              <span>{data.revenueByDay[0]?.date ? new Date(data.revenueByDay[0].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</span>
              <span>{data.revenueByDay[data.revenueByDay.length - 1]?.date ? new Date(data.revenueByDay[data.revenueByDay.length - 1].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Items */}
      {data?.topItems?.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <h3 className="font-extrabold text-navy dark:text-white text-sm mb-3">Top Selling Items</h3>
            <div className="space-y-2">
              {data.topItems.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <span className="text-lg font-extrabold text-gray-300 w-6 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-navy dark:text-white text-sm truncate">{item.itemName}</p>
                    <p className="text-[10px] text-gray-400">{item.orderCount} orders</p>
                  </div>
                  <p className="font-bold text-brand text-sm">{fmt.currency(item.totalRevenue)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
