'use client'
import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/Sidebar'
import { PARKING_LOTS, generateSpots } from '@/lib/data'
import { useSession } from '@/lib/session'
import { Car, Clock, ChevronRight } from 'lucide-react'

const CampusMap = dynamic(() => import('@/components/CampusMap'), { ssr: false })
type Spot = ReturnType<typeof generateSpots>[0]

export default function ParkingPage() {
  const { user } = useSession()
  const isAdmin = user?.role === 'Admin'
  const [selectedLot, setSelectedLot] = useState<typeof PARKING_LOTS[0] | null>(null)
  const [spots, setSpots] = useState<Spot[]>([])
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null)

  const selectLot = (lot: typeof PARKING_LOTS[0]) => {
    setSelectedLot(lot); setSpots(generateSpots(lot.id, lot.rows, lot.cols)); setSelectedSpot(null)
  }

  const markers = PARKING_LOTS.map(lot => ({
    lat: lot.latitude, lng: lot.longitude, label: lot.lot_name,
    color: selectedLot?.id === lot.id ? '#D4A017' : '#1a7a40',
    onClick: () => selectLot(lot),
  }))

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

  const updateSpot = (id: number, status: Spot['status'], label = '') =>
    setSpots(p => p.map(s => s.id === id ? { ...s, status, reserved_label: label } : s))

  const pct = stats.total ? Math.round(stats.occ / stats.total * 100) : 0

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'var(--cream)' }}>

        {/* Lot list */}
        <div style={{ width: 260, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid var(--border)' }}>
            <h1 style={{ fontSize: 17, fontWeight: 700 }}>Parking</h1>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>Select a lot to view spots</p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {PARKING_LOTS.map(lot => {
              const lotSpots = generateSpots(lot.id, lot.rows, lot.cols)
              const lotAvail = lotSpots.filter(s => s.status === 'Available').length
              const active = selectedLot?.id === lot.id
              return (
                <button key={lot.id} onClick={() => selectLot(lot)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                  borderBottom: '1px solid var(--border)',
                  background: active ? 'var(--maroon-pale)' : 'transparent',
                  transition: 'background 0.15s',
                }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: active ? 'var(--maroon)' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Car size={17} color={active ? 'white' : 'var(--muted)'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--dark)' }}>{lot.lot_name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{lotAvail} / {lot.rows * lot.cols} open</div>
                  </div>
                  <ChevronRight size={14} color="var(--muted2)" />
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Legend</div>
            {[['spot-available','Available'],['spot-occupied','Occupied'],['spot-reserved','Reserved']].map(([cls, lbl]) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div className={cls} style={{ width: 28, height: 22, borderRadius: 6, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>A1</div>
                <span style={{ fontSize: 12.5, color: 'var(--text)' }}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Center: map + grid */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Mini map */}
          <div style={{ padding: 16, borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            <CampusMap markers={markers} height="180px" />
          </div>

          {/* Stats bar */}
          {selectedLot && (
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              {[
                { label: 'Available', val: stats.avail, color: 'var(--green)', bg: 'var(--green-pale)' },
                { label: 'Occupied',  val: stats.occ,   color: 'var(--red)',   bg: 'var(--red-pale)' },
                { label: 'Reserved',  val: stats.res,   color: 'var(--amber)', bg: 'var(--amber-pale)' },
                { label: 'Total',     val: stats.total, color: 'var(--dark)',  bg: 'var(--surface2)' },
              ].map((s, i) => (
                <div key={s.label} style={{ flex: 1, padding: '10px 16px', borderRight: i < 3 ? '1px solid var(--border)' : 'none', background: s.bg }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 11.5, color: s.color, fontWeight: 600, opacity: 0.75 }}>{s.label}</div>
                </div>
              ))}
              <div style={{ flex: 1, padding: '10px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}>Occupancy</div>
                <div style={{ height: 8, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? 'var(--red)' : pct > 50 ? 'var(--amber)' : 'var(--green)', borderRadius: 99, transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{pct}%</div>
              </div>
            </div>
          )}

          {/* Spot grid */}
          {selectedLot ? (
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--dark)' }}>{selectedLot.lot_name} — Click a spot to select it</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rows.map(({ row, spots: rowSpots }, ri) => (
                  <div key={row}>
                    {ri === Math.floor(rows.length / 2) && (
                      <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--muted)', padding: '6px 0', margin: '4px 0', letterSpacing: '0.1em', background: 'var(--surface2)', borderRadius: 8 }}>
                        ── DRIVE AISLE ──
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 18, fontSize: 11, fontWeight: 700, color: 'var(--muted2)', textAlign: 'center', flexShrink: 0 }}>
                        {String.fromCharCode(65 + row)}
                      </span>
                      {rowSpots.map(spot => (
                        <button key={spot.id} onClick={() => setSelectedSpot(s => s?.id === spot.id ? null : spot)}
                          className={`${spot.status === 'Available' ? 'spot-available' : spot.status === 'Occupied' ? 'spot-occupied' : 'spot-reserved'} ${selectedSpot?.id === spot.id ? 'spot-selected' : ''}`}
                          style={{ width: 42, height: 34, borderRadius: 8, fontSize: 10.5, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}
                          title={spot.reserved_label ? `Reserved: ${spot.reserved_label}` : spot.spot_code}>
                          {spot.spot_code.replace(/[A-Za-z]/g, '')}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Car size={26} color="var(--muted2)" />
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>Select a parking lot</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Choose from the list or click a map marker</div>
            </div>
          )}
        </div>

        {/* Right: spot actions */}
        <div style={{ width: 240, background: 'var(--surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isAdmin ? 'Spot Actions' : 'Spot Details'}
            </div>
          </div>

          {selectedSpot ? (
            <div className="fade-up" style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
              {/* Spot header */}
              <div style={{ marginBottom: 16, padding: 14, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark)', marginBottom: 4 }}>{selectedSpot.spot_code}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{selectedLot?.lot_name}</div>
                <div style={{ marginTop: 8 }}>
                  <span className={selectedSpot.status === 'Available' ? 'badge-open' : selectedSpot.status === 'Reserved' ? 'badge-amber' : 'badge-closed'}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99 }}>
                    {selectedSpot.status}
                  </span>
                </div>
                {selectedSpot.reserved_label && (
                  <div style={{ fontSize: 11.5, color: 'var(--amber)', marginTop: 6 }}>For: {selectedSpot.reserved_label}</div>
                )}
              </div>

              {isAdmin && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Admin Controls</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <button onClick={() => {
                      if (selectedSpot.status !== 'Available') return
                      const v = prompt('Vehicle type:') ?? ''; if (v) { updateSpot(selectedSpot.id, 'Occupied'); setSelectedSpot(s => s ? { ...s, status: 'Occupied' } : s) }
                    }} disabled={selectedSpot.status !== 'Available'}
                      style={{ padding: '9px 0', borderRadius: 9, border: '1.5px solid #f0b3ab', background: 'var(--red-pale)', color: 'var(--red)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: selectedSpot.status !== 'Available' ? 0.4 : 1 }}>
                      Mark Occupied
                    </button>
                    <button onClick={() => { updateSpot(selectedSpot.id, 'Available'); setSelectedSpot(s => s ? { ...s, status: 'Available', reserved_label: '' } : s) }}
                      disabled={selectedSpot.status === 'Available'}
                      style={{ padding: '9px 0', borderRadius: 9, border: '1.5px solid #a8d5b8', background: 'var(--green-pale)', color: 'var(--green)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: selectedSpot.status === 'Available' ? 0.4 : 1 }}>
                      Mark Available
                    </button>
                    <button onClick={() => {
                      if (selectedSpot.status === 'Reserved') return
                      const l = prompt('Reserve for:') ?? ''; if (l) { updateSpot(selectedSpot.id, 'Reserved', l); setSelectedSpot(s => s ? { ...s, status: 'Reserved', reserved_label: l } : s) }
                    }} disabled={selectedSpot.status === 'Reserved'}
                      style={{ padding: '9px 0', borderRadius: 9, border: '1.5px solid #f0d090', background: 'var(--amber-pale)', color: 'var(--amber)', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: selectedSpot.status === 'Reserved' ? 0.4 : 1 }}>
                      Mark Reserved
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Car size={18} color="var(--muted2)" />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>No spot selected</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Click a spot in the grid to see details</div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
