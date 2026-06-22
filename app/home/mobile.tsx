'use client'
import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import BottomNav from '@/components/BottomNav'
import { supabase } from '@/lib/supabase'
import { Clock, Navigation, X, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Location } from '@/lib/types'

const CampusMap = dynamic(() => import('@/components/CampusMap'), { ssr: false })

export default function HomeMobile() {
  const router = useRouter()
  const [locations, setLocations] = useState<Location[]>([])
  const [selected, setSelected]   = useState<Location | null>(null)
  const [time, setTime]           = useState('')
  const [loading, setLoading]     = useState(true)
  const [flyTo, setFlyTo]         = useState<{ lat: number; lng: number; zoom?: number } | null>(null)

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }))
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])

  useEffect(() => {
    async function load() {
      const [{ data: buildings }, { data: facilities }] = await Promise.all([
        supabase.from('buildings').select('*'),
        supabase.from('facilities').select('*'),
      ])
      setLocations([
        ...(buildings ?? []).map((b: any) => ({ name: b.name, lat: b.latitude, lng: b.longitude, type: 'Building', is_open: b.is_open, hours: b.hours, tags: b.departments ?? [] })),
        ...(facilities ?? []).map((f: any) => ({ name: f.name, lat: f.latitude, lng: f.longitude, type: 'Facility', is_open: f.is_open, hours: f.hours, tags: f.services ?? [] })),
      ])
      setLoading(false)
    }
    load()
  }, [])

  const markers = useMemo(() => locations.map(loc => ({
    id: loc.name, lat: loc.lat, lng: loc.lng, label: loc.name,
    color: selected?.name === loc.name ? '#D4A017' : (loc.is_open ? '#1a7a40' : '#c0392b'),
  })), [locations, selected?.name])

  const handleMarkerClick = (id: string | number) => {
    const loc = locations.find(l => l.name === id)
    if (loc) { setSelected(loc); setFlyTo({ lat: loc.lat, lng: loc.lng, zoom: 20 }) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--cream)' }}>
      <BottomNav />

      {/* Header */}
      <div style={{ padding: '14px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 700 }}>Campus Map</h1>
          <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>Tap a pin to view details</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, background: 'var(--maroon-pale)', color: 'var(--maroon)', fontSize: 12, fontWeight: 600 }}>
          <Clock size={12} />{time}
        </div>
      </div>

      {/* Full-screen map */}
      <div style={{ flex: 1, position: 'relative', paddingBottom: 60 }}>
        {loading
          ? <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 14, flexDirection: 'column', gap: 12 }}>
              <MapPin size={28} color="var(--muted2)" />
              Loading campus data…
            </div>
          : <CampusMap markers={markers} height="calc(100vh - 120px)" flyTo={flyTo} onMarkerClick={handleMarkerClick} />
        }

        {/* Legend — compact top right */}
        <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.92)', borderRadius: 10, border: '1px solid var(--border)', padding: '7px 11px', zIndex: 900, backdropFilter: 'blur(8px)' }}>
          {[['var(--green)', 'Open'], ['var(--red)', 'Closed'], ['#D4A017', 'Selected']].map(([color, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginBottom: 2 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />{label}
            </div>
          ))}
        </div>
      </div>

      {/* Selected location card — slides up from bottom */}
      {selected && (
        <div style={{ position: 'fixed', bottom: 60, left: 0, right: 0, zIndex: 9990 }} className="fade-up">
          <div style={{ margin: '0 12px', background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--border)', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
            <div style={{ height: 4, background: selected.is_open ? 'var(--green)' : 'var(--red)' }} />
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{selected.type} · {selected.hours}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                  <span className={selected.is_open ? 'badge-open' : 'badge-closed'} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 99 }}>{selected.is_open ? 'Open' : 'Closed'}</span>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', padding: 2 }}><X size={16} /></button>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                {selected.tags.slice(0, 4).map(t => <span key={t} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'var(--maroon-pale)', color: 'var(--maroon)', fontWeight: 600 }}>{t}</span>)}
              </div>
              <button className="btn-primary" onClick={() => router.push(`/routes?to=${encodeURIComponent(selected.name)}`)} style={{ width: '100%', justifyContent: 'center', fontSize: 13.5, padding: '10px 0' }}>
                <Navigation size={14} /> Get Directions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
