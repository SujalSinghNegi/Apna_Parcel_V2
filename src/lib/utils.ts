import { clsx, type ClassValue } from 'clsx'
import { format, formatDistanceToNow } from 'date-fns'
import { TrustLevel, OrderStatus } from '@/types'

export const cn = (...inputs: ClassValue[]) => clsx(inputs)

export const fmt = {
  date: (d: string | Date) => format(new Date(d), 'dd MMM yyyy'),
  time: (d: string | Date) => format(new Date(d), 'h:mm a'),
  datetime: (d: string | Date) => format(new Date(d), 'dd MMM, h:mm a'),
  relative: (d: string | Date) => formatDistanceToNow(new Date(d), { addSuffix: true }),
  currency: (n: number) => `₹${n.toFixed(0)}`,
  currencyDecimal: (n: number) => `₹${n.toFixed(2)}`,
}

export const TRUST_COLORS: Record<TrustLevel, { bg: string; text: string; border: string }> = {
  LEVEL_1: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  LEVEL_2: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  LEVEL_3: { bg: 'bg-brand-50', text: 'text-brand-700', border: 'border-brand-200' },
  LEVEL_4: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
}

export const STATUS_COLORS: Partial<Record<OrderStatus, { bg: string; text: string; dot: string }>> = {
  PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-800', dot: 'bg-yellow-400' },
  ACCEPTED: { bg: 'bg-blue-50', text: 'text-blue-800', dot: 'bg-blue-400' },
  RIDER_LEFT: { bg: 'bg-indigo-50', text: 'text-indigo-800', dot: 'bg-indigo-400' },
  AT_SHOP: { bg: 'bg-purple-50', text: 'text-purple-800', dot: 'bg-purple-400' },
  ITEM_PURCHASED: { bg: 'bg-orange-50', text: 'text-orange-800', dot: 'bg-orange-400' },
  PHOTO_APPROVED: { bg: 'bg-teal-50', text: 'text-teal-800', dot: 'bg-teal-400' },
  DELIVERING: { bg: 'bg-cyan-50', text: 'text-cyan-800', dot: 'bg-cyan-400' },
  ARRIVED: { bg: 'bg-lime-50', text: 'text-lime-800', dot: 'bg-lime-400' },
  DELIVERED: { bg: 'bg-green-50', text: 'text-green-800', dot: 'bg-green-400' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-800', dot: 'bg-red-400' },
  DISPUTED: { bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-400' },
  ITEM_NOT_FOUND: { bg: 'bg-gray-50', text: 'text-gray-800', dot: 'bg-gray-400' },
}

export const canClientCancel = (status: OrderStatus) =>
  ['PENDING', 'ACCEPTED'].includes(status)

export const isActiveOrder = (status: OrderStatus) =>
  !['DELIVERED', 'CANCELLED', 'ITEM_NOT_FOUND'].includes(status)

export const initials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
