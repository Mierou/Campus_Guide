'use client'
import { useEffect, useRef } from 'react'

export type MapMarker = {
  id?: string | number
  lat: number
  lng: number
  label: string
  color?: string
}

type RouteLine = { points: { lat: number; lng: number }[]; color?: string }

type Props = {
  center?: [number, number]
  zoom?: number
  markers?: MapMarker[]
  route?: RouteLine
  height?: string
  flyTo?: { lat: number; lng: number; zoom?: number } | null
  onMarkerClick?: (id: string | number) => void
}

function pinHtml(color: string, label: string) {
  const short = label.replace(/\s+Building|\s+Hall|\s+Lot/gi, '').trim().slice(0, 4)
  return (
    `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">` +
    `<div style="background:${color};color:white;border:2.5px solid white;` +
    `border-radius:50% 50% 50% 0;transform:rotate(-45deg);width:32px;height:32px;` +
    `display:flex;align-items:center;justify-content:center;` +
    `box-shadow:0 3px 8px rgba(0,0,0,0.45);">` +
    `<span style="transform:rotate(45deg);font-size:8px;font-weight:800;` +
    `font-family:sans-serif;text-align:center;line-height:1.1;max-width:24px;">${short}</span>` +
    `</div></div>`
  )
}

export default function CampusMap({
  center = [10.2945, 123.8811],
  zoom = 19,
  markers = [],
  route,
  height = '400px',
  flyTo,
  onMarkerClick,
}: Props) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const mapRef         = useRef<any>(null)
  const LRef           = useRef<any>(null)
  const layersRef      = useRef<any[]>([])
  const readyRef       = useRef(false)
  const onClickRef     = useRef(onMarkerClick)
  // Update click ref every render — no stale closures
  onClickRef.current   = onMarkerClick

  // Stable string keys — prevents unnecessary redraws
  const mKey = markers.map(m => `${m.id ?? m.label}|${m.lat}|${m.lng}|${m.color ?? ''}`).join(';')
  const rKey = route ? route.points.map(p => `${p.lat},${p.lng}`).join(';') : ''

  function draw(L: any, map: any) {
    layersRef.current.forEach(l => { try { map.removeLayer(l) } catch (_) {} })
    layersRef.current = []

    markers.forEach(m => {
      const icon = L.divIcon({
        html: pinHtml(m.color ?? '#7B1C1C', m.label),
        iconSize: [32, 40], iconAnchor: [8, 40], tooltipAnchor: [16, -36],
        className: '',
      })
      const mk = L.marker([m.lat, m.lng], { icon })
        .bindTooltip(m.label, { permanent: false, direction: 'top', offset: [8, 0] })
        .addTo(map)
      const markerId = m.id ?? m.label
      mk.on('click', () => onClickRef.current?.(markerId))
      layersRef.current.push(mk)
    })

    if (route?.points?.length) {
      const pts = route.points.map(p => [p.lat, p.lng] as [number, number])
      const line = L.polyline(pts, {
        color: route.color ?? '#38bdf8', weight: 5, opacity: 0.9,
        dashArray: '10,6', lineCap: 'round',
      }).addTo(map)
      map.fitBounds(line.getBounds(), { padding: [40, 40] })
      layersRef.current.push(line)
    }
  }

  // Init — runs once on mount
  useEffect(() => {
    if (readyRef.current || !containerRef.current) return
    let destroyed = false

    import('leaflet').then(L => {
      if (destroyed || !containerRef.current) return
      LRef.current = L

      const map = L.map(containerRef.current!, {
        center, zoom, maxZoom: 22,
        zoomControl: true, scrollWheelZoom: true,
      })
      mapRef.current = map
      readyRef.current = true

      const sat = L.tileLayer(
        'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        { subdomains: ['0','1','2','3'], maxZoom: 22, maxNativeZoom: 21, attribution: '© Google' }
      )
      const hybrid = L.tileLayer(
        'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        { subdomains: ['0','1','2','3'], maxZoom: 22, maxNativeZoom: 21, attribution: '© Google' }
      )
      const osm = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 22, maxNativeZoom: 19, attribution: '© OSM' }
      )

      sat.addTo(map)
      L.control.layers(
        { 'Satellite': sat, 'Hybrid': hybrid, 'Street': osm },
        {}, { position: 'topright', collapsed: true }
      ).addTo(map)

      draw(L, map)
    })

    return () => {
      destroyed = true
      readyRef.current = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        LRef.current = null
        layersRef.current = []
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Redraw markers when data changes
  useEffect(() => {
    if (!readyRef.current || !mapRef.current || !LRef.current) return
    draw(LRef.current, mapRef.current)
  }, [mKey, rKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // FlyTo — only when flyTo object changes by value
  const flyKey = flyTo ? `${flyTo.lat}|${flyTo.lng}|${flyTo.zoom ?? 20}` : ''
  useEffect(() => {
    if (!flyKey || !readyRef.current || !mapRef.current) return
    const [lat, lng, z] = flyKey.split('|').map(Number)
    mapRef.current.flyTo([lat, lng], z, { animate: true, duration: 0.7 })
  }, [flyKey]) // stable string key — no object reference issues

  return (
    <div className="map-wrapper" style={{ height }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
