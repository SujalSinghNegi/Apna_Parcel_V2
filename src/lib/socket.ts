import { io, Socket } from 'socket.io-client'

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000'

let socket: Socket | null = null

export const getSocket = (): Socket | null => socket

export const initSocket = (token: string): Socket => {
  if (socket?.connected) return socket
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })
  return socket
}

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null }
}

export const joinOrderRoom = (orderId: string) => socket?.emit('order:join', orderId)
export const leaveOrderRoom = (orderId: string) => socket?.emit('order:leave', orderId)

export const sendChatMessage = (orderId: string, content?: string, photoUrl?: string, quickMsgKey?: string) =>
  socket?.emit('chat:message:send', { orderId, content, photoUrl, quickMsgKey })

export const sendLocation = (orderId: string, lat: number, lng: number, accuracy?: number, heading?: number, speed?: number) =>
  socket?.emit('rider:location:update', { orderId, latitude: lat, longitude: lng, accuracy, heading, speed })

export const EVENTS = {
  RIDER_LOCATION: 'rider:location:broadcast',
  ORDER_STATUS: 'order:status:changed',
  ORDER_ACCEPTED: 'order:accepted',
  RIDER_LEFT: 'rider:left',
  RIDER_ARRIVED: 'rider:arrived',
  ORDER_DELIVERED: 'order:delivered',
  ORDER_CANCELLED: 'order:cancelled',
  MESSAGE_RECEIVE: 'chat:message:receive',
  NOTIFICATION: 'notification',
  ERROR: 'error',
} as const
