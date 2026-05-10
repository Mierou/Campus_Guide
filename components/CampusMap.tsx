'use client'
import { useEffect, useRef } from 'react'

type Marker = {
  lat: number; lng: number; label: string; color?: string; onClick?: () => void
}
type RouteLine = { points: { lat: number; lng: number }[]; color?: string }
type Props = {
  center?: [number, number]
  zoom?: number
  markers?: Marker[]
  route?: RouteLine
  height?: string
  flyTo?: { lat: number; lng: number; zoom?: number } | null
}

export default function CampusMap({ center = [10.2945, 123.8811], zoom = 19, markers = [], route, height = '400px', flyTo }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    import('leaflet').then((L) => {
      const map = L.map(mapRef.current!, { center, zoom, zoomControl: true, scrollWheelZoom: true })
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri Satellite', maxZoom: 20,
      }).addTo(map)
      mapInstanceRef.current = { map, L, layers: [] }
    })
    return () => {
      if (mapInstanceRef.current?.map) { mapInstanceRef.current.map.remove(); mapInstanceRef.current = null }
    }
  }, [])

  // Update markers + route
  useEffect(() => {
    const inst = mapInstanceRef.current
    if (!inst) return
    const { map, L, layers } = inst
    layers.forEach((l: any) => map.removeLayer(l))
    inst.layers = []

    markers.forEach((m) => {
      const icon = L.divIcon({
        html: `<div style="background:${m.color ?? '#7B1C1C'};width:13px;height:13px;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.45);"></div>`,
        iconSize: [13, 13], iconAnchor: [6, 6], className: '',
      })
      const marker = L.marker([m.lat, m.lng], { icon })
        .bindTooltip(m.label, { permanent: false, direction: 'top', offset: [0, -8] })
        .addTo(map)
      if (m.onClick) marker.on('click', m.onClick)
      inst.layers.push(marker)
    })

    if (route?.points?.length) {
      const latlngs = route.points.map(p => [p.lat, p.lng] as [number, number])
      const polyline = L.polyline(latlngs, { color: route.color ?? '#4fc3f7', weight: 4, opacity: 0.85, dashArray: '8,4' }).addTo(map)
      map.fitBounds(polyline.getBounds(), { padding: [30, 30] })
      inst.layers.push(polyline)
    }
  }, [markers, route])

  // Fly to selected location
  useEffect(() => {
    const inst = mapInstanceRef.current
    if (!inst || !flyTo) return
    inst.map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom ?? 20, { animate: true, duration: 0.8 })
  }, [flyTo])

  return (
    <div className="map-wrapper" style={{ height }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
