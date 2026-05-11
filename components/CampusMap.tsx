'use client'
import { useEffect, useRef, useCallback } from 'react'

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

// Custom pin SVG — teardrop shape with a dot
function makePinSvg(color: string, label: string) {
  // Pick a contrasting label color
  const isDark = ['#1a7a40','#1a5fa0','#6a1a9a','#107a50','#1a30a0','#8a6010','#a01a1a','#a01a6a','#7B1C1C','#c0392b'].includes(color)
  const bg = color
  // Short label for the pin (max 4 chars)
  const short = label.length > 4 ? label.slice(0,4) : label

  return `
    <div style="
      position:relative;
      display:flex;
      flex-direction:column;
      align-items:center;
      filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));
      cursor:pointer;
    ">
      <div style="
        background:${bg};
        color:white;
        border:2.5px solid white;
        border-radius:12px 12px 12px 0;
        transform:rotate(-45deg);
        width:34px; height:34px;
        display:flex; align-items:center; justify-content:center;
        box-shadow:inset 0 1px 3px rgba(255,255,255,0.25);
      ">
        <span style="
          transform:rotate(45deg);
          font-size:9px;
          font-weight:800;
          font-family:'Plus Jakarta Sans',sans-serif;
          letter-spacing:-0.5px;
          line-height:1;
          text-align:center;
          max-width:22px;
          overflow:hidden;
          color:white;
        ">${short}</span>
      </div>
    </div>
  `
}

export default function CampusMap({
  center = [10.2945, 123.8811],
  zoom = 19,
  markers = [],
  route,
  height = '400px',
  flyTo,
}: Props) {
  const mapRef      = useRef<HTMLDivElement>(null)
  const mapReady    = useRef(false)
  const LRef        = useRef<any>(null)
  const mapObjRef   = useRef<any>(null)
  const layersRef   = useRef<any[]>([])
  const pendingRef  = useRef<{ markers: Marker[]; route?: RouteLine } | null>(null)

  // Draw markers & route onto the map
  const drawLayers = useCallback((L: any, map: any, mks: Marker[], rt?: RouteLine) => {
    layersRef.current.forEach(l => map.removeLayer(l))
    layersRef.current = []

    mks.forEach((m) => {
      const pinColor = m.color ?? '#7B1C1C'
      const icon = L.divIcon({
        html: makePinSvg(pinColor, m.label),
        iconSize:   [34, 42],
        iconAnchor: [10, 42],   // tip of the pin
        tooltipAnchor: [12, -34],
        className: '',
      })
      const marker = L.marker([m.lat, m.lng], { icon })
        .bindTooltip(m.label, {
          permanent: false,
          direction: 'top',
          offset: [8, 0],
          className: 'campus-tooltip',
        })
        .addTo(map)
      if (m.onClick) marker.on('click', m.onClick)
      layersRef.current.push(marker)
    })

    if (rt?.points?.length) {
      const latlngs = rt.points.map(p => [p.lat, p.lng] as [number, number])
      const polyline = L.polyline(latlngs, {
        color: rt.color ?? '#4fc3f7',
        weight: 5,
        opacity: 0.9,
        dashArray: '10,5',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map)
      map.fitBounds(polyline.getBounds(), { padding: [40, 40] })
      layersRef.current.push(polyline)
    }
  }, [])

  // Init map once
  useEffect(() => {
    if (!mapRef.current || mapReady.current) return

    import('leaflet').then((L) => {
      if (!mapRef.current) return
      LRef.current = L

      const map = L.map(mapRef.current, {
        center, zoom,
        zoomControl: true,
        scrollWheelZoom: true,
        maxZoom: 22,
      })
      mapObjRef.current = map

      // Google Maps hybrid satellite — no POI icons
      const satellite = L.tileLayer(
        'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        { attribution: '© Google Maps', maxZoom: 22, maxNativeZoom: 21, subdomains: ['0','1','2','3'] }
      )
      // Google Maps hybrid (satellite + roads/labels)
      const hybrid = L.tileLayer(
        'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        { attribution: '© Google Maps', maxZoom: 22, maxNativeZoom: 21, subdomains: ['0','1','2','3'] }
      )
      // OSM fallback
      const osm = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { attribution: '© OpenStreetMap', maxZoom: 22, maxNativeZoom: 19 }
      )

      hybrid.addTo(map)

      L.control.layers(
        { 'Satellite + Labels': hybrid, 'Satellite Only': satellite, 'Street Map': osm },
        {},
        { position: 'topright', collapsed: true }
      ).addTo(map)

      mapReady.current = true

      // Draw any pending markers that arrived before map was ready
      if (pendingRef.current) {
        drawLayers(L, map, pendingRef.current.markers, pendingRef.current.route)
        pendingRef.current = null
      }
    })

    return () => {
      if (mapObjRef.current) {
        mapObjRef.current.remove()
        mapObjRef.current = null
        mapReady.current = false
        LRef.current = null
        layersRef.current = []
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Redraw markers whenever they change
  useEffect(() => {
    if (!mapReady.current || !LRef.current || !mapObjRef.current) {
      // Map not ready yet — store for when it is
      pendingRef.current = { markers, route }
      return
    }
    drawLayers(LRef.current, mapObjRef.current, markers, route)
  }, [markers, route, drawLayers])

  // flyTo
  useEffect(() => {
    if (!mapReady.current || !mapObjRef.current || !flyTo) return
    mapObjRef.current.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom ?? 20, { animate: true, duration: 0.8 })
  }, [flyTo])

  return (
    <>
      <style>{`
        .campus-tooltip {
          background: rgba(17,17,17,0.82) !important;
          border: none !important;
          border-radius: 8px !important;
          color: white !important;
          font-family: 'Plus Jakarta Sans', sans-serif !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          padding: 5px 10px !important;
          box-shadow: 0 2px 10px rgba(0,0,0,0.25) !important;
          white-space: nowrap !important;
        }
        .campus-tooltip::before { display:none !important; }
        .leaflet-tooltip-top.campus-tooltip::before { display:none !important; }
      `}</style>
      <div className="map-wrapper" style={{ height }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </>
  )
}
