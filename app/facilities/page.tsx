'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'
import { supabase } from '@/lib/supabase'
import { Search, Clock, Navigation, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter } from 'next/navigation'

const CampusMap = dynamic(() => import('@/components/CampusMap'), { ssr: false })
type Facility = { id: number; name: string; emoji: string; category: string; services: string[]; hours: string; latitude: number; longitude: number; is_open: boolean }
const FILTERS = ['All', 'Food', 'Sports', 'Academic', 'Leisure']

export default function FacilitiesPage() {
  const router = useRouter()
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Facility | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMap, setShowMap] = useState(false)

  useEffect(() => {
    supabase.from('facilities').select('*').order('name')
      .then(({ data }) => { setFacilities(data ?? []); setLoading(false) })
  }, [])

  const filtered = facilities.filter(f =>
    (filter === 'All' || f.category === filter) &&
    f.name.toLowerCase().includes(search.toLowerCase())
  )

  const markers = filtered.map(f => ({
    lat: f.latitude, lng: f.longitude, label: f.name,
    color: selected?.id === f.id ? '#D4A017' : (f.is_open ? '#1a7a40' : '#c0392b'),
    onClick: () => setSelected(f),
  }))

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <BottomNav />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--cream)' }}>
        <div className="page-header" style={{ gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <h1 style={{ fontSize: 17, fontWeight: 700 }}>Facilities</h1>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 1 }}>{filtered.length} available</p>
          </div>
          <div style={{ position: 'relative', flex: 1, minWidth: 140 }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted2)' }} />
            <input className="inp" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ paddingLeft: 32, width: '100%', padding: '8px 14px 8px 32px' }} />
          </div>
          <button onClick={() => setShowMap(v => !v)} className="btn-ghost" style={{ fontSize: 12.5, padding: '7px 12px' }}>
            {showMap ? <><ChevronUp size={13} /> Hide Map</> : <><ChevronDown size={13} /> Show Map</>}
          </button>
        </div>

        {showMap && (
          <div style={{ padding: '0 12px 12px' }}>
            <CampusMap markers={markers} height="220px" />
          </div>
        )}

        <div className="desktop-two-col" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div className="left-panel" style={{ width: 288, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div className="pill-row" style={{ display: 'flex', gap: 6, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
              {FILTERS.map(f => <button key={f} className={`pill ${filter===f?'active':''}`} onClick={() => setFilter(f)}>{f}</button>)}
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading && <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13.5 }}>Loading…</div>}
              {filtered.map(f => {
                const active = selected?.id === f.id
                return (
                  <button key={f.id} onClick={() => setSelected(f)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border)', background: active ? 'var(--maroon-pale)' : 'transparent', transition: 'background 0.15s' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{f.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{f.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{f.category} · {f.hours}</div>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: f.is_open ? 'var(--green)' : 'var(--red)', flexShrink: 0 }} />
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className="hidden-mobile">
            <div style={{ flex: 1, padding: 16 }}><CampusMap markers={markers} height="100%" /></div>
            {selected && (
              <div className="detail-strip fade-in" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 34, lineHeight: 1, flexShrink: 0 }}>{selected.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{selected.name}</span>
                    <span className={selected.is_open ? 'badge-open' : 'badge-closed'} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 99 }}>{selected.is_open ? 'Open' : 'Closed'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--muted)', fontSize: 12, marginBottom: 6 }}><Clock size={11} />{selected.hours}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(selected.services ?? []).map(s => <span key={s} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'var(--maroon-pale)', color: 'var(--maroon)', fontWeight: 600 }}>{s}</span>)}
                  </div>
                </div>
                <button className="btn-primary" onClick={() => router.push(`/routes?to=${encodeURIComponent(selected.name)}`)} style={{ flexShrink: 0, fontSize: 12.5 }}><Navigation size={13} /> Directions</button>
              </div>
            )}
          </div>
        </div>

        {selected && (
          <div className="fade-in" style={{ display: 'none', position: 'fixed', bottom: 68, left: 12, right: 12, background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', boxShadow: '0 -4px 24px rgba(0,0,0,0.1)', padding: '14px 16px', zIndex: 9990 }} id="fac-mobile-detail">
            <style>{`@media(max-width:768px){#fac-mobile-detail{display:block!important}}`}</style>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 28 }}>{selected.emoji}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{selected.hours}</div>
                </div>
              </div>
              <span className={selected.is_open ? 'badge-open' : 'badge-closed'} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 99 }}>{selected.is_open ? 'Open' : 'Closed'}</span>
            </div>
            <button className="btn-primary" onClick={() => router.push(`/routes?to=${encodeURIComponent(selected.name)}`)} style={{ width: '100%', justifyContent: 'center', fontSize: 13, padding: '9px 0', marginTop: 8 }}>
              <Navigation size={13} /> Get Directions
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
