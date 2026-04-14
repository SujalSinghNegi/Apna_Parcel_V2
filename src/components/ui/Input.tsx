import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; hint?: string; icon?: React.ReactNode
}
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className, ...props }, ref) => (
    <div className="space-y-1">
      {label && <label className="block text-sm font-bold text-navy-700">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400">{icon}</span>}
        <input ref={ref}
          className={cn('w-full rounded-xl border-2 bg-white px-4 py-3 text-sm text-navy transition-all duration-150 placeholder:text-gray-400 focus:outline-none focus:ring-0',
            icon ? 'pl-10' : '',
            error ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-brand',
            className)}
          {...props} />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
)
Input.displayName = 'Input'
