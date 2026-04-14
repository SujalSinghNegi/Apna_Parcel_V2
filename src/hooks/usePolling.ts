'use client'
import { useEffect, useRef, useCallback } from 'react'

/**
 * Custom hook for polling with automatic cleanup.
 * Calls `callback` immediately then every `interval` ms.
 * Pauses when tab is hidden, resumes when visible.
 */
export function usePolling(callback: () => void | Promise<void>, interval: number, enabled = true) {
  const savedCallback = useRef(callback)
  savedCallback.current = callback

  useEffect(() => {
    if (!enabled) return

    const tick = () => savedCallback.current()

    // Don't call immediately — let the component's own useEffect handle the initial fetch
    const id = setInterval(tick, interval)

    // Pause/resume on visibility change
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [interval, enabled])
}
