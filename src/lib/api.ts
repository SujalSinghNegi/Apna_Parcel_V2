import axios, { AxiosError } from 'axios'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export const api = axios.create({ baseURL: BASE, timeout: 15000 })

api.interceptors.request.use(cfg => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  async (err: AxiosError) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const refresh = localStorage.getItem('refreshToken')
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken: refresh })
          localStorage.setItem('accessToken', data.data.accessToken)
          localStorage.setItem('refreshToken', data.data.refreshToken)
          err.config!.headers!.Authorization = `Bearer ${data.data.accessToken}`
          return api(err.config!)
        } catch {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('apnaparcel-auth')
          window.location.href = '/auth'
        }
      } else {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('apnaparcel-auth')
        window.location.href = '/auth'
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  sendOtp: (email: string) => api.post('/auth/send-otp', { email }),
  verifyOtp: (email: string, otp: string) => api.post('/auth/verify-otp', { email, otp }),
  register: (data: Record<string, unknown>) => api.post('/auth/register', data),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  logoutAll: () => api.post('/auth/logout-all'),
}

// ── Users ───────────────────────────────────────────────────────────────────
export const usersApi = {
  me: () => api.get('/users/me'),
  updateMe: (data: Record<string, unknown>) => api.patch('/users/me', data),
  stats: () => api.get('/users/me/stats'),
  notifications: (page = 1) => api.get(`/users/me/notifications?page=${page}`),
  publicProfile: (id: string) => api.get(`/users/${id}`),
}

// ── Orders ──────────────────────────────────────────────────────────────────
export const ordersApi = {
  create: (data: Record<string, unknown>) => api.post('/orders', data),
  list: (role: 'client' | 'rider' = 'client', status?: string, page = 1) =>
    api.get(`/orders?role=${role}${status ? `&status=${status}` : ''}&page=${page}`),
  available: (params?: Record<string, unknown>) => api.get('/orders/available', { params }),
  getById: (id: string) => api.get(`/orders/${id}`),
  accept: (id: string, declaredEtaMinutes: number) => api.post(`/orders/${id}/accept`, { declaredEtaMinutes }),
  leaving: (id: string) => api.post(`/orders/${id}/leaving`),
  atShop: (id: string) => api.post(`/orders/${id}/at-shop`),
  itemPurchased: (id: string, purchasedPhotoUrl: string, actualPrice: number, purchasedPhotoUrls?: string[]) =>
    api.post(`/orders/${id}/item-purchased`, { purchasedPhotoUrl, actualPrice, purchasedPhotoUrls }),
  approvePhoto: (id: string) => api.post(`/orders/${id}/approve-photo`),
  rejectPhoto: (id: string, reason: string) => api.post(`/orders/${id}/reject-photo`, { reason }),
  markPaid: (id: string) => api.post(`/orders/${id}/mark-paid`),
  delivering: (id: string) => api.post(`/orders/${id}/delivering`),
  itemNotFound: (id: string) => api.post(`/orders/${id}/item-not-found`),
  arrived: (id: string) => api.post(`/orders/${id}/arrived`),
  verifyOtp: (id: string, otp: string) => api.post(`/orders/${id}/verify-otp`, { otp }),
  cancel: (id: string, reason: string) => api.post(`/orders/${id}/cancel`, { reason }),
}

// ── Payments ────────────────────────────────────────────────────────────────
export const paymentsApi = {
  createIntent: (orderId: string) => api.post('/payments/create-intent', { orderId }),
  confirmPayment: (orderId: string) => api.post('/payments/confirm-payment', { orderId }),
  getByOrder: (orderId: string) => api.get(`/payments/order/${orderId}`),
}

// ── Wallet ──────────────────────────────────────────────────────────────────
export const walletApi = {
  get: () => api.get('/wallet'),
  transactions: (page = 1) => api.get(`/wallet/transactions?page=${page}`),
}

