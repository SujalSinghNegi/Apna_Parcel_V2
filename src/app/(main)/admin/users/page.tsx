'use client'
import { useEffect, useState } from 'react'
import { adminApi, getErrorMessage } from '@/lib/api'
import { User } from '@/types'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { TrustBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { fmt, cn } from '@/lib/utils'
import { Search, AlertTriangle, Ban, CheckCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [userType, setUserType] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [showStrike, setShowStrike] = useState<User | null>(null)
  const [showBan, setShowBan] = useState<User | null>(null)
  const [strikeForm, setStrikeForm] = useState({ reason: '', notes: '' })
  const [banForm, setBanForm] = useState({ permanent: false, days: '7' })
  const [acting, setActing] = useState('')

  const fetch = () => {
    setLoading(true)
    adminApi.users({ search: search || undefined, userType: userType || undefined })
      .then(r => setUsers(r.data.data || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  const loadDetail = async (userId: string) => {
    if (expanded === userId) { setExpanded(null); return }
    try {
      const { data } = await adminApi.getUserDetail(userId)
      setDetail(data.data)
      setExpanded(userId)
    } catch {}
  }

  const handleStrike = async () => {
    if (!showStrike || !strikeForm.reason) { toast.error('Select a reason'); return }
    setActing('strike')
    try {
      await adminApi.issueStrike(showStrike.id, strikeForm)
      toast.success('Strike issued')
      setShowStrike(null)
      fetch()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setActing('') }
  }

  const handleBan = async () => {
    if (!showBan) return
    setActing('ban')
    try {
      await adminApi.banUser(showBan.id, banForm.permanent, banForm.permanent ? undefined : parseInt(banForm.days))
      toast.success('User banned/suspended')
      setShowBan(null)
      fetch()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setActing('') }
  }

  const handleUnban = async (userId: string) => {
    try { await adminApi.unbanUser(userId); toast.success('User unbanned'); fetch() }
    catch (e) { toast.error(getErrorMessage(e)) }
  }

  const STRIKE_REASONS = [
    'ACCEPTED_BUT_NEVER_LEFT', 'WRONG_ITEM_DELIVERED', 'FAKE_PHOTO_VERIFICATION',
    'ETA_EXCEEDED_2_HOURS', 'CLIENT_COMPLAINT_VERIFIED', 'FAKE_COMPLAINT_FILED',
    'NOT_AVAILABLE_AT_LOCATION', 'REFUSED_OTP',
  ]

  return (
    <div className="page-container max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-extrabold text-navy">Manage Users</h1>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm focus:border-brand focus:outline-none"
            placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetch()} />
        </div>
        <select className="rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
          value={userType} onChange={e => { setUserType(e.target.value); }}>
          <option value="">All types</option>
          <option value="STUDENT">Student</option>
          <option value="LOCAL_PERSON">Local</option>
          <option value="STAFF_FACULTY">Staff</option>
        </select>
        <Button size="sm" onClick={fetch}>Search</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <Card key={u.id} className={cn(u.isBanned && 'border-red-200', u.isSuspended && 'border-amber-200')}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Avatar src={u.profilePhoto} name={u.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-extrabold text-navy text-sm">{u.name}</p>
                      <TrustBadge level={u.trustLevel} />
                      {u.isBanned && <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">BANNED</span>}
                      {u.isSuspended && !u.isBanned && <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">SUSPENDED</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{u.email} · {u.userType.replace('_',' ')} · {u.completedOrders} orders</p>
                    {u.strikeCount > 0 && (
                      <p className="text-xs text-amber-700 mt-0.5">⚠️ {u.strikeCount} strike{u.strikeCount > 1 ? 's' : ''}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setShowStrike(u)}>
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </Button>
                    {u.isBanned || u.isSuspended ? (
                      <Button size="sm" variant="ghost" onClick={() => handleUnban(u.id)}>
                        <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="danger" onClick={() => setShowBan(u)}>
                        <Ban className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <button onClick={() => loadDetail(u.id)} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
                      {expanded === u.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expanded === u.id && detail && detail.user?.id === u.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 animate-fade-in space-y-2">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-50 rounded-xl py-2"><p className="text-xs text-gray-500">Orders</p><p className="font-extrabold text-navy">{detail.orderCount}</p></div>
                      <div className="bg-gray-50 rounded-xl py-2"><p className="text-xs text-gray-500">Rating</p><p className="font-extrabold text-navy">{u.rating > 0 ? u.rating.toFixed(1) : '—'}</p></div>
                      <div className="bg-gray-50 rounded-xl py-2"><p className="text-xs text-gray-500">Strikes</p><p className="font-extrabold text-navy">{u.strikeCount}</p></div>
                    </div>
                    {detail.strikes?.length > 0 && (
                      <div className="bg-amber-50 rounded-xl p-3">
                        <p className="text-xs font-extrabold text-amber-800 mb-1">Strike History</p>
                        {detail.strikes.map((s: any) => (
                          <p key={s.id} className="text-xs text-amber-700">{s.reason} · {fmt.date(s.createdAt)}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!showStrike} onClose={() => setShowStrike(null)} title={`Issue Strike — ${showStrike?.name}`}>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-bold text-navy-700">Reason *</label>
            <select className="w-full rounded-xl border-2 border-gray-200 px-3 py-3 text-sm focus:border-brand focus:outline-none"
              value={strikeForm.reason} onChange={e => setStrikeForm(p => ({ ...p, reason: e.target.value }))}>
              <option value="">Select reason</option>
              {STRIKE_REASONS.map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
            </select>
          </div>
          <Input label="Admin Notes (optional)" placeholder="Context for this strike..."
            value={strikeForm.notes} onChange={e => setStrikeForm(p => ({ ...p, notes: e.target.value }))} />
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowStrike(null)}>Cancel</Button>
            <Button variant="danger" className="flex-1" loading={acting === 'strike'} onClick={handleStrike}>Issue Strike</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!showBan} onClose={() => setShowBan(null)} title={`Ban/Suspend — ${showBan?.name}`}>
        <div className="space-y-4">
          <div className="flex gap-2">
            <button onClick={() => setBanForm(p => ({ ...p, permanent: false }))}
              className={cn('flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all', !banForm.permanent ? 'border-brand bg-brand text-white' : 'border-gray-200 text-gray-600')}>
              Suspend
            </button>
            <button onClick={() => setBanForm(p => ({ ...p, permanent: true }))}
              className={cn('flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all', banForm.permanent ? 'border-red-600 bg-red-600 text-white' : 'border-gray-200 text-gray-600')}>
              Permanent Ban
            </button>
          </div>
          {!banForm.permanent && (
            <Input label="Duration (days)" type="number" value={banForm.days} onChange={e => setBanForm(p => ({ ...p, days: e.target.value }))} />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowBan(null)}>Cancel</Button>
            <Button variant="danger" className="flex-1" loading={acting === 'ban'} onClick={handleBan}>
              {banForm.permanent ? 'Ban Permanently' : 'Suspend'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
