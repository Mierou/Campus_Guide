'use client'
import { useEffect, useRef } from 'react'

type Marker = { lat: number; lng: number; label: string; color?: string; onClick?: () => void }
type RouteLine = { points: { lat: number; lng: number }[]; color?: string }
type Props = {
  center?: [number, number]
  zoom?: number
  markers?: Marker[]
  route?: RouteLine
  height?: string
  flyTo?: { lat: number; lng: number; zoom?: number } | null
}

function makePinHtml(color: string, label: string) {
  const short = label.replace(/\s+Building|\s+Hall/gi, '').slice(0, 4).trim()
  return `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
    <div style="
      background:${color};
      color:white;
      border:2.5px solid white;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      width:32px;height:32px;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 3px 8px rgba(0,0,0,0.4);
    ">
      <span style="transform:rotate(45deg);font-size:8.5px;font-weight:800;font-family:sans-serif;text-align:center;line-height:1.1;max-width:24px;word-break:break-all;">${short}</span>
    </div>
  </div>`
}

export default function CampusMap({
  center = [10.2945, 123.8811],
  zoom = 19,
  markers = [],
  route,
  height = '400px',
  flyTo,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<{
    map: any; L: any; layers: any[];
    initialized: boolean; destroyed: boolean
  }>({ map: null, L: null, layers: [], initialized: false, destroyed: false })

  // Serialise markers to a stable string so we can compare without object refs
  const markersKey = JSON.stringify(markers.map(m => ({ lat: m.lat, lng: m.lng, label: m.label, color: m.color })))
  const routeKey   = JSON.stringify(route?.points)

  // ── Init map (runs once) ──────────────────────────────────────────────────
  useEffect(() => {
    const s = stateRef.current
    if (s.initialized || !containerRef.current) return

    import('leaflet').then(L => {
      if (s.destroyed || !containerRef.current) return

      // Pure satellite — no Google POI icons (lyrs=s)
      const sat = L.tileLayer(
        'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        { subdomains: ['0','1','2','3'], maxZoom: 22, maxNativeZoom: 21, attribution: '© Google' }
      )
      // Hybrid adds road / label overlay on top
      const hybrid = L.tileLayer(
        'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        { subdomains: ['0','1','2','3'], maxZoom: 22, maxNativeZoom: 21, attribution: '© Google' }
      )
      const osm = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 22, maxNativeZoom: 19, attribution: '© OSM' }
      )

      const map = L.map(containerRef.current!, {
        center, zoom, maxZoom: 22, zoomControl: true, scrollWheelZoom: true,
      })

      // Start with pure satellite (no Google POI clutter)
      sat.addTo(map)
      L.control.layers({ 'Satellite': sat, 'Hybrid': hybrid, 'Street': osm }, {}, { position: 'topright', collapsed: true }).addTo(map)

      s.map = map; s.L = L; s.initialized = true

      // Draw initial markers straight away
      drawMarkers(s)
    })

    return () => {
      stateRef.current.destroyed = true
      if (stateRef.current.map) {
        stateRef.current.map.remove()
        stateRef.current.map = null
        stateRef.current.L = null
        stateRef.current.layers = []
        stateRef.current.initialized = false
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Redraw markers when data changes ─────────────────────────────────────
  useEffect(() => {
    const s = stateRef.current
    if (!s.initialized || !s.map || !s.L) return
    drawMarkers(s)
  }, [markersKey, routeKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── FlyTo ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = stateRef.current
    if (!s.initialized || !s.map || !flyTo) return
    s.map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom ?? 20, { animate: true, duration: 0.7 })
  }, [flyTo])

  function drawMarkers(s: typeof stateRef.current) {
    const { map, L } = s
    // Clear old layers
    s.layers.forEach(l => { try { map.removeLayer(l) } catch {} })
    s.layers = []

    markers.forEach(m => {
      const icon = L.divIcon({
        html: makePinHtml(m.color ?? '#7B1C1C', m.label),
        iconSize:     [32, 40],
        iconAnchor:   [8, 40],
        tooltipAnchor:[16, -36],
        className: '',
      })
      const mk = L.marker([m.lat, m.lng], { icon })
        .bindTooltip(m.label, { permanent: false, direction: 'top', offset: [8, 0] })
        .addTo(map)
      if (m.onClick) mk.on('click', m.onClick)
      s.layers.push(mk)
    })

    if (route?.points?.length) {
      const pts = route.points.map(p => [p.lat, p.lng] as [number, number])
      const line = L.polyline(pts, {
        color: route.color ?? '#38bdf8', weight: 5, opacity: 0.9,
        dashArray: '10,6', lineCap: 'round',
      }).addTo(map)
      map.fitBounds(line.getBounds(), { padding: [40, 40] })
      s.layers.push(line)
    }
  }

  return (
    <div className="map-wrapper" style={{ height }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
