'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'
import { supabase } from '@/lib/supabase'
import { Search, Clock, Navigation, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter } from 'next/navigation'

const CampusMap = dynamic(() => import('@/components/CampusMap'), { ssr: false })

type Building = { id: number; name: string; abbreviation: string; departments: string[]; hours: string; latitude: number; longitude: number; filter_category: string; is_open: boolean }

const FILTERS = ['All', 'Engineering', 'Health', 'Education']
const ABBR_COLORS: Record<string, string> = { RTL:'#1a5fa0', GLE:'#a01a1a', ACAD:'#1a7a2a', SAL:'#8a6010', NGE:'#6a1a9a', ALY:'#107a50', ELEM:'#a01a6a', GLEC:'#1a30a0' }

export default function BuildingsPage() {
  const router = useRouter()
  const [buildings, setBuildings] = useState<Building[]>([])
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Building | null>(null)
  const [loading, setLoading] = useState(true)
  const [flyTo, setFlyTo] = useState<{lat:number;lng:number;zoom?:number}|null>(null)
  const [showMap, setShowMap] = useState(false)

  useEffect(() => {
    supabase.from('buildings').select('*').order('name')
      .then(({ data }) => { setBuildings(data ?? []); setLoading(false) })
  }, [])

  const filtered = buildings.filter(b =>
    (filter === 'All' || b.filter_category === filter) &&
    b.name.toLowerCase().includes(search.toLowerCase())
  )

  const markers = filtered.map(b => ({
    lat: b.latitude, lng: b.longitude, label: b.name,
    color: selected?.id === b.id ? '#D4A017' : (b.is_open ? '#1a7a40' : '#c0392b'),
    onClick: () => { setSelected(b); setFlyTo({ lat: b.latitude, lng: b.longitude, zoom: 20 }) },
  }))

  const col = (abbr: string) => ABBR_COLORS[abbr] ?? 'var(--maroon)'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <BottomNav />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--cream)' }}>
        <div className="page-header" style={{ gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <h1 style={{ fontSize: 17, fontWeight: 700 }}>Buildings</h1>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 1 }}>{filtered.length} locations</p>
          </div>
          <div style={{ position: 'relative' }} className="search-inp">
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted2)' }} />
            <input className="inp" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ paddingLeft: 32, width: '100%', padding: '8px 14px 8px 32px' }} />
          </div>
          {/* Mobile map toggle */}
          <button onClick={() => setShowMap(v => !v)} className="btn-ghost" style={{ fontSize: 12.5, padding: '7px 12px' }}>
            {showMap ? <><ChevronUp size={13} /> Hide Map</> : <><ChevronDown size={13} /> Show Map</>}
          </button>
        </div>

        {/* Mobile map toggle area */}
        {showMap && (
          <div style={{ padding: '0 12px 12px' }}>
            <CampusMap markers={markers} height="220px" flyTo={flyTo} />
          </div>
        )}

        <div className="desktop-two-col" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* List */}
          <div className="left-panel" style={{ width: 288, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div className="pill-row" style={{ display: 'flex', gap: 6, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
              {FILTERS.map(f => <button key={f} className={`pill ${filter===f?'active':''}`} onClick={() => setFilter(f)}>{f}</button>)}
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading && <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13.5 }}>Loading…</div>}
              {filtered.map(b => {
                const active = selected?.id === b.id
                return (
                  <button key={b.id} onClick={() => { setSelected(b); setFlyTo({ lat: b.latitude, lng: b.longitude, zoom: 20 }) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border)', background: active ? 'var(--maroon-pale)' : 'transparent', transition: 'background 0.15s' }}>
                    <div style={{ width: 40, height: 38, borderRadius: 10, background: col(b.abbreviation) + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 800, color: col(b.abbreviation), flexShrink: 0 }}>{b.abbreviation}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(b.departments ?? []).join(' · ')}</div>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.is_open ? 'var(--green)' : 'var(--red)', flexShrink: 0 }} />
                  </button>
                )
              })}
              {!loading && !filtered.length && <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13.5 }}>No buildings found</div>}
            </div>
          </div>

          {/* Map + detail - desktop only */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className="hidden-mobile">
            <div style={{ flex: 1, padding: 16 }}><CampusMap markers={markers} height="100%" flyTo={flyTo} /></div>
            {selected && (
              <div className="detail-strip fade-in" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 44, height: 40, borderRadius: 10, background: col(selected.abbreviation) + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: col(selected.abbreviation), flexShrink: 0 }}>{selected.abbreviation}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{selected.name}</span>
                    <span className={selected.is_open ? 'badge-open' : 'badge-closed'} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 99 }}>{selected.is_open ? 'Open' : 'Closed'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--muted)', fontSize: 12, marginBottom: 6 }}><Clock size={11} />{selected.hours}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(selected.departments ?? []).map(d => <span key={d} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'var(--maroon-pale)', color: 'var(--maroon)', fontWeight: 600 }}>{d}</span>)}
                  </div>
                </div>
                <button className="btn-primary" onClick={() => router.push(`/routes?to=${encodeURIComponent(selected.name)}`)} style={{ flexShrink: 0, fontSize: 12.5 }}><Navigation size={13} /> Directions</button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile detail card */}
        {selected && (
          <div className="fade-in" style={{ display: 'none', position: 'fixed', bottom: 68, left: 12, right: 12, background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', boxShadow: '0 -4px 24px rgba(0,0,0,0.1)', padding: '14px 16px', zIndex: 9990 }} id="mobile-detail">
            <style>{`@media(max-width:768px){#mobile-detail{display:block!important}}`}</style>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}><Clock size={11} style={{ display: 'inline', marginRight: 4 }} />{selected.hours}</div>
              </div>
              <span className={selected.is_open ? 'badge-open' : 'badge-closed'} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 99 }}>{selected.is_open ? 'Open' : 'Closed'}</span>
            </div>
            <button className="btn-primary" onClick={() => router.push(`/routes?to=${encodeURIComponent(selected.name)}`)} style={{ width: '100%', justifyContent: 'center', fontSize: 13, padding: '9px 0' }}>
              <Navigation size={13} /> Get Directions
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
