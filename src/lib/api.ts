import { useAuthStore } from '@/store/auth'
import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'

// ── Migration Helper ────────────────────────────────────────────────────────
// This prevents your app from crashing when you click on unmigrated pages.
// It acts like a fake backend that just returns empty data.
const stub = (name: string) => async (...args: any[]) => {
  console.warn(`🚧 [Firebase Migration]: ${name} is not wired up yet!`);
  return { data: { data: [] } }; // Fake response to keep the UI happy
}

// Dummy axios replacement so imports don't break
export const api = {
  post: stub('api.post'),
  get: stub('api.get'),
  patch: stub('api.patch'),
  delete: stub('api.delete'),
}

// ── Auth (Wired to Firebase) ────────────────────────────────────────────────
export const authApi = {
  sendOtp: stub('auth.sendOtp'),
  verifyOtp: stub('auth.verifyOtp'),
  register: stub('auth.register'),
  refresh: stub('auth.refresh'),
  
  // The ultimate kill switch
  logout: async () => {
    await signOut(auth);
    useAuthStore.getState().clearAuth(); // This wipes Zustand's memory instantly
  },
  logoutAll: async () => {
    await signOut(auth);
    useAuthStore.getState().clearAuth();
  },
}
// ── Users ───────────────────────────────────────────────────────────────────
export const usersApi = {
  me: stub('users.me'),
  updateMe: stub('users.updateMe'),
  stats: stub('users.stats'),
  notifications: stub('users.notifications'),
  publicProfile: stub('users.publicProfile'),
}

// ── Orders ──────────────────────────────────────────────────────────────────
export const ordersApi = {
  create: stub('orders.create'),
  list: stub('orders.list'),
  available: stub('orders.available'),
  getById: stub('orders.getById'),
  accept: stub('orders.accept'),
  leaving: stub('orders.leaving'),
  atShop: stub('orders.atShop'),
  itemPurchased: stub('orders.itemPurchased'),
  approvePhoto: stub('orders.approvePhoto'),
  rejectPhoto: stub('orders.rejectPhoto'),
  markPaid: stub('orders.markPaid'),
  delivering: stub('orders.delivering'),
  itemNotFound: stub('orders.itemNotFound'),
  arrived: stub('orders.arrived'),
  verifyOtp: stub('orders.verifyOtp'),
  cancel: stub('orders.cancel'),
}

// ── Other APIs (Safely Stubbed) ─────────────────────────────────────────────
export const paymentsApi = {
  createIntent: stub('payments.createIntent'),
  confirmPayment: stub('payments.confirmPayment'),
  getByOrder: stub('payments.getByOrder'),
}

export const walletApi = {
  get: stub('wallet.get'),
  transactions: stub('wallet.transactions'),
}

export const uploadApi = {
  chatPhoto: async (...args: any[]): Promise<any> => ({ data: { data: { message: {} } } }),
  orderItemPhoto: async (...args: any[]): Promise<any> => ({ data: { data: { url: "" } } }),
  complaintEvidence: async (...args: any[]): Promise<any> => ({ data: { data: { urls: [""] } } }),
  profilePhoto: async (...args: any[]): Promise<any> => ({ data: { data: { url: "" } } }),
}

export const chatApi = { history: stub('chat.history') }

export const ratingsApi = {
  submit: stub('ratings.submit'),
  check: stub('ratings.check'),
  getUserRatings: stub('ratings.getUserRatings'),
}

export const complaintsApi = {
  create: stub('complaints.create'),
  mine: stub('complaints.mine'),
  getById: stub('complaints.getById'),
}

export const vendorsApi = {
  login: stub('vendors.login'),
  register: stub('vendors.register'),
  list: stub('vendors.list'),
  getById: stub('vendors.getById'),
  me: stub('vendors.me'),
  updateMe: stub('vendors.updateMe'),
  myItems: stub('vendors.myItems'),
  addItem: stub('vendors.addItem'),
  updateItem: stub('vendors.updateItem'),
  deleteItem: stub('vendors.deleteItem'),
  searchItems: stub('vendors.searchItems'),
  createRequest: stub('vendors.createRequest'),
  myRequests: stub('vendors.myRequests'),
  vendorRequests: stub('vendors.vendorRequests'),
  respondRequest: stub('vendors.respondRequest'),
  broadcastRequest: stub('vendors.broadcastRequest'),
  cancelRequest: stub('vendors.cancelRequest'),
  deleteRequest: stub('vendors.deleteRequest'),
  myOrders: stub('vendors.myOrders'),
  analytics: stub('vendors.analytics'),
  activatePremium: stub('vendors.activatePremium'),
}

export const trackingApi = { getLocation: stub('tracking.getLocation') }

export const adminApi = {
  login: stub('admin.login'),
  dashboard: stub('admin.dashboard'),
  users: stub('admin.users'),
  getUserDetail: stub('admin.getUserDetail'),
  issueStrike: stub('admin.issueStrike'),
  banUser: stub('admin.banUser'),
  unbanUser: stub('admin.unbanUser'),
  orders: stub('admin.orders'),
  getOrderDetail: stub('admin.getOrderDetail'),
  overrideStatus: stub('admin.overrideStatus'),
  refund: stub('admin.refund'),
  complaints: stub('admin.complaints'),
  resolveComplaint: stub('admin.resolveComplaint'),
  pendingVendors: stub('admin.pendingVendors'),
  verifyVendor: stub('admin.verifyVendor'),
  rejectVendor: stub('admin.rejectVendor'),
  revenue: stub('admin.revenue'),
}

// ── Error Handling ──────────────────────────────────────────────────────────
export const getErrorMessage = (err: any): string => {
  if (err?.code && err.code.startsWith('auth/')) return err.message; // Firebase errors
  if (err?.message) return err.message;
  return 'Something went wrong. Please try again.';
}

export const getFieldErrors = (err: any): Record<string, string> => ({});