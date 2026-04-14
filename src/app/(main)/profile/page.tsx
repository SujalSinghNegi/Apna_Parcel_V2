'use client'
import { useEffect, useState } from 'react'
import { usersApi, uploadApi, getErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { TrustBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { fmt, TRUST_COLORS } from '@/lib/utils'
import { TRUST_LEVEL_NAMES, TRUST_LEVEL_LIMITS } from '@/types'
import { Star, Camera, Shield, TrendingUp, Award, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const [stats, setStats] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', collegeName: '', branch: '', yearOfStudy: '' })

  useEffect(() => {
    if (user) setForm({ name: user.name, phone: user.phone || '', collegeName: user.collegeName || '', branch: user.branch || '', yearOfStudy: user.yearOfStudy || '' })
    usersApi.stats().then(r => setStats(r.data.data)).catch(() => {})
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data } = await usersApi.updateMe(form)
      setUser(data.data)
      toast.success('Profile updated!')
      setEditing(false)
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { data } = await uploadApi.profilePhoto(file)
      const { data: u } = await usersApi.me()
      setUser(u.data)
      toast.success('Photo updated!')
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setUploading(false) }
  }

  if (!user) return null
  const tc = TRUST_COLORS[user.trustLevel]
  const limit = TRUST_LEVEL_LIMITS[user.trustLevel]
  const nextLevel = user.trustLevel === 'LEVEL_1' ? 5 : user.trustLevel === 'LEVEL_2' ? 15 : user.trustLevel === 'LEVEL_3' ? 30 : null
  const progress = nextLevel ? Math.min((user.completedOrders / nextLevel) * 100, 100) : 100

  return (
    <div className="page-container max-w-2xl mx-auto space-y-5 animate-fade-in">
      {/* Profile card */}
      <Card>
        <CardContent className="py-6 text-center">
          <div className="relative inline-block mb-4">
            <Avatar src={user.profilePhoto} name={user.name} size="xl" />
            <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-br from-brand to-brand-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg shadow-brand/30 hover:scale-110 transition-transform">
              <Camera className="w-4 h-4 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
            </label>
          </div>
          <h1 className="text-xl font-extrabold text-navy">{user.name}</h1>
          <p className="text-sm text-gray-400 font-medium mt-0.5">{user.email}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <TrustBadge level={user.trustLevel} />
            {user.isVerified && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-200"><Shield className="w-3 h-3" />Verified</span>}
          </div>

          {/* Rating */}
          {user.ratingCount >= 3 && user.rating > 0 && (
            <div className="flex items-center justify-center gap-1 mt-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < Math.round(user.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
              ))}
              <span className="text-sm font-bold ml-1">{user.rating.toFixed(1)}</span>
              <span className="text-xs text-gray-400">({user.ratingCount})</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trust Level Progress */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-brand" />
              <span className="font-extrabold text-navy text-sm">{TRUST_LEVEL_NAMES[user.trustLevel]}</span>
            </div>
            <span className="text-xs text-gray-400 font-medium">Max order: {limit === Infinity ? 'Unlimited' : `₹${limit}`}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand to-brand-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          {nextLevel && (
            <p className="text-xs text-gray-400 font-medium mt-1">{user.completedOrders}/{nextLevel} orders to next level</p>
          )}
          {user.strikeCount > 0 && (
            <div className="mt-3 flex items-center gap-2 bg-amber-50 rounded-xl px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800 font-medium">{user.strikeCount} strike{user.strikeCount > 1 ? 's' : ''} on account</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="card-hover">
            <CardContent className="pt-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">As Client</p>
              <p className="text-2xl font-extrabold text-navy">{stats.asClient?.ordersPlaced || 0}</p>
              <p className="text-xs text-gray-400 font-medium">Orders placed</p>
              <p className="text-lg font-extrabold text-brand mt-1">{fmt.currency(stats.asClient?.totalSpent || 0)}</p>
              <p className="text-xs text-gray-400 font-medium">Total spent</p>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="pt-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">As Rider</p>
              <p className="text-2xl font-extrabold text-navy">{stats.asRider?.deliveriesCompleted || 0}</p>
              <p className="text-xs text-gray-400 font-medium">Deliveries</p>
              <p className="text-lg font-extrabold text-green-600 mt-1">{fmt.currency(stats.asRider?.totalEarned || 0)}</p>
              <p className="text-xs text-gray-400 font-medium">Total earned</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Profile */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <h2 className="font-extrabold text-navy">Edit Profile</h2>
          {!editing && <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>}
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {editing ? (
            <>
              <Input label="Full Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              <Input label="Phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              {user.userType === 'STUDENT' && (
                <>
                  <Input label="College Name" value={form.collegeName} onChange={e => setForm(p => ({ ...p, collegeName: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Branch" value={form.branch} onChange={e => setForm(p => ({ ...p, branch: e.target.value }))} />
                    <div className="space-y-1">
                      <label className="block text-sm font-bold text-navy-700">Year</label>
                      <select className="w-full rounded-xl border-2 border-gray-200 px-3 py-3 text-sm focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 transition-all"
                        value={form.yearOfStudy} onChange={e => setForm(p => ({ ...p, yearOfStudy: e.target.value }))}>
                        <option value="">Select</option>
                        {['1ST','2ND','3RD','4TH','OTHER'].map(y => <option key={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setEditing(false)}>Cancel</Button>
                <Button className="flex-1" loading={saving} onClick={handleSave}>Save</Button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              {[
                { label: 'Email', val: user.email },
                { label: 'Phone', val: user.phone || '—' },
                { label: 'Type', val: user.userType.replace('_', ' ') },
                ...(user.collegeName ? [{ label: 'College', val: user.collegeName }] : []),
                ...(user.branch ? [{ label: 'Branch', val: user.branch }] : []),
              ].map(f => (
                <div key={f.label} className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-400 font-medium">{f.label}</span>
                  <span className="text-sm font-bold text-navy">{f.val}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
