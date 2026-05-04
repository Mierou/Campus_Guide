'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/Sidebar'
import { BUILDINGS } from '@/lib/data'
import { Search, Clock, Navigation } from 'lucide-react'
import { useRouter } from 'next/navigation'

const CampusMap = dynamic(() => import('@/components/CampusMap'), { ssr: false })

const FILTERS = ['All', 'Engineering', 'Health', 'Education']
const ABBR_COLORS: Record<string, string> = {
  RTL:'#1a5fa0', GLE:'#a01a1a', ACAD:'#1a7a2a', SAL:'#8a6010',
  NGE:'#6a1a9a', ALY:'#107a50', ELEM:'#a01a6a', GLEC:'#1a30a0',
}

export default function BuildingsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<typeof BUILDINGS[0] | null>(null)

  const filtered = BUILDINGS.filter(b =>
    (filter === 'All' || b.filter_category === filter) &&
    b.name.toLowerCase().includes(search.toLowerCase())
  )

  const markers = filtered.map(b => ({
    lat: b.latitude, lng: b.longitude, label: b.name,
    color: selected?.id === b.id ? '#D4A017' : (b.is_open ? '#1a7a40' : '#c0392b'),
    onClick: () => setSelected(b),
  }))

  const col = (abbr: string) => ABBR_COLORS[abbr] ?? 'var(--maroon)'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--cream)' }}>
        {/* Header */}
        <div className="page-header">
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 17, fontWeight: 700 }}>Buildings</h1>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 1 }}>{filtered.length} locations</p>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted2)' }} />
            <input className="inp" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search buildings…" style={{ paddingLeft: 32, width: 200, padding: '8px 14px 8px 32px' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* List */}
          <div style={{ width: 288, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 6, padding: '12px 14px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
              {FILTERS.map(f => (
                <button key={f} className={`pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filtered.map(b => {
                const active = selected?.id === b.id
                return (
                  <button key={b.id} onClick={() => setSelected(b)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                    borderBottom: '1px solid var(--border)',
                    background: active ? 'var(--maroon-pale)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--surface2)' }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <div style={{ width: 40, height: 38, borderRadius: 10, background: col(b.abbreviation) + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 800, color: col(b.abbreviation), flexShrink: 0, letterSpacing: '0.01em' }}>
                      {b.abbreviation}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.departments.join(' · ')}</div>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.is_open ? 'var(--green)' : 'var(--red)', flexShrink: 0 }} />
                  </button>
                )
              })}
              {!filtered.length && <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13.5 }}>No buildings found</div>}
            </div>
          </div>

          {/* Right: map + detail */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, padding: 16 }}>
              <CampusMap markers={markers} height="100%" />
            </div>

            {/* Detail */}
            {selected && (
              <div className="fade-in" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ width: 48, height: 44, borderRadius: 12, background: col(selected.abbreviation) + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: col(selected.abbreviation), flexShrink: 0 }}>
                  {selected.abbreviation}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{selected.name}</span>
                    <span className={selected.is_open ? 'badge-open' : 'badge-closed'} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 99 }}>
                      {selected.is_open ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--muted)', fontSize: 12.5, marginBottom: 7 }}>
                    <Clock size={12} /> {selected.hours}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {selected.departments.map(d => (
                      <span key={d} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 99, background: 'var(--maroon-pale)', color: 'var(--maroon)', fontWeight: 600 }}>{d}</span>
                    ))}
                  </div>
                </div>
                <button className="btn-primary" onClick={() => router.push(`/routes?to=${encodeURIComponent(selected.name)}`)} style={{ flexShrink: 0 }}>
                  <Navigation size={13} /> Directions
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
