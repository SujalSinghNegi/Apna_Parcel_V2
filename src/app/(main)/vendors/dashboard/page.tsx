'use client'
import { useEffect, useState, useCallback } from 'react'
import { vendorsApi, uploadApi, getErrorMessage } from '@/lib/api'
import { Vendor, VendorItem, ItemRequest } from '@/types'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { fmt, cn } from '@/lib/utils'
import { Store, Package, Plus, Edit2, Trash2, Loader2, TrendingUp, Crown, Clock, MapPin, Eye, EyeOff, ShoppingBag, BarChart3, Bell, ArrowLeft, Camera, X, Timer, Check, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function VendorDashboard() {
  const router = useRouter()
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [items, setItems] = useState<VendorItem[]>([])
  const [loading, setLoading] = useState(true)
  const [noVendor, setNoVendor] = useState(false)

  // Item form
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<VendorItem | null>(null)
  const [itemForm, setItemForm] = useState({ name: '', price: '', photoUrl: '', isAvailable: true })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Settings form
  const [showSettings, setShowSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState({ shopName: '', phone: '', openingTime: '', closingTime: '', locationName: '' })
  const [updatingSettings, setUpdatingSettings] = useState(false)

  // Stats
  const [orders, setOrders] = useState<{ orders: any[]; pagination: any } | null>(null)
  const [ordersLoading, setOrdersLoading] = useState(false)

  // Item requests
  const [incomingRequests, setIncomingRequests] = useState<ItemRequest[]>([])
  const [showRequestPopup, setShowRequestPopup] = useState(false)
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [respondPrice, setRespondPrice] = useState('')
  const [respondDesc, setRespondDesc] = useState('')
  const [respondLoading, setRespondLoading] = useState(false)

  const fetchVendor = useCallback(async () => {
    try {
      const { data } = await vendorsApi.me()
      setVendor(data.data)
      setItems(data.data.vendorItems || [])
      setNoVendor(false)
    } catch {
      setNoVendor(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchVendor() }, [fetchVendor])

  // ── Fetch & poll item requests ──────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    try {
      const { data } = await vendorsApi.vendorRequests()
      const reqs: ItemRequest[] = data.data || []
      const pending = reqs.filter(r => r.status === 'PENDING' && new Date(r.expiresAt) > new Date())
      setIncomingRequests(pending)
      // Auto-show popup if new pending requests arrive
      if (pending.length > 0) setShowRequestPopup(true)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchRequests()
    const interval = setInterval(fetchRequests, 10000) // poll every 10s
    return () => clearInterval(interval)
  }, [fetchRequests])

  const handleRespondRequest = async (requestId: string, accept: boolean) => {
    setRespondLoading(true)
    try {
      await vendorsApi.respondRequest(requestId, {
        accept,
        ...(accept && respondPrice ? { vendorPrice: parseFloat(respondPrice) } : {}),
        ...(respondDesc ? { vendorDescription: respondDesc } : {}),
      })
      toast.success(accept ? 'Request accepted!' : 'Request declined')
      setRespondingId(null)
      setRespondPrice('')
      setRespondDesc('')
      fetchRequests()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setRespondLoading(false) }
  }

  // ── Item CRUD ─────────────────────────────────────────────────────────
  const openAddItem = () => {
    setEditingItem(null)
    setItemForm({ name: '', price: '', photoUrl: '', isAvailable: true })
    setShowItemModal(true)
  }

  const openEditItem = (item: VendorItem) => {
    setEditingItem(item)
    setItemForm({ name: item.name, price: String(item.price), photoUrl: item.photoUrl || '', isAvailable: item.isAvailable })
    setShowItemModal(true)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { data } = await uploadApi.profilePhoto(file) // reuse any upload endpoint
      setItemForm(p => ({ ...p, photoUrl: data.data.url }))
      toast.success('Photo uploaded')
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setUploading(false) }
  }

  const saveItem = async () => {
    if (!itemForm.name || !itemForm.price) { toast.error('Name and price required'); return }
    setSaving(true)
    try {
      if (editingItem) {
        await vendorsApi.updateItem(editingItem.id, {
          name: itemForm.name, price: parseFloat(itemForm.price),
          photoUrl: itemForm.photoUrl || undefined, isAvailable: itemForm.isAvailable,
        })
        toast.success('Item updated')
      } else {
        await vendorsApi.addItem({
          name: itemForm.name, price: parseFloat(itemForm.price),
          photoUrl: itemForm.photoUrl || undefined, isAvailable: itemForm.isAvailable,
        })
        toast.success('Item added')
      }
      setShowItemModal(false)
      fetchVendor()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  const deleteItem = async (itemId: string) => {
    if (!confirm('Delete this item?')) return
    try {
      await vendorsApi.deleteItem(itemId)
      toast.success('Item deleted')
      fetchVendor()
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  const toggleAvailability = async (item: VendorItem) => {
    try {
      await vendorsApi.updateItem(item.id, { isAvailable: !item.isAvailable })
      fetchVendor()
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  // ── Settings ──────────────────────────────────────────────────────────
  const openSettings = () => {
    if (!vendor) return
    setSettingsForm({
      shopName: vendor.shopName, phone: vendor.phone,
      openingTime: vendor.openingTime || '', closingTime: vendor.closingTime || '',
      locationName: vendor.locationName || '',
    })
    setShowSettings(true)
  }

  const updateSettings = async () => {
    setUpdatingSettings(true)
    try {
      await vendorsApi.updateMe(settingsForm)
      toast.success('Settings updated')
      setShowSettings(false)
      fetchVendor()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setUpdatingSettings(false) }
  }

  // ── Orders ────────────────────────────────────────────────────────────
  const fetchOrders = async (page = 1) => {
    setOrdersLoading(true)
    try {
      const { data } = await vendorsApi.myOrders(page)
      setOrders({ orders: data.data, pagination: data.meta })
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setOrdersLoading(false) }
  }

  // ── Loading & No Vendor ───────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-brand" />
      <p className="text-sm text-gray-400">Loading your shop...</p>
    </div>
  )

  if (noVendor) return (
    <div className="page-container max-w-lg mx-auto text-center py-20 space-y-4 animate-fade-in">
      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto">
        <Store className="w-10 h-10 text-gray-300" />
      </div>
      <h2 className="text-xl font-extrabold text-navy dark:text-white">No Shop Registered</h2>
      <p className="text-gray-400 text-sm">Register your shop first to manage inventory</p>
      <Link href="/vendors">
        <Button><Plus className="w-4 h-4" /> Register Shop</Button>
      </Link>
    </div>
  )

  const available = items.filter(i => i.isAvailable).length
  const unavailable = items.length - available

  return (
    <div className="page-container max-w-3xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-navy dark:hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-12 h-12 bg-gradient-to-br from-brand to-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand/20">
          <Store className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-navy dark:text-white">{vendor!.shopName}</h1>
            {vendor!.isPremium && <Crown className="w-4 h-4 text-amber-500" />}
          </div>
          <p className="text-xs text-gray-400">{vendor!.category} · {vendor!.isVerified ? '✓ Verified' : '⏳ Pending'}</p>
        </div>
        <Button size="sm" variant="outline" onClick={openSettings}><Edit2 className="w-3.5 h-3.5" /> Settings</Button>
        <button onClick={() => { fetchRequests(); setShowRequestPopup(true) }}
          className="relative p-2 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-brand/10 transition-colors">
          <Bell className="w-5 h-5 text-navy dark:text-white" />
          {incomingRequests.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1 animate-pulse">
              {incomingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-extrabold text-navy dark:text-white">{items.length}</p>
            <p className="text-xs text-gray-400">Total Items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-extrabold text-green-600">{available}</p>
            <p className="text-xs text-gray-400">Available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-extrabold text-red-500">{unavailable}</p>
            <p className="text-xs text-gray-400">Unavailable</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Nav */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        <Link href="/vendors/requests">
          <Button size="sm" variant="outline"><Bell className="w-3.5 h-3.5" /> Requests</Button>
        </Link>
        <Button size="sm" variant="outline" onClick={() => fetchOrders()}>
          <ShoppingBag className="w-3.5 h-3.5" /> Orders
        </Button>
        {vendor!.isPremium && (
          <Link href="/vendors/analytics">
            <Button size="sm" variant="outline"><BarChart3 className="w-3.5 h-3.5" /> Analytics</Button>
          </Link>
        )}
        {!vendor!.isPremium && (
          <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50"
            onClick={async () => {
              try { await vendorsApi.activatePremium(); toast.success('Premium activated! 🎉'); fetchVendor() }
              catch (e) { toast.error(getErrorMessage(e)) }
            }}>
            <Crown className="w-3.5 h-3.5" /> Get Premium (₹100/mo)
          </Button>
        )}
      </div>

      {/* Inventory */}
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-navy dark:text-white text-sm">Inventory</h2>
        <Button size="sm" onClick={openAddItem}><Plus className="w-3.5 h-3.5" /> Add Item</Button>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200 dark:border-gray-700">
          <CardContent className="py-12 text-center">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-bold text-gray-400">No items yet</p>
            <p className="text-sm text-gray-400 mt-1">Add items to let customers find your products</p>
            <Button className="mt-4" size="sm" onClick={openAddItem}><Plus className="w-3.5 h-3.5" /> Add First Item</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {items.map(item => (
            <Card key={item.id} className={cn('card-hover', !item.isAvailable && 'opacity-60')}>
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  {item.photoUrl ? (
                    <img src={item.photoUrl} alt={item.name} className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                      <Package className="w-5 h-5 text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-navy dark:text-white text-sm truncate">{item.name}</h3>
                      {!item.isAvailable && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Out</span>}
                    </div>
                    <p className="text-sm font-bold text-brand mt-0.5">{fmt.currency(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleAvailability(item)}
                      className={cn('p-2 rounded-xl transition-colors', item.isAvailable ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800')}>
                      {item.isAvailable ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEditItem(item)} className="p-2 rounded-xl text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteItem(item.id)} className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Orders Section (collapsible) */}
      {orders && (
        <div className="space-y-3">
          <h2 className="font-extrabold text-navy dark:text-white text-sm">Order History</h2>
          {ordersLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
          ) : orders.orders.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-gray-400 text-sm">No orders yet</CardContent></Card>
          ) : (
            <div className="grid gap-2">
              {orders.orders.map((o: any) => (
                <Link key={o.id} href={`/orders/${o.id}`}>
                  <Card className="card-hover">
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-navy dark:text-white text-sm">{o.itemName}</p>
                          <p className="text-xs text-gray-400">{o.client?.name} · {new Date(o.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-brand text-sm">{fmt.currency(o.actualPrice || o.expectedPrice)}</p>
                          <p className="text-[10px] text-gray-400">{o.status}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Item Modal */}
      <Modal open={showItemModal} onClose={() => setShowItemModal(false)} title={editingItem ? 'Edit Item' : 'Add Item'} size="md">
        <div className="space-y-4">
          <Input label="Item Name *" placeholder="e.g. Rice (1kg)" value={itemForm.name} onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))} />
          <Input label="Price (₹) *" type="number" placeholder="55" value={itemForm.price} onChange={e => setItemForm(p => ({ ...p, price: e.target.value }))} />

          {/* Photo Upload */}
          <div className="space-y-1">
            <label className="text-sm font-bold text-navy dark:text-white">Photo (optional)</label>
            {itemForm.photoUrl ? (
              <div className="relative w-24 h-24">
                <img src={itemForm.photoUrl} alt="" className="w-full h-full rounded-xl object-cover" />
                <button onClick={() => setItemForm(p => ({ ...p, photoUrl: '' }))}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-brand transition-colors">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : <Camera className="w-5 h-5 text-gray-400" />}
                <span className="text-[10px] text-gray-400 mt-1">{uploading ? 'Uploading' : 'Upload'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
              </label>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={itemForm.isAvailable}
              onChange={e => setItemForm(p => ({ ...p, isAvailable: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand" />
            <span className="text-sm text-navy dark:text-white font-medium">Available for purchase</span>
          </label>

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowItemModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={saveItem}>{editingItem ? 'Update' : 'Add Item'}</Button>
          </div>
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Shop Settings" size="md">
        <div className="space-y-3">
          <Input label="Shop Name" value={settingsForm.shopName} onChange={e => setSettingsForm(p => ({ ...p, shopName: e.target.value }))} />
          <Input label="Phone" value={settingsForm.phone} onChange={e => setSettingsForm(p => ({ ...p, phone: e.target.value }))} />
          <Input label="Location" value={settingsForm.locationName} onChange={e => setSettingsForm(p => ({ ...p, locationName: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Opens at" type="time" value={settingsForm.openingTime} onChange={e => setSettingsForm(p => ({ ...p, openingTime: e.target.value }))} />
            <Input label="Closes at" type="time" value={settingsForm.closingTime} onChange={e => setSettingsForm(p => ({ ...p, closingTime: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowSettings(false)}>Cancel</Button>
            <Button className="flex-1" loading={updatingSettings} onClick={updateSettings}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Incoming Item Requests Popup */}
      <Modal open={showRequestPopup} onClose={() => setShowRequestPopup(false)} title={`Incoming Requests (${incomingRequests.length})`} size="md">
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {incomingRequests.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No pending requests</p>
            </div>
          ) : (
            incomingRequests.map(req => {
              const timeLeft = Math.max(0, Math.floor((new Date(req.expiresAt).getTime() - Date.now()) / 1000))
              const mins = Math.floor(timeLeft / 60)
              const secs = timeLeft % 60
              const isResponding = respondingId === req.id

              return (
                <Card key={req.id} className="border-brand/20 bg-brand/5 dark:bg-brand/10">
                  <CardContent className="py-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-navy dark:text-white text-sm">{req.itemName}</h3>
                        {req.description && <p className="text-xs text-gray-500 mt-0.5">{req.description}</p>}
                        {(req as any).user?.name && <p className="text-[11px] text-gray-400 mt-0.5">From: {(req as any).user.name}</p>}
                        {req.maxPrice && <p className="text-xs text-brand font-bold mt-1">Budget: {fmt.currency(req.maxPrice)}</p>}
                      </div>
                      <div className={cn('flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full',
                        timeLeft < 60 ? 'bg-red-100 text-red-600 dark:bg-red-500/20' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/20')}>
                        <Timer className="w-3 h-3" />
                        {mins}:{secs.toString().padStart(2, '0')}
                      </div>
                    </div>

                    {isResponding ? (
                      <div className="space-y-2 pt-1">
                        <Input label="Your price (₹)" type="number" placeholder="Enter your price"
                          value={respondPrice} onChange={e => setRespondPrice(e.target.value)} />
                        <Input label="Note (optional)" placeholder="e.g. Brand X available"
                          value={respondDesc} onChange={e => setRespondDesc(e.target.value)} />
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" className="flex-1" onClick={() => { setRespondingId(null); setRespondPrice(''); setRespondDesc('') }}>Cancel</Button>
                          <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" loading={respondLoading}
                            onClick={() => handleRespondRequest(req.id, true)}>
                            <Check className="w-3.5 h-3.5" /> Accept
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="outline" className="flex-1 text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-500/10"
                          loading={respondLoading} onClick={() => handleRespondRequest(req.id, false)}>
                          <XCircle className="w-3.5 h-3.5" /> Decline
                        </Button>
                        <Button size="sm" className="flex-1" onClick={() => setRespondingId(req.id)}>
                          <Check className="w-3.5 h-3.5" /> Respond
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </Modal>
    </div>
  )
}
