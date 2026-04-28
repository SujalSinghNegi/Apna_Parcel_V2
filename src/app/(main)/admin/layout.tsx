'use client'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Loader2, ShieldAlert } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!user) return
    if (!user.isAdmin) {
      router.replace('/dashboard')
      return
    }
    setChecked(true)
  }, [user, router])

  if (!user || !checked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        {user && !user.isAdmin ? (
          <>
            <ShieldAlert className="w-12 h-12 text-red-500" />
            <p className="text-lg font-bold text-red-600">Access Denied</p>
            <p className="text-sm text-gray-500">Admin privileges required</p>
          </>
        ) : (
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
        )}
      </div>
    )
  }

  return <>{children}</>
}
