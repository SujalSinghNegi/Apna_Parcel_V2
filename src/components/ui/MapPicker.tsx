'use client'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface LatLng { lat: number; lng: number }

interface Props {
  shopCoords: LatLng | null
  clientCoords: LatLng | null
  onShopCoordsChange: (coords: LatLng) => void
}

const pin = (color: string, emoji: string) =>
  L.divIcon({
    className: '',
    html: `<div style="width:34px;height:34px;background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-size:15px">${emoji}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  })

const SHOP_PIN = pin('#f97316', '🏪')
const CLIENT_PIN = pin('#3b82f6', '📍')

export default function MapPicker({ shopCoords, clientCoords, onShopCoordsChange }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const shopM = useRef<L.Marker | null>(null)
  const clientM = useRef<L.Marker | null>(null)
  const line = useRef<L.Polyline | null>(null)
  const cb = useRef(onShopCoordsChange)
  cb.current = onShopCoordsChange

  /* init map */
  useEffect(() => {
    if (!el.current || map.current) return
    const m = L.map(el.current, { zoomControl: false }).setView([29.77, 79.42], 13)
    L.control.zoom({ position: 'bottomright' }).addTo(m)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OSM',
      maxZoom: 19,
    }).addTo(m)
    m.on('click', (e: L.LeafletMouseEvent) => cb.current({ lat: e.latlng.lat, lng: e.latlng.lng }))
    map.current = m
    return () => { m.remove(); map.current = null }
  }, [])

  /* shop marker */
  useEffect(() => {
    const m = map.current
    if (!m) return
    if (shopM.current) shopM.current.remove()
    if (shopCoords) {
      const mk = L.marker([shopCoords.lat, shopCoords.lng], { icon: SHOP_PIN, draggable: true }).addTo(m)
      mk.bindPopup('<b>Shop</b><br><small>Drag to adjust</small>')
      mk.on('dragend', () => { const p = mk.getLatLng(); cb.current({ lat: p.lat, lng: p.lng }) })
      shopM.current = mk
    }
    drawLine()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopCoords?.lat, shopCoords?.lng])

  /* client marker */
  useEffect(() => {
    const m = map.current
    if (!m) return
    if (clientM.current) clientM.current.remove()
    if (clientCoords) {
      const mk = L.marker([clientCoords.lat, clientCoords.lng], { icon: CLIENT_PIN }).addTo(m)
      mk.bindPopup('<b>You</b>')
      clientM.current = mk
      if (!shopCoords) m.setView([clientCoords.lat, clientCoords.lng], 14)
    }
    drawLine()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientCoords?.lat, clientCoords?.lng])

  /* fit bounds when both exist */
  useEffect(() => {
    const m = map.current
    if (!m || !shopCoords || !clientCoords) return
    m.fitBounds(
      L.latLngBounds([shopCoords.lat, shopCoords.lng], [clientCoords.lat, clientCoords.lng]),
      { padding: [50, 50], maxZoom: 16 },
    )
  }, [shopCoords?.lat, shopCoords?.lng, clientCoords?.lat, clientCoords?.lng])

  function drawLine() {
    const m = map.current
    if (!m) return
    if (line.current) line.current.remove()
    if (shopCoords && clientCoords) {
      line.current = L.polyline(
        [[shopCoords.lat, shopCoords.lng], [clientCoords.lat, clientCoords.lng]],
        { color: '#f97316', weight: 2, dashArray: '8 6', opacity: 0.7 },
      ).addTo(m)
    }
  }

  return <div ref={el} className="w-full h-[220px] rounded-xl overflow-hidden border border-gray-200" style={{ zIndex: 0 }} />
}
