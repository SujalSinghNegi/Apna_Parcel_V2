'use client'
import { useEffect, useRef, useState } from 'react'
import { RiderLocation } from '@/types'
import { Navigation, Signal, WifiOff } from 'lucide-react'

interface LiveMapProps {
  orderId: string
  lastKnownLocation?: RiderLocation | null
  /** Called by parent with each incoming socket location payload */
  onLocationRef?: (fn: (loc: RiderLocation) => void) => void
}

export const LiveMap = ({ orderId, lastKnownLocation, onLocationRef }: LiveMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const pathRef = useRef<any>(null)
  const coordsRef = useRef<[number, number][]>([])
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  // Lazy-load Leaflet (not SSR-safe otherwise)
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return

    let L: any
    const init = async () => {
      // Dynamically import leaflet so it doesn't break SSR
      L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css' as any).catch(() => {
        // inject CSS manually if dynamic import not supported
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link')
          link.id = 'leaflet-css'
          link.rel = 'stylesheet'
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
          document.head.appendChild(link)
        }
      })

      // Fix default marker icon path broken by webpack
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const initialLat = lastKnownLocation?.latitude ?? 29.683
      const initialLng = lastKnownLocation?.longitude ?? 79.392

      const map = L.map(mapRef.current!, {
        center: [initialLat, initialLng],
        zoom: 15,
        zoomControl: true,
        attributionControl: false,
      })

      // OpenStreetMap tiles — free, no API key
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(map)

      // Custom rider icon
      const riderIcon = L.divIcon({
        className: '',
        html: `
          <div style="
            width:40px;height:40px;
            background:#FF6B35;
            border-radius:50% 50% 50% 4px;
            border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
            transform:rotate(-45deg);
          ">
            <span style="transform:rotate(45deg);font-size:18px;">🚴</span>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      })

      const marker = L.marker([initialLat, initialLng], { icon: riderIcon })
        .addTo(map)
        .bindPopup('<strong>Rider is here</strong>')

      // Breadcrumb path
      const path = L.polyline([], {
        color: '#FF6B35',
        weight: 3,
        opacity: 0.6,
        dashArray: '6 4',
      }).addTo(map)

      mapInstanceRef.current = map
      markerRef.current = marker
      pathRef.current = path

      if (lastKnownLocation) {
        coordsRef.current = [[lastKnownLocation.latitude, lastKnownLocation.longitude]]
        path.setLatLngs(coordsRef.current)
        setLastUpdate(lastKnownLocation.updatedAt)
        setConnected(true)
      }
    }

    init().catch(console.error)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, []) // only once on mount

  // Expose updater function to parent via ref callback
  useEffect(() => {
    if (!onLocationRef) return
    onLocationRef((loc: RiderLocation) => {
      const latlng: [number, number] = [loc.latitude, loc.longitude]

      if (markerRef.current && mapInstanceRef.current) {
        markerRef.current.setLatLng(latlng)
        mapInstanceRef.current.panTo(latlng, { animate: true, duration: 0.8 })
      }

      if (pathRef.current) {
        coordsRef.current = [...coordsRef.current.slice(-50), latlng] // keep last 50 points
        pathRef.current.setLatLngs(coordsRef.current)
      }

      setConnected(true)
      setLastUpdate(new Date().toISOString())
    })
  }, [onLocationRef])

  return (
    <div className="relative">
      {/* Inject Leaflet CSS inline so it works without any build config */}
      <style>{`
        .leaflet-container { font-family: var(--font-dm-sans), sans-serif; }
        .leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.12); }
      `}</style>

      <div ref={mapRef} className="w-full h-64 rounded-2xl overflow-hidden z-0" style={{ minHeight: 256 }} />

      {/* Status overlay */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md">
        {connected ? (
          <>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <Signal className="w-3.5 h-3.5 text-green-600" />
            <span className="text-xs font-bold text-green-700">Live</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-bold text-gray-500">Connecting…</span>
          </>
        )}
      </div>

      {/* Center-on-rider button */}
      {connected && (
        <button
          onClick={() => {
            const last = coordsRef.current.at(-1)
            if (last && mapInstanceRef.current) {
              mapInstanceRef.current.flyTo(last, 16, { animate: true, duration: 0.8 })
            }
          }}
          className="absolute bottom-3 right-3 z-10 w-9 h-9 bg-white rounded-xl shadow-md flex items-center justify-center hover:bg-brand hover:text-white transition-colors"
        >
          <Navigation className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
