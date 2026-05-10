'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'
import { supabase } from '@/lib/supabase'
import { Clock, Navigation, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

const CampusMap = dynamic(() => import('@/components/CampusMap'), { ssr: false })

type Location = { name: string; lat: number; lng: number; type: string; is_open: boolean; hours: string; tags: string[] }

export default function HomePage() {
  const router = useRouter()
  const [locations, setLocations] = useState<Location[]>([])
  const [selected, setSelected] = useState<Location | null>(null)
  const [time, setTime] = useState('')
  const [loading, setLoading] = useState(true)
  const [flyTo, setFlyTo] = useState<{lat:number;lng:number;zoom?:number}|null>(null)

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

  const markers = locations.map(loc => ({
    lat: loc.lat, lng: loc.lng, label: loc.name,
    color: selected?.name === loc.name ? '#D4A017' : (loc.is_open ? '#1a7a40' : '#c0392b'),
    onClick: () => { setSelected(loc); setFlyTo({ lat: loc.lat, lng: loc.lng, zoom: 20 }) },
  }))

  const openCount  = locations.filter(l => l.is_open).length
  const buildCount = locations.filter(l => l.type === 'Building').length
  const facCount   = locations.filter(l => l.type === 'Facility').length

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <BottomNav />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--cream)', overflow: 'hidden' }}>
        <div className="page-header" style={{ justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700 }}>Campus Map</h1>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 1 }}>Tap a marker to view details</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {!loading && (
              <div style={{ display: 'flex', gap: 12 }}>
                {[{ label: 'Open', val: openCount, color: 'var(--green)' }, { label: 'Buildings', val: buildCount, color: 'var(--maroon)' }, { label: 'Facilities', val: facCount, color: 'var(--maroon)' }].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, background: 'var(--maroon-pale)', color: 'var(--maroon)', fontSize: 12, fontWeight: 600 }}>
              <Clock size={12} />{time}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative', padding: 12, overflow: 'hidden' }}>
          {loading
            ? <div style={{ height: 'calc(100vh - 90px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 14 }}>Loading campus data…</div>
            : <CampusMap markers={markers} height="calc(100vh - 90px)" flyTo={flyTo} />
          }

          {selected && (
            <div className="floating-card fade-up" style={{ position: 'absolute', bottom: 32, left: 32, width: 300, background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(109,26,26,0.14)', overflow: 'hidden', zIndex: 1000 }}>
              <div style={{ height: 4, background: selected.is_open ? 'var(--green)' : 'var(--red)' }} />
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{selected.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{selected.type}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={selected.is_open ? 'badge-open' : 'badge-closed'} style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 99 }}>{selected.is_open ? 'Open' : 'Closed'}</span>
                    <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', padding: 2 }}><X size={14} /></button>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--muted)', fontSize: 12 }}><Clock size={11} />{selected.hours}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                  {selected.tags.map(t => <span key={t} style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 99, background: 'var(--maroon-pale)', color: 'var(--maroon)', fontWeight: 600 }}>{t}</span>)}
                </div>
                <button className="btn-primary" onClick={() => router.push(`/routes?to=${encodeURIComponent(selected.name)}`)} style={{ width: '100%', justifyContent: 'center', fontSize: 12.5, padding: '8px 0' }}>
                  <Navigation size={12} /> Get Directions
                </button>
              </div>
            </div>
          )}

          <div style={{ position: 'absolute', top: 24, right: 24, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', padding: '8px 12px', zIndex: 900, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            {[['var(--green)', 'Open'], ['var(--red)', 'Closed'], ['#D4A017', 'Selected']].map(([color, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, marginBottom: 3 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />{label}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
