'use client'
import { useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/lib/data'
import { Navigation, ArrowLeftRight } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

const CampusMap = dynamic(() => import('@/components/CampusMap'), { ssr: false })

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000, dLat = (b.lat-a.lat)*Math.PI/180, dLng = (b.lng-a.lng)*Math.PI/180
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x))
}

type Loc = { name: string; latitude: number; longitude: number }

function RoutesInner() {
  const params = useSearchParams()
  const [locations, setLocations] = useState<Loc[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo]     = useState('')
  const [route, setRoute] = useState<{ points: { lat: number; lng: number }[] } | undefined>()
  const [info, setInfo] = useState<{ dist: number; sec: number } | null>(null)
  const [noRoute, setNoRoute] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: buildings }, { data: facilities }] = await Promise.all([
        supabase.from('buildings').select('name, latitude, longitude').order('name'),
        supabase.from('facilities').select('name, latitude, longitude').order('name'),
      ])
      const locs: Loc[] = [...(buildings ?? []), ...(facilities ?? [])]
      setLocations(locs)
      const preset = params.get('to')
      setFrom(locs[0]?.name ?? '')
      setTo(preset && locs.find(l => l.name === preset) ? preset : (locs[1]?.name ?? ''))
    }
    load()
  }, [])

  const go = () => {
    const key = `${from}|${to}`
    const pts = ROUTES[key]
    if (pts) {
      setRoute({ points: pts })
      let d = 0; for (let i=1;i<pts.length;i++) d += haversine(pts[i-1],pts[i])
      setInfo({ dist: d, sec: Math.round(d / 1.2) })
      setNoRoute(false)
    } else { setRoute(undefined); setInfo(null); setNoRoute(true) }
  }

  const fromLoc = locations.find(l => l.name === from)
  const toLoc   = locations.find(l => l.name === to)

  const markers = [
    fromLoc && { lat: fromLoc.latitude, lng: fromLoc.longitude, label: `Start: ${from}`, color: '#1a7a40' },
    toLoc   && { lat: toLoc.latitude,   lng: toLoc.longitude,   label: `End: ${to}`,     color: '#c0392b' },
  ].filter(Boolean) as any[]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'var(--cream)' }}>
        <div style={{ width: 300, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--border)' }}>
            <h1 style={{ fontSize: 17, fontWeight: 700 }}>Get Directions</h1>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>Campus walking routes</p>
          </div>

          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, flex: 1, overflowY: 'auto' }}>
            {locations.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13.5, textAlign: 'center', paddingTop: 20 }}>Loading locations…</div>
            ) : (
              <>
                <div style={{ background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                    <select value={from} onChange={e => { setFrom(e.target.value); setRoute(undefined); setInfo(null); setNoRoute(false) }}
                      style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13.5, fontWeight: 500, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {locations.map(l => <option key={l.name}>{l.name}</option>)}
                    </select>
                  </div>
                  <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
                    <select value={to} onChange={e => { setTo(e.target.value); setRoute(undefined); setInfo(null); setNoRoute(false) }}
                      style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13.5, fontWeight: 500, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {locations.map(l => <option key={l.name}>{l.name}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-ghost" onClick={() => { const t = from; setFrom(to); setTo(t); setRoute(undefined); setInfo(null); setNoRoute(false) }} style={{ flex: 1, justifyContent: 'center', fontSize: 12.5 }}>
                    <ArrowLeftRight size={13} /> Swap
                  </button>
                  <button className="btn-primary" onClick={go} style={{ flex: 2, justifyContent: 'center', fontSize: 13.5 }}>
                    <Navigation size={14} /> Go
                  </button>
                </div>

                {info && (
                  <div className="fade-up" style={{ background: 'var(--maroon-pale)', borderRadius: 12, border: '1px solid var(--maroon-pale2)', overflow: 'hidden' }}>
                    <div style={{ background: 'var(--maroon)', padding: '10px 14px' }}>
                      <div style={{ color: 'white', fontSize: 12.5, fontWeight: 600 }}>{from}</div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: '2px 0' }}>↓ Walking route</div>
                      <div style={{ color: 'white', fontSize: 12.5, fontWeight: 600 }}>{to}</div>
                    </div>
                    <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ textAlign: 'center', padding: '10px 0', borderRadius: 10, background: 'white' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--maroon)' }}>{Math.round(info.dist)}m</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Distance</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '10px 0', borderRadius: 10, background: 'white' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--maroon)' }}>{info.sec < 60 ? `${info.sec}s` : `${Math.round(info.sec/60)}min`}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Walk time</div>
                      </div>
                    </div>
                    <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[`Start at ${from}`, 'Follow the campus walkway', `Head toward ${to}`, `Arrive at ${to}`].map((step, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13 }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--maroon)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i+1}</div>
                          <span style={{ paddingTop: 3 }}>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {noRoute && (
                  <div style={{ background: 'var(--amber-pale)', borderRadius: 12, border: '1px solid #f0d090', padding: 14, fontSize: 13, color: 'var(--amber)' }}>
                    <strong>No route available</strong> for {from} → {to}. More paths coming soon.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div style={{ flex: 1, padding: 16 }}>
          <CampusMap markers={markers} route={route} height="calc(100vh - 32px)" />
        </div>
      </main>
    </div>
  )
}

export default function RoutesPage() {
  return <Suspense><RoutesInner /></Suspense>
}
