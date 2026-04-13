import { cn } from '@/lib/utils'
export const Card = ({ children, className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bg-white rounded-2xl border border-gray-100 shadow-sm', className)} {...p}>{children}</div>
)
export const CardHeader = ({ children, className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('px-6 pt-6 pb-4', className)} {...p}>{children}</div>
)
export const CardContent = ({ children, className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('px-6 pb-6', className)} {...p}>{children}</div>
)
