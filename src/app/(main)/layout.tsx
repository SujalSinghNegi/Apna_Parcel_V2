'use client'
import { Navbar } from '@/components/layout/Navbar'
import { MobileNav } from '@/components/layout/MobileNav'
import { NotificationListener } from '@/components/ui/NotificationToast'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const router = useRouter()
  useEffect(() => { if (!user) router.push('/auth') }, [user, router])
  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  )
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <NotificationListener />
      <main className="pb-20 md:pb-0">{children}</main>
      <MobileNav />
    </div>
  )
}
