import { cn } from '@/lib/utils'
import { TrustLevel, OrderStatus, TRUST_LEVEL_NAMES } from '@/types'
import { TRUST_COLORS, STATUS_COLORS } from '@/lib/utils'
import { ORDER_STATUS_LABELS } from '@/types'

export const TrustBadge = ({ level }: { level: TrustLevel }) => {
  const c = TRUST_COLORS[level]
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border', c.bg, c.text, c.border)}>
      <span>⭐</span>{TRUST_LEVEL_NAMES[level]}
    </span>
  )
}

export const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const c = STATUS_COLORS[status] || { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold', c.bg, c.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', c.dot)} />
      {ORDER_STATUS_LABELS[status]}
    </span>
  )
}
