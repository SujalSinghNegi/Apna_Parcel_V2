import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]'
    const variants = {
      primary: 'bg-brand text-white hover:bg-brand-500 focus:ring-brand shadow-sm shadow-brand/20',
      secondary: 'bg-navy text-white hover:bg-navy-600 focus:ring-navy shadow-sm',
      outline: 'border-2 border-brand text-brand hover:bg-brand-50 focus:ring-brand',
      ghost: 'text-navy-600 hover:bg-navy-50 focus:ring-navy',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    }
    const sizes = { sm: 'text-sm px-3 py-1.5', md: 'text-sm px-5 py-2.5', lg: 'text-base px-6 py-3' }
    return (
      <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