// ── Upload ──────────────────────────────────────────────────────────────────
export const uploadApi = {
  profilePhoto: (file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post('/upload/profile-photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  orderItemPhoto: (file: File, orderId: string) => {
    const fd = new FormData(); fd.append('file', file); fd.append('orderId', orderId)
    return api.post('/upload/order-item-photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  chatPhoto: (file: File, orderId: string, caption?: string) => {
    const fd = new FormData(); fd.append('file', file); fd.append('orderId', orderId)
    if (caption) fd.append('caption', caption)
    return api.post('/upload/chat-photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  complaintEvidence: (files: File[], orderId: string) => {
    const fd = new FormData(); files.forEach(f => fd.append('files', f)); fd.append('orderId', orderId)
    return api.post('/upload/complaint-evidence', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  verificationDoc: (file: File, docNumber: 1 | 2) => {
    const fd = new FormData(); fd.append('file', file); fd.append('docNumber', String(docNumber))
    return api.post('/upload/verification-doc', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

// ── Chat ────────────────────────────────────────────────────────────────────
export const chatApi = {
  history: (orderId: string, page = 1) => api.get(`/chat/${orderId}?page=${page}`),
}

// ── Ratings ─────────────────────────────────────────────────────────────────
export const ratingsApi = {
  submit: (orderId: string, data: Record<string, unknown>) => api.post(`/ratings/${orderId}`, data),
  check: (orderId: string) => api.get(`/ratings/${orderId}/check`),
  getUserRatings: (userId: string) => api.get(`/ratings/user/${userId}`),
}

// ── Complaints ───────────────────────────────────────────────────────────────
export const complaintsApi = {
  create: (data: Record<string, unknown>) => api.post('/complaints', data),
  mine: () => api.get('/complaints/me'),
  getById: (id: string) => api.get(`/complaints/${id}`),
}

// ── Vendors ──────────────────────────────────────────────────────────────────
export const vendorsApi = {
  login: (email: string, password: string) => api.post('/vendors/login', { email, password }),
  register: (data: Record<string, unknown>) => api.post('/vendors/register', data),
  list: (category?: string) => api.get('/vendors', { params: category ? { category } : {} }),
  getById: (id: string) => api.get(`/vendors/${id}`),
  // My vendor shop
  me: () => api.get('/vendors/me'),
  updateMe: (data: Record<string, unknown>) => api.patch('/vendors/me', data),
  // Vendor items CRUD
  myItems: () => api.get('/vendors/me/items'),
  addItem: (data: Record<string, unknown>) => api.post('/vendors/me/items', data),
  updateItem: (itemId: string, data: Record<string, unknown>) => api.patch(`/vendors/me/items/${itemId}`, data),
  deleteItem: (itemId: string) => api.delete(`/vendors/me/items/${itemId}`),
  // Item search across vendors
  searchItems: (q: string, category?: string) => api.get('/vendors/items/search', { params: { q, ...(category && { category }) } }),
  // Item requests
  createRequest: (data: Record<string, unknown>) => api.post('/vendors/requests', data),
  myRequests: () => api.get('/vendors/requests/mine'),
  vendorRequests: () => api.get('/vendors/requests/vendor'),
  respondRequest: (id: string, data: Record<string, unknown>) => api.post(`/vendors/requests/${id}/respond`, data),
  broadcastRequest: (id: string) => api.post(`/vendors/requests/${id}/broadcast`),
  cancelRequest: (id: string) => api.post(`/vendors/requests/${id}/cancel`),
  deleteRequest: (id: string) => api.delete(`/vendors/requests/${id}`),
  // Vendor orders & analytics
  myOrders: (page = 1) => api.get(`/vendors/me/orders?page=${page}`),
  analytics: () => api.get('/vendors/me/analytics'),
  activatePremium: () => api.post('/vendors/me/premium'),
}

// ── Tracking ─────────────────────────────────────────────────────────────────
export const trackingApi = {
  getLocation: (orderId: string) => api.get(`/tracking/${orderId}`),
}

// ── Admin ────────────────────────────────────────────────────────────────────
export const adminApi = {
  login: (email: string, password: string) => api.post('/admin/login', { email, password }),
  dashboard: () => api.get('/admin/dashboard'),
  users: (params?: Record<string, unknown>) => api.get('/admin/users', { params }),
  getUserDetail: (id: string) => api.get(`/admin/users/${id}`),
  issueStrike: (id: string, data: Record<string, unknown>) => api.post(`/admin/users/${id}/strike`, data),
  banUser: (id: string, permanent: boolean, days?: number) => api.post(`/admin/users/${id}/ban`, { permanent, days }),
  unbanUser: (id: string) => api.post(`/admin/users/${id}/unban`),
  orders: (params?: Record<string, unknown>) => api.get('/admin/orders', { params }),
  getOrderDetail: (id: string) => api.get(`/admin/orders/${id}`),
  overrideStatus: (id: string, status: string) => api.patch(`/admin/orders/${id}/status`, { status }),
  refund: (id: string) => api.post(`/admin/orders/${id}/refund`),
  complaints: (params?: Record<string, unknown>) => api.get('/admin/complaints', { params }),
  resolveComplaint: (id: string, data: Record<string, unknown>) => api.patch(`/admin/complaints/${id}`, data),
  pendingVendors: () => api.get('/admin/vendors/pending'),
  verifyVendor: (id: string) => api.post(`/admin/vendors/${id}/verify`),
  rejectVendor: (id: string) => api.post(`/admin/vendors/${id}/reject`),
  revenue: (period: string) => api.get(`/admin/revenue?period=${period}`),
}

export const getErrorMessage = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (!data) {
      if (err.code === 'ECONNABORTED') return 'Request timed out. Please check your internet and try again.'
      if (err.code === 'ERR_NETWORK') return 'Unable to connect to server. Please check your internet connection.'
      return 'Something went wrong. Please try again.'
    }
    // If backend returned a readable message, use it directly
    if (data.message && data.message !== 'Validation failed') return data.message
    // For validation errors, show the summary message from backend
    if (data.message) return data.message
  }
  if (err instanceof Error) return err.message
  return 'Something went wrong. Please try again.'
}

/** Get field-level validation errors (for form field highlighting) */
export const getFieldErrors = (err: unknown): Record<string, string> => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data
    if (data?.errors && Array.isArray(data.errors)) {
      const fieldErrors: Record<string, string> = {}
      for (const e of data.errors) {
        if (e.field) fieldErrors[e.field] = e.message
      }
      return fieldErrors
    }
  }
  return {}
}
