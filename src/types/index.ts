export type UserType = 'STUDENT' | 'LOCAL_PERSON' | 'STAFF_FACULTY';
export type UserRole = 'USER' | 'VENDOR' | 'ADMIN';
export type TrustLevel = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4';
export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PAID' | 'RIDER_LEFT' | 'AT_SHOP' | 'ITEM_PURCHASED' | 'PHOTO_APPROVED' | 'DELIVERING' | 'ARRIVED' | 'DELIVERED' | 'CANCELLED' | 'DISPUTED' | 'ITEM_NOT_FOUND';
export type ShopMode = 'SINGLE_SHOP' | 'MULTIPLE_SHOPS' | 'ENTIRE_AREA' | 'URGENT';
export type PaymentStatus = 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'FAILED' | 'CANCELLED';
export type ComplaintCategory = 'WRONG_ITEM' | 'ITEM_DAMAGED' | 'RIDER_MISBEHAVIOUR' | 'PAYMENT_ISSUE' | 'REFUND_NOT_RECEIVED' | 'OTHER';
export type ComplaintStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';

export interface User {
  id: string; name: string; email: string; phone?: string;
  userType: UserType; profilePhoto?: string; trustLevel: TrustLevel;
  role: UserRole;
  rating: number; ratingCount: number; completedOrders: number;
  strikeCount: number; isVerified: boolean; isAdmin: boolean;
  isBanned: boolean; isSuspended: boolean; suspendedUntil?: string;
  riderModeSuspendedUntil?: string; isRiderModePermanentlyBanned: boolean;
  collegeName?: string; yearOfStudy?: string; branch?: string;
  address?: string; occupation?: string; designation?: string; department?: string;
  createdAt: string;
}

export interface OrderUser {
  id: string; name: string; profilePhoto?: string;
  trustLevel: TrustLevel; rating: number; completedOrders: number;
}
export const TRUST_LEVEL_LIMITS = {
  LEVEL_1: 500,
  LEVEL_2: 1500,
  LEVEL_3: 3000,
  LEVEL_4: Infinity
};
export interface Order {
  id: string; clientId: string; riderId?: string;
  itemName: string; itemDescription?: string; itemPhotoUrl?: string;
  shopName?: string; shopLocation?: string; shopMode: ShopMode;
  expectedPrice: number; actualPrice?: number;
  baseFee: number; weightFee: number; distanceFee: number;
  modeFee: number; deliveryFee: number; platformFee: number;
  tip: number; totalAmount: number; weightKg: number; distanceKm: number;
  status: OrderStatus; purchasedPhotoUrl?: string; purchasedPhotoUrls?: string[]; photoApproved?: boolean;
  declaredEtaMinutes?: number; riderAcceptedAt?: string; riderLeftAt?: string;
  arrivedAt?: string; deliveredAt?: string; cancelledAt?: string;
  cancelReason?: string; cancelledBy?: string; travelCompensation?: number;
  deliveryOtp?: string; otpExpiresAt?: string; createdAt: string; updatedAt: string;
  client?: OrderUser; rider?: OrderUser;
  payment?: { status: PaymentStatus; totalAmount: number; stripePaymentIntentId?: string };
}

export interface Message {
  id: string; orderId: string; senderId: string;
  content?: string; photoUrl?: string;
  isQuickMsg: boolean; quickMsgKey?: string;
  createdAt: string;
  sender: { id: string; name: string; profilePhoto?: string };
}

export interface Notification {
  id: string; type: string; title: string; message: string;
  orderId?: string; isRead: boolean; createdAt: string;
}

export interface Rating {
  id: string; orderId: string; ratedById: string; ratedUserId: string;
  responseScore: number; accuracyScore: number; behaviourScore: number;
  averageScore: number; comment?: string; createdAt: string;
  ratedBy?: { name: string; profilePhoto?: string };
  order?: { itemName: string };
}

export interface Complaint {
  id: string; orderId: string; raisedById: string;
  category: ComplaintCategory; description: string;
  evidenceUrl?: string; status: ComplaintStatus;
  adminNotes?: string; resolvedAt?: string; createdAt: string;
  raisedBy?: { name: string; email: string };
  order?: { itemName: string; status: OrderStatus };
}

export interface Vendor {
  id: string; shopName: string; ownerName: string;
  shopPhotoUrl?: string; locationLat?: number; locationLng?: number;
  locationName?: string; category: string;
  openingTime?: string; closingTime?: string;
  phone: string; isVerified: boolean; isActive: boolean;
  isPremium: boolean; premiumExpiresAt?: string;
  userId?: string;
  vendorItems?: VendorItem[];
}

export type ItemRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

export interface VendorItem {
  id: string; vendorId: string; name: string;
  photoUrl?: string; price: number; weightKg: number; isAvailable: boolean;
  createdAt: string; updatedAt: string;
  vendor?: Vendor;
}

export interface ItemRequest {
  id: string; userId: string; vendorId: string;
  itemName: string; description?: string;
  maxPrice?: number; timerMinutes: number;
  expiresAt: string; status: ItemRequestStatus;
  vendorPrice?: number; vendorDescription?: string;
  respondedAt?: string; createdAt: string; updatedAt: string;
  vendor?: Vendor;
}

export interface Payment {
  id: string; orderId: string; clientId: string;
  stripePaymentIntentId?: string; stripeClientSecret?: string;
  itemPrice: number; deliveryFee: number; platformFee: number;
  tip: number; totalAmount: number; status: PaymentStatus;
  authorizedAt?: string; capturedAt?: string; refundedAt?: string;
  refundAmount?: number;
}

export interface ApiResponse<T> {
  success: boolean; message: string; data: T;
  meta?: { total: number; page: number; limit: number; pages: number };
}

export interface RiderLocation {
  latitude: number; longitude: number;
  accuracy?: number; heading?: number; speed?: number;
  updatedAt: string;
}

export const TRUST_LEVEL_NAMES: Record<TrustLevel, string> = {
  LEVEL_1: 'Naaya Saathi', LEVEL_2: 'Bharosemand',
  LEVEL_3: 'Apna Banda', LEVEL_4: 'Zimmedar'
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Searching for Rider', ACCEPTED: 'Rider Found',
  RIDER_LEFT: 'Rider On The Way', AT_SHOP: 'At Shop',
  ITEM_PURCHASED: 'Photo Sent', PHOTO_APPROVED: 'Photo Verified',
  PAID: 'Payment Done', DELIVERING: 'Delivering', ARRIVED: 'Rider Arrived',
  DELIVERED: 'Delivered', CANCELLED: 'Cancelled',
  DISPUTED: 'Under Review', ITEM_NOT_FOUND: 'Item Not Found'
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  RIDER_LEFT: 'bg-indigo-100 text-indigo-800',
  AT_SHOP: 'bg-purple-100 text-purple-800',
  ITEM_PURCHASED: 'bg-orange-100 text-orange-800',
  PHOTO_APPROVED: 'bg-teal-100 text-teal-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  DELIVERING: 'bg-cyan-100 text-cyan-800',
  ARRIVED: 'bg-lime-100 text-lime-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  DISPUTED: 'bg-rose-100 text-rose-800',
  ITEM_NOT_FOUND: 'bg-gray-100 text-gray-800'
};
