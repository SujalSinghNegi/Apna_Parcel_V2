'use client'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useEffect } from 'react'
interface ModalProps { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' }
const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' }
export const Modal = ({ open, onClose, title, children, size = 'md' }: ModalProps) => {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative bg-white rounded-2xl shadow-2xl w-full animate-slide-up', widths[size])}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-extrabold text-lg text-navy">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"><X className="w-4 h-4" /></button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
