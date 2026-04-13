'use client'
import { useEffect, useRef } from 'react'
import { getSocket, initSocket, EVENTS } from '@/lib/socket'
import { Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/auth'

export const useSocket = () => {
  const { accessToken } = useAuthStore() as any
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!accessToken) return
    socketRef.current = initSocket(accessToken)
    return () => { /* keep socket alive across navigations */ }
  }, [accessToken])

  return socketRef.current || getSocket()
}

export const useOrderSocket = (orderId: string, handlers: Partial<Record<keyof typeof EVENTS, (data: any) => void>>) => {
  const { accessToken } = useAuthStore() as any

  useEffect(() => {
    if (!accessToken || !orderId) return
    const socket = initSocket(accessToken)
    socket.emit('order:join', orderId)

    const registered: string[] = []
    Object.entries(handlers).forEach(([eventKey, handler]) => {
      const eventName = EVENTS[eventKey as keyof typeof EVENTS]
      if (eventName && handler) {
        socket.on(eventName, handler)
        registered.push(eventName)
      }
    })

    return () => {
      socket.emit('order:leave', orderId)
      registered.forEach(e => socket.off(e))
    }
  }, [accessToken, orderId])
}
