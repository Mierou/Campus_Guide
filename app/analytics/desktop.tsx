'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import { useSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts'
import { TrendingUp, Car, Activity, Users, RefreshCw } from 'lucide-react'
import GuardManager from '@/components/GuardManager'

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const CT = ({ active, payload, label }: any) =>
  active && payload?.length ? (
    <div style={{ background:'white', border:'1px solid #e8e2da', borderRadius:10, padding:'8px 12px', fontSize:12.5, boxShadow:'0 4px 16px rgba(0,0,0,0.08)' }}>
      <div style={{ fontWeight:600, marginBottom:4 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color ?? 'var(--maroon)', fontSize:12 }}>{p.name}: {p.value}</div>
      ))}
    </div>
  ) : null

export default function AnalyticsDesktop() {
  const { user } = useSession()
  const [search, setSearch]     = useState('')
  const [history, setHistory]   = useState<any[]>([])
  const [lotSpots, setLotSpots] = useState<any[]>([])
  const [lots, setLots]         = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const load = useCallback(async (showRefresh = false) => {
    if (user?.role !== 'Admin') return
    if (showRefresh) setRefreshing(true)

    const [{ data: hist }, { data: sp }, { data: ls }] = await Promise.all([
      supabase.from('reservation_history')
        .select('*, users(full_name), parking_spots(spot_code, parking_lots(lot_name))')
        .eq('status', 'Occupied')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase.from('parking_spots')
        .select('id, status, lot_id, parking_lots(lot_name)'),
      supabase.from('parking_lots').select('id, lot_name').order('lot_name'),
    ])

    setHistory(hist ?? [])
    setLotSpots(sp ?? [])
    setLots(ls ?? [])
    setLoading(false)
    setRefreshing(false)
    setLastRefresh(new Date())
  }, [user])

  useEffect(() => { load() }, [load])

  // Auto-refresh live stats every 30 seconds
  useEffect(() => {
    const id = setInterval(() => load(), 30000)
    return () => clearInterval(id)
  }, [load])

  if (user?.role !== 'Admin') {
    return (
      <div style={{ display:'flex', minHeight:'100vh' }}>
        <Sidebar />
        <main style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--cream)' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:12 }}>🔒</div>
            <div style={{ fontWeight:700, fontSize:17 }}>Admin Access Only</div>
          </div>
        </main>
      </div>
    )
  }

  // ── Live occupancy ────────────────────────────────────────────────────
  const totalSpots = lotSpots.length
  const totalOcc   = lotSpots.filter(s => s.status === 'Occupied').length
  const totalAvail = lotSpots.filter(s => s.status === 'Available').length
  const totalRes   = lotSpots.filter(s => s.status === 'Reserved').length
  const overallPct = totalSpots ? Math.round(totalOcc / totalSpots * 100) : 0

  // ── Per-lot live occupancy ────────────────────────────────────────────
  const occupancyByLot = useMemo(() => lots.map(lot => {
    const ls    = lotSpots.filter(s => s.lot_id === lot.id)
    const occ   = ls.filter(s => s.status === 'Occupied').length
    const avail = ls.filter(s => s.status === 'Available').length
    const res   = ls.filter(s => s.status === 'Reserved').length
    const total = ls.length
    return {
      name: lot.lot_name.replace(' Parking','').replace(' Lot',''),
      occ, avail, res, total,
      pct: total ? Math.round(occ / total * 100) : 0,
    }
  }), [lots, lotSpots])

  // ── Occupations per day (last 30 days) ───────────────────────────────
  const dailyOccupations = useMemo(() => {
    const days: Record<string,number> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      days[d.toISOString().split('T')[0]] = 0
    }
    history.forEach(r => {
      if (r.reservation_date && days[r.reservation_date] !== undefined)
        days[r.reservation_date]++
    })
    return Object.entries(days).map(([date, count]) => ({
      date: date.slice(5), count,
    }))
  }, [history])

  // ── Peak hours ────────────────────────────────────────────────────────
  const byHour = useMemo(() => {
    const m: Record<number,number> = {}
    for (let h=6;h<=22;h++) m[h]=0
    history.forEach(r => {
      const h = parseInt(r.time_start ?? '0')
      if (h >= 6 && h <= 22) m[h] = (m[h] ?? 0) + 1
    })
    return Object.entries(m).map(([h,count]) => ({
      hour: Number(h) === 12 ? '12pm' : Number(h) > 12 ? `${Number(h)-12}pm` : `${h}am`,
      count,
    }))
  }, [history])

  // ── Peak days ─────────────────────────────────────────────────────────
  const byDay = useMemo(() => {
    const m: Record<number,number> = {0:0,1:0,2:0,3:0,4:0,5:0,6:0}
    history.forEach(r => {
      if (r.reservation_date) m[new Date(r.reservation_date).getDay()]++
    })
    return DAYS.map((d,i) => ({ day:d, count:m[i] }))
  }, [history])

  // ── Table filter ──────────────────────────────────────────────────────
  const filtered = history.filter(r =>
    (r.users?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.parking_spots?.parking_lots?.lot_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.parking_spots?.spot_code ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const StatCard = ({ icon: Icon, label, value, sub, valueColor = 'var(--dark)' }: any) => (
    <div style={{ background:'var(--surface)', borderRadius:14, border:'1px solid var(--border)', padding:'18px 20px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
        <div style={{ width:34, height:34, borderRadius:10, background:'var(--maroon-pale)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={16} color="var(--maroon)" />
        </div>
        <span style={{ fontSize:12.5, fontWeight:600, color:'var(--muted)' }}>{label}</span>
      </div>
      <div style={{ fontSize:30, fontWeight:800, color:valueColor, lineHeight:1, marginBottom:4 }}>{value}</div>
      <div style={{ fontSize:12, color:'var(--muted)' }}>{sub}</div>
    </div>
  )

  const ChartCard = ({ title, subtitle, children }: any) => (
    <div style={{ background:'var(--surface)', borderRadius:14, border:'1px solid var(--border)', padding:'18px 20px' }}>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:13.5, fontWeight:700 }}>{title}</div>
        {subtitle && <div style={{ fontSize:11.5, color:'var(--muted)', marginTop:2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  )

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <Sidebar />
      <main style={{ flex:1, overflowY:'auto', background:'var(--cream)' }}>
        <div className="page-header" style={{ justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontSize:17, fontWeight:700 }}>Analytics</h1>
            <p style={{ fontSize:12.5, color:'var(--muted)', marginTop:1 }}>
              Live occupancy & historical trends
              {lastRefresh && <span style={{ marginLeft:8, color:'var(--muted2)' }}>· Updated {lastRefresh.toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}</span>}
            </p>
          </div>
          <button onClick={() => load(true)} className="btn-ghost" style={{ fontSize:13, gap:6 }} disabled={refreshing}>
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:'var(--muted)', fontSize:14 }}>Loading analytics…</div>
        ) : (
          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:18 }}>

            {/* Live stat cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
              <StatCard icon={Car}        label="Currently Occupied" value={totalOcc}    sub={`of ${totalSpots} spots campus-wide`}  valueColor="var(--red)" />
              <StatCard icon={TrendingUp} label="Available Now"      value={totalAvail}  sub="Ready to park right now"               valueColor="var(--green)" />
              <StatCard icon={Activity}   label="Occupancy Rate"     value={`${overallPct}%`} sub={overallPct>80?'Very busy · Consider alternatives':overallPct>50?'Moderate traffic':'Low traffic'} valueColor={overallPct>80?'var(--red)':overallPct>50?'var(--amber)':'var(--green)'} />
              <StatCard icon={Users}      label="Total Occupations"  value={history.length} sub="Recorded since tracking began" />
            </div>

            {/* Live occupancy by lot — stacked bars */}
            <ChartCard title="Live Occupancy by Lot" subtitle="Current spot status — refreshes every 30 seconds">
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {occupancyByLot.map(lot => (
                  <div key={lot.name}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <span style={{ fontSize:13.5, fontWeight:600 }}>{lot.name}</span>
                      <div style={{ display:'flex', gap:14, fontSize:12.5 }}>
                        <span style={{ color:'var(--red)', fontWeight:700 }}>{lot.occ} occupied</span>
                        <span style={{ color:'var(--green)', fontWeight:700 }}>{lot.avail} available</span>
                        {lot.res > 0 && <span style={{ color:'var(--amber)', fontWeight:700 }}>{lot.res} reserved</span>}
                        <span style={{ fontWeight:800, color: lot.pct>80?'var(--red)':lot.pct>50?'var(--amber)':'var(--green)', minWidth:36, textAlign:'right' }}>{lot.pct}%</span>
                      </div>
                    </div>
                    <div style={{ height:18, borderRadius:99, background:'var(--border)', overflow:'hidden', display:'flex' }}>
                      <div style={{ width:`${lot.total?lot.occ/lot.total*100:0}%`, background:'var(--red)', transition:'width 0.6s' }} />
                      <div style={{ width:`${lot.total?lot.res/lot.total*100:0}%`, background:'var(--amber)', transition:'width 0.6s' }} />
                      <div style={{ width:`${lot.total?lot.avail/lot.total*100:0}%`, background:'var(--green)', transition:'width 0.6s' }} />
                    </div>
                  </div>
                ))}
                {occupancyByLot.length === 0 && <div style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:20 }}>No lots found</div>}
              </div>
              <div style={{ display:'flex', gap:16, marginTop:14 }}>
                {[['var(--red)','Occupied'],['var(--amber)','Reserved'],['var(--green)','Available']].map(([color,label]) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--muted)' }}>
                    <div style={{ width:10, height:10, borderRadius:3, background:color }} />{label}
                  </div>
                ))}
              </div>
            </ChartCard>

            {/* Historical charts */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <ChartCard title="Occupations Over Time" subtitle="Last 30 days — each mark = spot marked occupied">
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={dailyOccupations}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize:9.5, fill:'var(--muted)' }} axisLine={false} tickLine={false} interval={4} />
                    <YAxis tick={{ fontSize:10, fill:'var(--muted)' }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip content={<CT />} />
                    <Line type="monotone" dataKey="count" name="Occupations" stroke="var(--maroon)" strokeWidth={2.5} dot={{ r:2, fill:'var(--maroon)' }} activeDot={{ r:5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Occupations by Lot" subtitle="Total times each lot had spots marked occupied">
                {occupancyByLot.length ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={occupancyByLot} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize:11, fill:'var(--muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CT />} />
                      <Bar dataKey="occ" name="Currently Occupied" fill="var(--maroon)" radius={[0,5,5,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:20 }}>No data yet</div>}
              </ChartCard>

              <ChartCard title="Peak Hours" subtitle="Hours when spots are most frequently marked occupied">
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={byHour}>
                    <XAxis dataKey="hour" tick={{ fontSize:9.5, fill:'var(--muted)' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<CT />} />
                    <Bar dataKey="count" name="Occupations" fill="#4682b4" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Peak Days" subtitle="Days of the week with most occupations">
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={byDay}>
                    <XAxis dataKey="day" tick={{ fontSize:10.5, fill:'var(--muted)' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<CT />} />
                    <Bar dataKey="count" name="Occupations" fill="#6c3483" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Occupation log */}
            <div style={{ background:'var(--surface)', borderRadius:14, border:'1px solid var(--border)', overflow:'hidden' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--border)', flexWrap:'wrap', gap:10 }}>
                <div>
                  <div style={{ fontSize:13.5, fontWeight:700 }}>Occupation Log</div>
                  <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>Every time a spot was marked occupied · showing {Math.min(filtered.length, 100)} of {filtered.length}</div>
                </div>
                <input className="inp" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by user, lot, spot…" style={{ width:220, padding:'7px 12px', fontSize:13 }} />
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:500 }}>
                  <thead>
                    <tr style={{ background:'var(--surface2)' }}>
                      {['Marked By','Lot','Spot','Time','Date'].map(h => (
                        <th key={h} style={{ textAlign:'left', padding:'10px 16px', fontSize:11, fontWeight:700, color:'var(--muted)', letterSpacing:'0.04em', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 100).map(r => (
                      <tr key={r.id} style={{ borderTop:'1px solid var(--border)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                        <td style={{ padding:'11px 16px', fontSize:13, fontWeight:500, whiteSpace:'nowrap' }}>{r.users?.full_name ?? '—'}</td>
                        <td style={{ padding:'11px 16px', fontSize:12.5, color:'var(--muted)', whiteSpace:'nowrap' }}>{r.parking_spots?.parking_lots?.lot_name ?? '—'}</td>
                        <td style={{ padding:'11px 16px' }}>
                          <span style={{ fontSize:12, padding:'3px 9px', borderRadius:99, background:'var(--maroon-pale)', color:'var(--maroon)', fontWeight:700 }}>
                            {r.parking_spots?.spot_code ?? '—'}
                          </span>
                        </td>
                        <td style={{ padding:'11px 16px', fontSize:12.5, color:'var(--muted)', whiteSpace:'nowrap' }}>{r.time_start ?? '—'}</td>
                        <td style={{ padding:'11px 16px', fontSize:12, color:'var(--muted)', whiteSpace:'nowrap' }}>{r.reservation_date ?? '—'}</td>
                      </tr>
                    ))}
                    {!filtered.length && (
                      <tr><td colSpan={5} style={{ padding:32, textAlign:'center', color:'var(--muted)', fontSize:13.5 }}>No occupation records yet. Mark spots as occupied to start tracking.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <GuardManager />
          </div>
        )}
      </main>
      <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
    </div>
  )
}
