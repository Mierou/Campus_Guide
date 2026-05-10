'use client'
import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/session'
import { Car, ChevronRight, X } from 'lucide-react'

const CampusMap = dynamic(() => import('@/components/CampusMap'), { ssr: false })

type Lot  = { id: number; lot_name: string; departments: string; hours: string; latitude: number; longitude: number }
type Spot = { id: number; lot_id: number; spot_code: string; row_num: number; col_num: number; status: 'Available' | 'Occupied' | 'Reserved'; reserved_label: string }

export default function ParkingPage() {
  const { user } = useSession()
  const isAdmin = user?.role === 'Admin'
  const [lots, setLots]               = useState<Lot[]>([])
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null)
  const [spots, setSpots]             = useState<Spot[]>([])
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null)
  const [loadingLots, setLoadingLots]   = useState(true)
  const [loadingSpots, setLoadingSpots] = useState(false)
  const [lotCounts, setLotCounts]       = useState<Record<number, { avail: number; total: number }>>({})
  const [showSpotSheet, setShowSpotSheet] = useState(false)

  useEffect(() => {
    supabase.from('parking_lots').select('*').order('lot_name').then(async ({ data }) => {
      const ls = data ?? []; setLots(ls); setLoadingLots(false)
      const counts: Record<number, { avail: number; total: number }> = {}
      await Promise.all(ls.map(async (lot: Lot) => {
        const { data: sp } = await supabase.from('parking_spots').select('status').eq('lot_id', lot.id)
        counts[lot.id] = { avail: (sp ?? []).filter((s: any) => s.status === 'Available').length, total: sp?.length ?? 0 }
      }))
      setLotCounts(counts)
    })
  }, [])

  const selectLot = async (lot: Lot) => {
    setSelectedLot(lot); setSelectedSpot(null); setLoadingSpots(true); setShowSpotSheet(false)
    const { data } = await supabase.from('parking_spots').select('*').eq('lot_id', lot.id).order('row_num').order('col_num')
    setSpots(data ?? []); setLoadingSpots(false)
  }

  const updateSpot = async (spot: Spot, status: Spot['status'], label = '') => {
    await supabase.from('parking_spots').update({ status, reserved_label: label }).eq('id', spot.id)
    setSpots(p => p.map(s => s.id === spot.id ? { ...s, status, reserved_label: label } : s))
    setSelectedSpot(prev => prev?.id === spot.id ? { ...prev, status, reserved_label: label } : prev)
    setLotCounts(prev => {
      const curr = prev[spot.lot_id] ?? { avail: 0, total: 0 }
      return { ...prev, [spot.lot_id]: { ...curr, avail: curr.avail + (status === 'Available' ? 1 : 0) - (spot.status === 'Available' ? 1 : 0) } }
    })
  }

  const stats = useMemo(() => ({
    avail: spots.filter(s => s.status === 'Available').length,
    occ:   spots.filter(s => s.status === 'Occupied').length,
    res:   spots.filter(s => s.status === 'Reserved').length,
    total: spots.length,
  }), [spots])

  const rows = useMemo(() => {
    const map: Record<number, Spot[]> = {}
    spots.forEach(s => { if (!map[s.row_num]) map[s.row_num] = []; map[s.row_num].push(s) })
    return Object.entries(map).map(([r, ss]) => ({ row: Number(r), spots: ss.sort((a,b) => a.col_num - b.col_num) }))
  }, [spots])

  const pct = stats.total ? Math.round(stats.occ / stats.total * 100) : 0

  const markers = lots.map(lot => ({
    lat: lot.latitude, lng: lot.longitude, label: lot.lot_name,
    color: selectedLot?.id === lot.id ? '#D4A017' : '#1a7a40',
    onClick: () => selectLot(lot),
  }))

  const SpotActions = ({ spot }: { spot: Spot }) => (
    <div>
      <div style={{ marginBottom: 14, padding: 14, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 3 }}>{spot.spot_code}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{selectedLot?.lot_name}</div>
        <div style={{ marginTop: 8 }}>
          <span className={spot.status === 'Available' ? 'badge-open' : spot.status === 'Reserved' ? 'badge-amber' : 'badge-closed'} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99 }}>{spot.status}</span>
        </div>
        {spot.reserved_label && <div style={{ fontSize: 11.5, color: 'var(--amber)', marginTop: 5 }}>For: {spot.reserved_label}</div>}
      </div>
      {isAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <button onClick={async () => { if (spot.status !== 'Available') return; const v = prompt('Vehicle type:') ?? ''; if (v) { await updateSpot(spot, 'Occupied'); if (user) await supabase.from('reservation_history').insert({ spot_id: spot.id, user_id: user.id, vehicle_type: v, time_start: new Date().getHours() + ':00', reservation_date: new Date().toISOString().split('T')[0], status: 'Occupied' }) } }}
            disabled={spot.status !== 'Available'} style={{ padding: '9px 0', borderRadius: 9, border: '1.5px solid #f0b3ab', background: 'var(--red-pale)', color: 'var(--red)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: spot.status !== 'Available' ? 0.4 : 1 }}>
            Mark Occupied
          </button>
          <button onClick={() => updateSpot(spot, 'Available')} disabled={spot.status === 'Available'}
            style={{ padding: '9px 0', borderRadius: 9, border: '1.5px solid #a8d5b8', background: 'var(--green-pale)', color: 'var(--green)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: spot.status === 'Available' ? 0.4 : 1 }}>
            Mark Available
          </button>
          <button onClick={async () => { if (spot.status === 'Reserved') return; const l = prompt('Reserve for:') ?? ''; if (l) updateSpot(spot, 'Reserved', l) }}
            disabled={spot.status === 'Reserved'} style={{ padding: '9px 0', borderRadius: 9, border: '1.5px solid #f0d090', background: 'var(--amber-pale)', color: 'var(--amber)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: spot.status === 'Reserved' ? 0.4 : 1 }}>
            Mark Reserved
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <BottomNav />
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'var(--cream)' }}>

        {/* Lot list */}
        <div className="left-panel" style={{ width: 250, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid var(--border)' }}>
            <h1 style={{ fontSize: 17, fontWeight: 700 }}>Parking</h1>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>Select a lot</p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingLots && <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13.5 }}>Loading…</div>}
            {lots.map(lot => {
              const counts = lotCounts[lot.id]
              const active = selectedLot?.id === lot.id
              return (
                <button key={lot.id} onClick={() => selectLot(lot)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border)', background: active ? 'var(--maroon-pale)' : 'transparent', transition: 'background 0.15s' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: active ? 'var(--maroon)' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Car size={16} color={active ? 'white' : 'var(--muted)'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lot.lot_name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{counts ? `${counts.avail}/${counts.total} open` : '…'}</div>
                  </div>
                  <ChevronRight size={13} color="var(--muted2)" />
                </button>
              )
            })}
          </div>
          {/* Legend - desktop */}
          <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }} id="lot-legend">
            <style>{`@media(max-width:768px){#lot-legend{display:none!important}}`}</style>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Legend</div>
            {[['spot-available','Available'],['spot-occupied','Occupied'],['spot-reserved','Reserved']].map(([cls, lbl]) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <div className={cls} style={{ width: 26, height: 20, borderRadius: 5, fontSize: 8.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>A1</div>
                <span style={{ fontSize: 12 }}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Center: map + grid */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Map - smaller on mobile */}
          <div style={{ padding: '12px 12px 0', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            <CampusMap markers={markers} height="160px" />
          </div>

          {/* Stats bar */}
          {selectedLot && (
            <div className="parking-stats" style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface)', overflowX: 'auto' }}>
              {[
                { label: 'Available', val: stats.avail, color: 'var(--green)', bg: 'var(--green-pale)' },
                { label: 'Occupied',  val: stats.occ,   color: 'var(--red)',   bg: 'var(--red-pale)' },
                { label: 'Reserved',  val: stats.res,   color: 'var(--amber)', bg: 'var(--amber-pale)' },
                { label: 'Total',     val: stats.total, color: 'var(--dark)',  bg: 'var(--surface2)' },
              ].map((s, i) => (
                <div key={s.label} style={{ flex: '1 0 70px', padding: '8px 12px', borderRight: i < 3 ? '1px solid var(--border)' : 'none', background: s.bg }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 10.5, color: s.color, fontWeight: 600, opacity: 0.75 }}>{s.label}</div>
                </div>
              ))}
              <div style={{ flex: '1 0 80px', padding: '8px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ height: 6, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? 'var(--red)' : pct > 50 ? 'var(--amber)' : 'var(--green)', borderRadius: 99 }} />
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 3 }}>{pct}%</div>
              </div>
            </div>
          )}

          {/* Spot grid */}
          {selectedLot ? (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {loadingSpots ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13.5, paddingTop: 30 }}>Loading spots…</div>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{selectedLot.lot_name} — Tap a spot</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {rows.map(({ row, spots: rowSpots }, ri) => (
                      <div key={row}>
                        {ri === Math.floor(rows.length / 2) && (
                          <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--muted)', padding: '4px 0', margin: '3px 0', background: 'var(--surface2)', borderRadius: 6 }}>── DRIVE AISLE ──</div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 16, fontSize: 10, fontWeight: 700, color: 'var(--muted2)', textAlign: 'center', flexShrink: 0 }}>{String.fromCharCode(65 + row)}</span>
                          {rowSpots.map(spot => (
                            <button key={spot.id} onClick={() => { setSelectedSpot(s => s?.id === spot.id ? null : spot); setShowSpotSheet(true) }}
                              className={`spot-btn ${spot.status === 'Available' ? 'spot-available' : spot.status === 'Occupied' ? 'spot-occupied' : 'spot-reserved'} ${selectedSpot?.id === spot.id ? 'spot-selected' : ''}`}
                              style={{ width: 42, height: 34, borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}>
                              {spot.spot_code.replace(/[A-Za-z]/g, '')}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
              <Car size={28} color="var(--muted2)" style={{ marginBottom: 10 }} />
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>Select a parking lot</div>
              <div style={{ fontSize: 12.5 }}>Tap a lot from the list</div>
            </div>
          )}
        </div>

        {/* Desktop right panel */}
        <div className="spot-actions-panel" style={{ width: 230, background: 'var(--surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '16px 14px 10px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{isAdmin ? 'Spot Actions' : 'Spot Details'}</div>
          </div>
          {selectedSpot ? (
            <div className="fade-up" style={{ flex: 1, padding: 14, overflowY: 'auto' }}>
              <SpotActions spot={selectedSpot} />
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, textAlign: 'center' }}>
              <Car size={18} color="var(--muted2)" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Select a spot</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>Click a spot in the grid</div>
            </div>
          )}
        </div>

        {/* Mobile bottom sheet for spot */}
        {selectedSpot && showSpotSheet && (
          <div style={{ display: 'none', position: 'fixed', bottom: 60, left: 0, right: 0, background: 'white', borderRadius: '18px 18px 0 0', border: '1px solid var(--border)', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)', padding: '16px', zIndex: 9997, maxHeight: '55vh', overflowY: 'auto' }} id="spot-sheet">
            <style>{`@media(max-width:768px){#spot-sheet{display:block!important}}`}</style>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spot Details</div>
              <button onClick={() => setShowSpotSheet(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}><X size={16} /></button>
            </div>
            <SpotActions spot={selectedSpot} />
          </div>
        )}
      </main>
    </div>
  )
}
