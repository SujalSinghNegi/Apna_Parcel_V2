'use client'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { NotificationListener } from '@/components/ui/NotificationToast'
import { PageTransition } from '@/components/layout/PageTransition'
import { useAuthStore } from '@/store/auth'
import { useSidebarStore } from '@/store/sidebar'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const { collapsed } = useSidebarStore()
  const router = useRouter()
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)

  // Wait for Zustand persist to rehydrate from localStorage
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
    // If already hydrated (fast path)
    if (useAuthStore.persist.hasHydrated()) setHydrated(true)
    return () => unsub()
  }, [])

  // Only redirect after hydration is complete
  useEffect(() => {
    if (hydrated && !user) router.push('/auth')
  }, [hydrated, user, router])

  if (!hydrated || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  )
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <NotificationListener />
      {/* Main content area — offset for sidebar on desktop */}
      <div className={`transition-all duration-300 ${collapsed ? 'md:pl-[72px]' : 'md:pl-[260px]'}`}>
        <main className="pb-20 md:pb-0">
          <PageTransition key={pathname}>
            {children}
          </PageTransition>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
