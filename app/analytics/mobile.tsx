'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import BottomNav from '@/components/BottomNav'
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
    <div style={{ background:'white', border:'1px solid #e8e2da', borderRadius:10, padding:'7px 11px', fontSize:12, boxShadow:'0 4px 12px rgba(0,0,0,0.08)' }}>
      <div style={{ fontWeight:600, marginBottom:2 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color ?? 'var(--maroon)', fontSize:11.5 }}>{p.name}: {p.value}</div>
      ))}
    </div>
  ) : null

export default function AnalyticsMobile() {
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
        .limit(300),
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

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const id = setInterval(() => load(), 30000)
    return () => clearInterval(id)
  }, [load])

  if (user?.role !== 'Admin') {
    return (
      <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', alignItems:'center', justifyContent:'center', background:'var(--cream)', paddingBottom:60 }}>
        <BottomNav />
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>🔒</div>
          <div style={{ fontWeight:700, fontSize:17 }}>Admin Access Only</div>
        </div>
      </div>
    )
  }

  // ── Live stats ─────────────────────────────────────────────────────────
  const totalSpots = lotSpots.length
  const totalOcc   = lotSpots.filter(s => s.status === 'Occupied').length
  const totalAvail = lotSpots.filter(s => s.status === 'Available').length
  const overallPct = totalSpots ? Math.round(totalOcc / totalSpots * 100) : 0

  // ── Per-lot live occupancy ─────────────────────────────────────────────
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

  // ── Occupations per day (last 14 days) ────────────────────────────────
  const dailyOccupations = useMemo(() => {
    const days: Record<string,number> = {}
    for (let i=13;i>=0;i--) {
      const d = new Date(); d.setDate(d.getDate()-i)
      days[d.toISOString().split('T')[0]] = 0
    }
    history.forEach(r => {
      if (r.reservation_date && days[r.reservation_date] !== undefined)
        days[r.reservation_date]++
    })
    return Object.entries(days).map(([date,count]) => ({ date:date.slice(5), count }))
  }, [history])

  // ── Peak hours ─────────────────────────────────────────────────────────
  const byHour = useMemo(() => {
    const m: Record<number,number> = {}
    for (let h=6;h<=22;h++) m[h]=0
    history.forEach(r => {
      const h = parseInt(r.time_start ?? '0')
      if (h>=6&&h<=22) m[h]=(m[h]??0)+1
    })
    return Object.entries(m).map(([h,count]) => ({
      hour: Number(h)===12?'12p':Number(h)>12?`${Number(h)-12}p`:`${h}a`, count
    }))
  }, [history])

  // ── Peak days ─────────────────────────────────────────────────────────
  const byDay = useMemo(() => {
    const m: Record<number,number> = {0:0,1:0,2:0,3:0,4:0,5:0,6:0}
    history.forEach(r => { if (r.reservation_date) m[new Date(r.reservation_date).getDay()]++ })
    return DAYS.map((d,i) => ({ day:d, count:m[i] }))
  }, [history])

  const filtered = history.filter(r =>
    (r.users?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.parking_spots?.parking_lots?.lot_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.parking_spots?.spot_code ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const StatCard = ({ icon: Icon, label, value, sub, valueColor = 'var(--dark)' }: any) => (
    <div style={{ background:'var(--surface)', borderRadius:12, border:'1px solid var(--border)', padding:'14px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <div style={{ width:28, height:28, borderRadius:8, background:'var(--maroon-pale)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={13} color="var(--maroon)" />
        </div>
        <span style={{ fontSize:12, fontWeight:600, color:'var(--muted)' }}>{label}</span>
      </div>
      <div style={{ fontSize:26, fontWeight:800, color:valueColor, lineHeight:1, marginBottom:2 }}>{value}</div>
      <div style={{ fontSize:11, color:'var(--muted)' }}>{sub}</div>
    </div>
  )

  const ChartCard = ({ title, subtitle, children }: any) => (
    <div style={{ background:'var(--surface)', borderRadius:12, border:'1px solid var(--border)', padding:'14px' }}>
      <div style={{ fontSize:13.5, fontWeight:700, marginBottom:subtitle?4:12 }}>{title}</div>
      {subtitle && <div style={{ fontSize:11.5, color:'var(--muted)', marginBottom:12 }}>{subtitle}</div>}
      {children}
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', background:'var(--cream)', paddingBottom:60 }}>
      <BottomNav />

      {/* Header */}
      <div style={{ padding:'12px 16px', background:'var(--surface)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:16, fontWeight:700 }}>Analytics</h1>
          <p style={{ fontSize:11.5, color:'var(--muted)', marginTop:1 }}>
            Live occupancy
            {lastRefresh && <span style={{ color:'var(--muted2)' }}> · {lastRefresh.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'})}</span>}
          </p>
        </div>
        <button onClick={() => load(true)} className="btn-ghost" style={{ fontSize:12, gap:5, padding:'6px 10px' }} disabled={refreshing}>
          <RefreshCw size={13} style={{ animation:refreshing?'spin 1s linear infinite':'none' }} />
          {refreshing ? '…' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div style={{ padding:48, textAlign:'center', color:'var(--muted)', fontSize:14 }}>Loading…</div>
      ) : (
        <div style={{ padding:12, display:'flex', flexDirection:'column', gap:12 }}>

          {/* Stat cards 2×2 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <StatCard icon={Car}        label="Occupied Now"      value={totalOcc}         sub={`of ${totalSpots} spots`}        valueColor="var(--red)" />
            <StatCard icon={TrendingUp} label="Available Now"     value={totalAvail}        sub="Ready to park"                   valueColor="var(--green)" />
            <StatCard icon={Activity}   label="Occupancy Rate"    value={`${overallPct}%`} sub={overallPct>80?'Very busy':overallPct>50?'Moderate':'Low traffic'} valueColor={overallPct>80?'var(--red)':overallPct>50?'var(--amber)':'var(--green)'} />
            <StatCard icon={Users}      label="Total Occupations" value={history.length}   sub="All recorded events" />
          </div>

          {/* Live occupancy by lot */}
          <ChartCard title="Live Occupancy by Lot" subtitle="Auto-refreshes every 30s">
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {occupancyByLot.map(lot => (
                <div key={lot.name}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                    <span style={{ fontSize:13, fontWeight:600 }}>{lot.name}</span>
                    <div style={{ display:'flex', gap:10, fontSize:12 }}>
                      <span style={{ color:'var(--red)', fontWeight:700 }}>{lot.occ} occ</span>
                      <span style={{ color:'var(--green)', fontWeight:700 }}>{lot.avail} avail</span>
                      <span style={{ fontWeight:800, color:lot.pct>80?'var(--red)':lot.pct>50?'var(--amber)':'var(--green)' }}>{lot.pct}%</span>
                    </div>
                  </div>
                  <div style={{ height:14, borderRadius:99, background:'var(--border)', overflow:'hidden', display:'flex' }}>
                    <div style={{ width:`${lot.total?lot.occ/lot.total*100:0}%`, background:'var(--red)', transition:'width 0.6s' }} />
                    <div style={{ width:`${lot.total?lot.res/lot.total*100:0}%`, background:'var(--amber)', transition:'width 0.6s' }} />
                    <div style={{ width:`${lot.total?lot.avail/lot.total*100:0}%`, background:'var(--green)', transition:'width 0.6s' }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:12, marginTop:12 }}>
              {[['var(--red)','Occupied'],['var(--amber)','Reserved'],['var(--green)','Available']].map(([c,l]) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11.5, color:'var(--muted)' }}>
                  <div style={{ width:9, height:9, borderRadius:3, background:c }} />{l}
                </div>
              ))}
            </div>
          </ChartCard>

          {/* Trend line */}
          <ChartCard title="Occupations Over Time" subtitle="Last 14 days">
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={dailyOccupations}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize:9, fill:'var(--muted)' }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fontSize:9.5, fill:'var(--muted)' }} axisLine={false} tickLine={false} width={22} />
                <Tooltip content={<CT />} />
                <Line type="monotone" dataKey="count" name="Occupations" stroke="var(--maroon)" strokeWidth={2.5} dot={{ r:2, fill:'var(--maroon)' }} activeDot={{ r:4 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Peak hours + days */}
          <ChartCard title="Peak Hours" subtitle="Most frequent occupation times">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={byHour}>
                <XAxis dataKey="hour" tick={{ fontSize:8.5, fill:'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CT />} />
                <Bar dataKey="count" name="Occupations" fill="#4682b4" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Peak Days" subtitle="Busiest days of the week">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={byDay}>
                <XAxis dataKey="day" tick={{ fontSize:10, fill:'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CT />} />
                <Bar dataKey="count" name="Occupations" fill="#6c3483" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Occupation log */}
          <div style={{ background:'var(--surface)', borderRadius:12, border:'1px solid var(--border)', overflow:'hidden' }}>
            <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13.5, fontWeight:700 }}>Occupation Log</div>
                <div style={{ fontSize:11.5, color:'var(--muted)', marginTop:1 }}>{filtered.length} records</div>
              </div>
              <input className="inp" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ width:140, padding:'6px 10px', fontSize:12.5 }} />
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:340 }}>
                <thead>
                  <tr style={{ background:'var(--surface2)' }}>
                    {['User','Lot','Spot','Date'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'8px 12px', fontSize:10.5, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0,40).map(r => (
                    <tr key={r.id} style={{ borderTop:'1px solid var(--border)' }}>
                      <td style={{ padding:'9px 12px', fontSize:13, fontWeight:500, whiteSpace:'nowrap' }}>{r.users?.full_name ?? '—'}</td>
                      <td style={{ padding:'9px 12px', fontSize:12, color:'var(--muted)', whiteSpace:'nowrap' }}>{r.parking_spots?.parking_lots?.lot_name ?? '—'}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{ fontSize:11, padding:'2px 7px', borderRadius:99, background:'var(--maroon-pale)', color:'var(--maroon)', fontWeight:700 }}>
                          {r.parking_spots?.spot_code ?? '—'}
                        </span>
                      </td>
                      <td style={{ padding:'9px 12px', fontSize:11.5, color:'var(--muted)', whiteSpace:'nowrap' }}>{r.reservation_date ?? '—'}</td>
                    </tr>
                  ))}
                  {!filtered.length && (
                    <tr><td colSpan={4} style={{ padding:24, textAlign:'center', color:'var(--muted)', fontSize:13 }}>No records yet. Mark spots occupied to start tracking.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <GuardManager />
        </div>
      )}
      <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
    </div>
  )
}
