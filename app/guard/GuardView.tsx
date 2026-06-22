'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/session'
import { useRouter } from 'next/navigation'
import { Car, LogOut, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react'

type Spot = {
  id: number
  lot_id: number
  spot_code: string
  row_num: number
  col_num: number
  status: 'Available' | 'Occupied' | 'Reserved'
  reserved_label: string
}

type Lot = {
  id: number
  lot_name: string
  departments: string
  hours: string
}

type Props = {
  layout: 'desktop' | 'mobile'
}

export default function GuardView({ layout }: Props) {
  const { user, logout } = useSession()
  const router = useRouter()

  const [lot, setLot]           = useState<Lot | null>(null)
  const [spots, setSpots]       = useState<Spot[]>([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [time, setTime]         = useState('')
  const [toggling, setToggling] = useState<number | null>(null)

  // Redirect if not a guard
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

  const loadData = async (showRefresh = false) => {
    if (!user) return
    if (showRefresh) setRefreshing(true)

    // Load assigned lot
    const lotId = (user as any).assigned_lot_id
    if (lotId) {
      const { data: lotData } = await supabase
        .from('parking_lots').select('*').eq('id', lotId).single()
      setLot(lotData ?? null)

      const { data: spotData } = await supabase
        .from('parking_spots').select('*').eq('lot_id', lotId)
        .order('row_num').order('col_num')
      setSpots(spotData ?? [])
    } else {
      // No lot assigned — load all lots and let guard pick
      const { data: spotData } = await supabase
        .from('parking_spots').select('*')
        .order('lot_id').order('row_num').order('col_num')
      setSpots(spotData ?? [])
    }

    setLoading(false)
    if (showRefresh) setRefreshing(false)
  }

  useEffect(() => { loadData() }, [user])

  // Toggle spot between Available and Occupied with one tap
  const toggleSpot = async (spot: Spot) => {
    if (spot.status === 'Reserved') return // Guards can't override reservations
    setToggling(spot.id)
    const newStatus = spot.status === 'Available' ? 'Occupied' : 'Available'
    await supabase.from('parking_spots')
      .update({ status: newStatus, reserved_label: '' })
      .eq('id', spot.id)

    // Log to history if marking occupied
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
  const spotSize = isMobile ? 68 : 80
  const fontSize = isMobile ? 13 : 15

  if (!user || user.role !== 'Guard') return null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--maroon-dark)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--maroon-dark)',
        padding: isMobile ? '14px 16px' : '16px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Car size={18} color="white" />
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: isMobile ? 15 : 17 }}>
              {lot ? lot.lot_name : 'Parking Guard'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 1 }}>
              {user.full_name}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
            <Clock size={13} />
            {time}
          </div>
          <button
            onClick={() => loadData(true)}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontFamily: 'inherit' }}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {!isMobile && 'Refresh'}
          </button>
          <button
            onClick={() => { logout(); router.push('/') }}
            style={{ background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: '#ff9090', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontFamily: 'inherit' }}
          >
            <LogOut size={13} />
            {!isMobile && 'Sign Out'}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'flex',
        background: 'rgba(0,0,0,0.2)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        {[
          { label: 'Available', val: stats.avail, color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
          { label: 'Occupied',  val: stats.occ,   color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
          { label: 'Reserved',  val: stats.res,   color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
          { label: 'Total',     val: stats.total, color: 'rgba(255,255,255,0.7)', bg: 'transparent' },
        ].map((s, i) => (
          <div key={s.label} style={{
            flex: 1, padding: isMobile ? '10px 8px' : '12px 16px', textAlign: 'center',
            borderRight: i < 3 ? '1px solid rgba(255,255,255,0.08)' : 'none',
            background: s.bg,
          }}>
            <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: isMobile ? 10 : 12, color: 'rgba(255,255,255,0.45)', marginTop: 3, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
        {/* Occupancy bar */}
        <div style={{ flex: 1.5, padding: isMobile ? '10px 12px' : '12px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>OCCUPANCY</span>
            <span style={{ fontSize: 13, color: 'white', fontWeight: 700 }}>{pct}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99, transition: 'width 0.5s',
              width: `${pct}%`,
              background: pct > 80 ? '#f87171' : pct > 50 ? '#fbbf24' : '#4ade80',
            }} />
          </div>
        </div>
      </div>

      {/* Instructions banner */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: isMobile ? '8px 16px' : '10px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{ display: 'flex', gap: 16, flex: 1, flexWrap: 'wrap' }}>
          {[
            { color: '#4ade80', label: 'Available — tap to mark Occupied' },
            { color: '#f87171', label: 'Occupied — tap to mark Available' },
            { color: '#fbbf24', label: 'Reserved — cannot be changed here' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'rgba(255,255,255,0.55)', fontSize: isMobile ? 11 : 12.5 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Spot grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px' : '24px 28px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 16 }}>
            <Car size={36} color="rgba(255,255,255,0.2)" />
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>Loading parking data…</div>
          </div>
        ) : spots.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12 }}>
            <Car size={36} color="rgba(255,255,255,0.2)" />
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>No parking lot assigned.</div>
            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Ask an admin to assign you to a lot.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 14 }}>
            {rows.map(({ row, spots: rowSpots }, ri) => (
              <div key={row}>
                {ri === Math.floor(rows.length / 2) && (
                  <div style={{
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.25)',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    padding: '6px 0',
                    margin: '4px 0',
                    borderTop: '1px dashed rgba(255,255,255,0.1)',
                    borderBottom: '1px dashed rgba(255,255,255,0.1)',
                  }}>
                    ── DRIVE AISLE ──
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10 }}>
                  {/* Row label */}
                  <div style={{
                    width: isMobile ? 22 : 28,
                    height: spotSize,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.3)',
                    fontSize: isMobile ? 13 : 16,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}>
                    {String.fromCharCode(65 + row)}
                  </div>

                  {/* Spots */}
                  <div style={{ display: 'flex', gap: isMobile ? 6 : 10, flexWrap: 'wrap' }}>
                    {rowSpots.map(spot => {
                      const isAvail    = spot.status === 'Available'
                      const isOcc      = spot.status === 'Occupied'
                      const isRes      = spot.status === 'Reserved'
                      const isToggling = toggling === spot.id

                      const bg     = isAvail ? 'rgba(74,222,128,0.15)'  : isOcc ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.1)'
                      const border = isAvail ? '2px solid rgba(74,222,128,0.5)' : isOcc ? '2px solid rgba(248,113,113,0.5)' : '2px solid rgba(251,191,36,0.4)'
                      const color  = isAvail ? '#4ade80' : isOcc ? '#f87171' : '#fbbf24'

                      return (
                        <button
                          key={spot.id}
                          onClick={() => !isRes && toggleSpot(spot)}
                          disabled={isRes || isToggling}
                          style={{
                            width: spotSize,
                            height: spotSize,
                            borderRadius: 12,
                            border,
                            background: bg,
                            cursor: isRes ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            transition: 'all 0.15s',
                            opacity: isToggling ? 0.5 : 1,
                            transform: isToggling ? 'scale(0.95)' : 'scale(1)',
                          }}
                          title={isRes ? `Reserved: ${spot.reserved_label}` : `Tap to mark ${isAvail ? 'Occupied' : 'Available'}`}
                        >
                          {isToggling ? (
                            <RefreshCw size={isMobile ? 16 : 20} color={color} style={{ animation: 'spin 0.6s linear infinite' }} />
                          ) : isAvail ? (
                            <CheckCircle size={isMobile ? 18 : 22} color="#4ade80" />
                          ) : isOcc ? (
                            <XCircle size={isMobile ? 18 : 22} color="#f87171" />
                          ) : (
                            <Car size={isMobile ? 16 : 20} color="#fbbf24" />
                          )}
                          <span style={{ fontSize, fontWeight: 800, color, lineHeight: 1 }}>
                            {spot.spot_code}
                          </span>
                          {!isMobile && (
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, lineHeight: 1 }}>
                              {isRes ? 'RESERVED' : isAvail ? 'FREE' : 'IN USE'}
                            </span>
                          )}
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

      {/* Spin keyframe */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
