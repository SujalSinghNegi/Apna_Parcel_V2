import { cn } from '@/lib/utils'
import { TrustLevel, OrderStatus, TRUST_LEVEL_NAMES } from '@/types'
import { TRUST_COLORS, STATUS_COLORS } from '@/lib/utils'
import { ORDER_STATUS_LABELS } from '@/types'

export const TrustBadge = ({ level }: { level: TrustLevel | number | any }) => {
  // Automatically convert a number like 1 into "LEVEL_1"
  const safeLevel = (typeof level === 'number' ? `LEVEL_${level}` : level) as TrustLevel;
  
  // Safe fallbacks so it never crashes if the value is missing
  const c = TRUST_COLORS[safeLevel] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };
  const name = TRUST_LEVEL_NAMES ? TRUST_LEVEL_NAMES[safeLevel] || "New User" : "New User";

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border', c.bg, c.text, c.border)}>
      <span>⭐</span>{name}
    </span>
  )
}

export const StatusBadge = ({ status }: { status: OrderStatus | any }) => {
  // Tell TypeScript to treat this as a valid OrderStatus
  const safeStatus = status as OrderStatus;
  
  // Safe fallbacks for status as well
  const c = STATUS_COLORS[safeStatus] || { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400' }
  const label = ORDER_STATUS_LABELS ? ORDER_STATUS_LABELS[safeStatus] || "Unknown" : "Unknown";

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold', c.bg, c.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', c.dot)} />
      {label}
    </span>
  )
}