'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/session'
import { useRouter } from 'next/navigation'
import { Car, LogOut, RefreshCw, CheckCircle, XCircle, Clock, ChevronDown } from 'lucide-react'

type Spot = {
  id: number
  lot_id: number
  spot_code: string
  row_num: number
  col_num: number
  status: 'Available' | 'Occupied' | 'Reserved'
  reserved_label: string
}

type Lot = { id: number; lot_name: string; hours: string }

type Props = { layout: 'desktop' | 'mobile' }

export default function GuardView({ layout }: Props) {
  const { user, logout } = useSession()
  const router = useRouter()

  const [assignedLots, setAssignedLots] = useState<Lot[]>([])
  const [activeLot, setActiveLot]       = useState<Lot | null>(null)
  const [spots, setSpots]               = useState<Spot[]>([])
  const [loading, setLoading]           = useState(true)
  const [loadingSpots, setLoadingSpots] = useState(false)
  const [refreshing, setRefreshing]     = useState(false)
  const [time, setTime]                 = useState('')
  const [toggling, setToggling]         = useState<number | null>(null)
  const [showLotPicker, setShowLotPicker] = useState(false)

  // Redirect non-guards
  useEffect(() => {
    if (user && user.role !== 'Guard') router.push('/home')
    if (!user) router.push('/')
  }, [user, router])

  // Clock
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Load assigned lots
  useEffect(() => {
    if (!user) return
    async function loadLots() {
      const { data: assignments } = await supabase
        .from('guard_lot_assignments')
        .select('lot_id, parking_lots(id, lot_name, hours)')
        .eq('guard_id', user!.id)

      const lots: Lot[] = (assignments ?? [])
        .map((a: any) => a.parking_lots)
        .filter(Boolean)
        .sort((a: Lot, b: Lot) => a.lot_name.localeCompare(b.lot_name))

      setAssignedLots(lots)
      if (lots.length > 0) setActiveLot(lots[0])
      else setLoading(false)
    }
    loadLots()
  }, [user])

  // Load spots when activeLot changes
  useEffect(() => {
    if (!activeLot) return
    loadSpots()
  }, [activeLot])

  const loadSpots = async (showRefresh = false) => {
    if (!activeLot) return
    if (showRefresh) setRefreshing(true)
    else setLoadingSpots(true)

    const { data } = await supabase
      .from('parking_spots').select('*')
      .eq('lot_id', activeLot.id)
      .order('row_num').order('col_num')

    setSpots(data ?? [])
    setLoading(false)
    setLoadingSpots(false)
    if (showRefresh) setRefreshing(false)
  }

  // One-tap toggle Available ↔ Occupied
  const toggleSpot = async (spot: Spot) => {
    if (spot.status === 'Reserved') return
    setToggling(spot.id)
    const newStatus = spot.status === 'Available' ? 'Occupied' : 'Available'

    await supabase.from('parking_spots')
      .update({ status: newStatus, reserved_label: '' })
      .eq('id', spot.id)

    if (newStatus === 'Occupied' && user) {
      await supabase.from('reservation_history').insert({
        spot_id: spot.id,
        user_id: user.id,
        vehicle_type: 'Car',
        time_start: new Date().getHours() + ':00',
        reservation_date: new Date().toISOString().split('T')[0],
        status: 'Occupied',
      })
    }

    setSpots(prev => prev.map(s =>
      s.id === spot.id ? { ...s, status: newStatus, reserved_label: '' } : s
    ))
    setToggling(null)
  }

  const rows = useMemo(() => {
    const map: Record<number, Spot[]> = {}
    spots.forEach(s => {
      if (!map[s.row_num]) map[s.row_num] = []
      map[s.row_num].push(s)
    })
    return Object.entries(map).map(([r, ss]) => ({
      row: Number(r),
      spots: ss.sort((a, b) => a.col_num - b.col_num),
    }))
  }, [spots])

  const stats = useMemo(() => ({
    avail: spots.filter(s => s.status === 'Available').length,
    occ:   spots.filter(s => s.status === 'Occupied').length,
    res:   spots.filter(s => s.status === 'Reserved').length,
    total: spots.length,
  }), [spots])

  const pct = stats.total ? Math.round(stats.occ / stats.total * 100) : 0
  const isMobile = layout === 'mobile'
  const spotSize = isMobile ? 72 : 86

  if (!user || user.role !== 'Guard') return null

  return (
    <div style={{ minHeight: '100vh', background: '#1a0a0a', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'var(--maroon-dark)', padding: isMobile ? '12px 16px' : '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Car size={18} color="white" />
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: isMobile ? 14 : 16 }}>Parking Guard</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11.5 }}>{user.full_name}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={12} />{time}
          </div>
          <button onClick={() => loadSpots(true)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontFamily: 'inherit' }}>
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {!isMobile && 'Refresh'}
          </button>
          <button onClick={() => { logout(); router.push('/') }} style={{ background: 'rgba(255,60,60,0.15)', border: '1px solid rgba(255,60,60,0.25)', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: '#ff9090', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontFamily: 'inherit' }}>
            <LogOut size={13} />
            {!isMobile && 'Sign Out'}
          </button>
        </div>
      </div>

      {/* Lot switcher */}
      {assignedLots.length > 0 && (
        <div style={{ background: 'rgba(0,0,0,0.35)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: isMobile ? '10px 16px' : '10px 28px' }}>
          {assignedLots.length === 1 ? (
            // Single lot — just show the name
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Car size={14} color="rgba(255,255,255,0.5)" />
              <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{activeLot?.lot_name}</span>
              {activeLot?.hours && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>· {activeLot.hours}</span>}
            </div>
          ) : (
            // Multiple lots — show tab switcher
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {assignedLots.map(lot => {
                const active = activeLot?.id === lot.id
                return (
                  <button key={lot.id} onClick={() => { setActiveLot(lot); setShowLotPicker(false) }} style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 14px', borderRadius: 99, border: 'none',
                    background: active ? 'white' : 'rgba(255,255,255,0.08)',
                    color: active ? 'var(--maroon-dark)' : 'rgba(255,255,255,0.6)',
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}>
                    <Car size={13} />
                    {lot.lot_name}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Stats bar */}
      <div style={{ display: 'flex', background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { label: 'Available', val: stats.avail, color: '#4ade80', bg: 'rgba(74,222,128,0.08)' },
          { label: 'Occupied',  val: stats.occ,   color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
          { label: 'Reserved',  val: stats.res,   color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' },
          { label: 'Total',     val: stats.total, color: 'rgba(255,255,255,0.6)', bg: 'transparent' },
        ].map((s, i) => (
          <div key={s.label} style={{ flex: 1, padding: isMobile ? '10px 6px' : '12px 16px', textAlign: 'center', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none', background: s.bg }}>
            <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: isMobile ? 9.5 : 11.5, color: 'rgba(255,255,255,0.35)', marginTop: 3, fontWeight: 600, letterSpacing: '0.04em' }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
        <div style={{ flex: 1.5, padding: isMobile ? '10px 10px' : '12px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.06em' }}>OCCUPANCY</span>
            <span style={{ fontSize: 13, color: 'white', fontWeight: 700 }}>{pct}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, transition: 'width 0.5s', background: pct > 80 ? '#f87171' : pct > 50 ? '#fbbf24' : '#4ade80' }} />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: isMobile ? '7px 14px' : '8px 28px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          { color: '#4ade80', label: 'Available — tap to mark Occupied' },
          { color: '#f87171', label: 'Occupied — tap to mark Available' },
          { color: '#fbbf24', label: 'Reserved — cannot be changed' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.4)', fontSize: isMobile ? 11 : 12 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {label}
          </div>
        ))}
      </div>

      {/* Spot grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 14px 80px' : '24px 28px' }}>
        {loading || loadingSpots ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, gap: 14 }}>
            <RefreshCw size={28} color="rgba(255,255,255,0.15)" style={{ animation: 'spin 1.2s linear infinite' }} />
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Loading spots…</div>
          </div>
        ) : assignedLots.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, gap: 12, textAlign: 'center' }}>
            <Car size={40} color="rgba(255,255,255,0.1)" />
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: 600 }}>No lots assigned</div>
            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>Ask an admin to assign you to a parking lot.</div>
          </div>
        ) : spots.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, gap: 12 }}>
            <Car size={36} color="rgba(255,255,255,0.1)" />
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No spots in this lot</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 14 }}>
            {rows.map(({ row, spots: rowSpots }, ri) => (
              <div key={row}>
                {ri === Math.floor(rows.length / 2) && (
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', padding: '6px 0', margin: '4px 0', borderTop: '1px dashed rgba(255,255,255,0.08)', borderBottom: '1px dashed rgba(255,255,255,0.08)' }}>
                    ── DRIVE AISLE ──
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
                  {/* Row label */}
                  <div style={{ width: isMobile ? 20 : 26, height: spotSize, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.25)', fontSize: isMobile ? 14 : 18, fontWeight: 800, flexShrink: 0 }}>
                    {String.fromCharCode(65 + row)}
                  </div>
                  {/* Spots */}
                  <div style={{ display: 'flex', gap: isMobile ? 8 : 12, flexWrap: 'wrap' }}>
                    {rowSpots.map(spot => {
                      const isAvail = spot.status === 'Available'
                      const isOcc   = spot.status === 'Occupied'
                      const isRes   = spot.status === 'Reserved'
                      const isSpin  = toggling === spot.id

                      const borderColor = isAvail ? 'rgba(74,222,128,0.4)' : isOcc ? 'rgba(248,113,113,0.4)' : 'rgba(251,191,36,0.3)'
                      const bgColor     = isAvail ? 'rgba(74,222,128,0.1)'  : isOcc ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.07)'
                      const iconColor   = isAvail ? '#4ade80' : isOcc ? '#f87171' : '#fbbf24'

                      return (
                        <button key={spot.id} onClick={() => !isRes && toggleSpot(spot)} disabled={isRes || isSpin} style={{
                          width: spotSize, height: spotSize, borderRadius: 14,
                          border: `2px solid ${borderColor}`,
                          background: bgColor,
                          cursor: isRes ? 'not-allowed' : 'pointer',
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center', gap: 5,
                          transition: 'all 0.12s',
                          opacity: isSpin ? 0.5 : 1,
                          transform: isSpin ? 'scale(0.93)' : 'scale(1)',
                          flexShrink: 0,
                        }}
                          title={isRes ? `Reserved: ${spot.reserved_label}` : `Tap to mark ${isAvail ? 'Occupied' : 'Available'}`}
                          onMouseEnter={e => { if (!isRes && !isSpin) (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)' }}
                          onMouseLeave={e => { if (!isRes && !isSpin) (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                        >
                          {isSpin
                            ? <RefreshCw size={isMobile ? 18 : 22} color={iconColor} style={{ animation: 'spin 0.6s linear infinite' }} />
                            : isAvail
                              ? <CheckCircle size={isMobile ? 20 : 26} color="#4ade80" />
                              : isOcc
                                ? <XCircle size={isMobile ? 20 : 26} color="#f87171" />
                                : <Car size={isMobile ? 18 : 22} color="#fbbf24" />
                          }
                          <span style={{ fontSize: isMobile ? 12 : 14, fontWeight: 800, color: iconColor, lineHeight: 1 }}>
                            {spot.spot_code}
                          </span>
                          <span style={{ fontSize: isMobile ? 9 : 10, color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: '0.05em', lineHeight: 1 }}>
                            {isRes ? 'RESV' : isAvail ? 'FREE' : 'IN USE'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
