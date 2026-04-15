import { cn } from '@/lib/utils'
export const Card = ({ children, className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm dark:shadow-none', className)} {...p}>{children}</div>
)
export const CardHeader = ({ children, className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('px-6 pt-6 pb-4', className)} {...p}>{children}</div>
)
export const CardContent = ({ children, className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('px-6 pb-6', className)} {...p}>{children}</div>
)
