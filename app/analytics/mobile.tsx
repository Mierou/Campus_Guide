'use client'
import { useState, useEffect, useMemo } from 'react'
import BottomNav from '@/components/BottomNav'
import { useSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Car, Clock, Users } from 'lucide-react'
import GuardManager from '@/components/GuardManager'

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const PIE_COLORS = ['#6D1A1A','#9e2a2a','#c94040','#D4A017','#888']

const CT = ({ active, payload, label }: any) =>
  active && payload?.length ? (
    <div style={{ background:'white', border:'1px solid #e8e2da', borderRadius:10, padding:'7px 11px', fontSize:12, boxShadow:'0 4px 12px rgba(0,0,0,0.08)' }}>
      <div style={{ fontWeight:600, marginBottom:2 }}>{label}</div>
      <div style={{ color:'var(--maroon)' }}>{payload[0].value} records</div>
    </div>
  ) : null

export default function AnalyticsMobile() {
  const { user } = useSession()
  const [search, setSearch]   = useState('')
  const [history, setHistory] = useState<any[]>([])
  const [spots, setSpots]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.role !== 'Admin') return
    Promise.all([
      supabase.from('reservation_history')
        .select('*, users(full_name), parking_spots(spot_code, parking_lots(lot_name))')
        .order('created_at', { ascending: false }).limit(300),
      supabase.from('parking_spots').select('status'),
    ]).then(([{ data: hist }, { data: sp }]) => {
      setHistory(hist ?? []); setSpots(sp ?? []); setLoading(false)
    })
  }, [user])

  if (user?.role !== 'Admin') {
    return (
      <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', alignItems:'center', justifyContent:'center', background:'var(--cream)', paddingBottom:60 }}>
        <BottomNav />
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>🔒</div>
          <div style={{ fontWeight:700, fontSize:17 }}>Admin Access Only</div>
          <div style={{ color:'var(--muted)', fontSize:13.5, marginTop:6 }}>This page is for administrators.</div>
        </div>
      </div>
    )
  }

  const avail = spots.filter(s => s.status === 'Available').length
  const occ   = spots.filter(s => s.status === 'Occupied').length
  const total = spots.length
  const pct   = total ? Math.round(occ / total * 100) : 0

  const byLot = useMemo(() => {
    const m: Record<string,number> = {}
    history.forEach(r => { const n = r.parking_spots?.parking_lots?.lot_name ?? 'Unknown'; m[n] = (m[n]??0)+1 })
    return Object.entries(m).map(([name,count]) => ({ name: name.replace(' Parking','').replace(' Lot',''), count }))
  }, [history])

  const byVehicle = useMemo(() => {
    const m: Record<string,number> = {}
    history.forEach(r => { if (r.vehicle_type) m[r.vehicle_type] = (m[r.vehicle_type]??0)+1 })
    return Object.entries(m).map(([name,value]) => ({ name, value }))
  }, [history])

  const byHour = useMemo(() => {
    const m: Record<number,number> = {}
    for (let h=6;h<=20;h++) m[h]=0
    history.forEach(r => { const h=parseInt(r.time_start??'0'); if (h>=6&&h<=20) m[h]=(m[h]??0)+1 })
    return Object.entries(m).map(([h,count]) => ({ hour: Number(h)<=12?(Number(h)===12?'12p':`${h}a`):`${Number(h)-12}p`, count }))
  }, [history])

  const byDay = useMemo(() => {
    const m: Record<number,number> = {0:0,1:0,2:0,3:0,4:0,5:0,6:0}
    history.forEach(r => { if (r.reservation_date) m[new Date(r.reservation_date).getDay()]++ })
    return DAYS.map((d,i) => ({ day:d, count:m[i] }))
  }, [history])

  const filtered = history.filter(r =>
    (r.users?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.parking_spots?.parking_lots?.lot_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.vehicle_type ?? '').toLowerCase().includes(search.toLowerCase())
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

  const ChartCard = ({ title, children }: any) => (
    <div style={{ background:'var(--surface)', borderRadius:12, border:'1px solid var(--border)', padding:'14px' }}>
      <div style={{ fontSize:13.5, fontWeight:700, marginBottom:12 }}>{title}</div>
      {children}
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', background:'var(--cream)', paddingBottom:60 }}>
      <BottomNav />

      {/* Header */}
      <div style={{ padding:'12px 16px', background:'var(--surface)', borderBottom:'1px solid var(--border)' }}>
        <h1 style={{ fontSize:16, fontWeight:700 }}>Analytics</h1>
        <p style={{ fontSize:11.5, color:'var(--muted)', marginTop:2 }}>Live parking data</p>
      </div>

      {loading ? (
        <div style={{ padding:48, textAlign:'center', color:'var(--muted)', fontSize:14 }}>Loading analytics…</div>
      ) : (
        <div style={{ padding:12, display:'flex', flexDirection:'column', gap:12 }}>
          {/* 2×2 stat grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <StatCard icon={Car}        label="Occupied"  value={occ}            sub={`of ${total} spots`} valueColor="var(--red)" />
            <StatCard icon={TrendingUp} label="Available" value={avail}          sub="Ready to park"       valueColor="var(--green)" />
            <StatCard icon={Clock}      label="Occupancy" value={`${pct}%`}      sub={pct>70?'High':'Normal'} valueColor={pct>70?'var(--red)':'var(--green)'} />
            <StatCard icon={Users}      label="Records"   value={history.length} sub="Total history" />
          </div>

          {/* Charts — stacked single column on mobile */}
          <ChartCard title="Reservations by Lot">
            {byLot.length ? (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={byLot} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize:11, fill:'var(--muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CT />} />
                  <Bar dataKey="count" fill="var(--maroon)" radius={[0,5,5,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:16 }}>No data yet</div>}
          </ChartCard>

          <ChartCard title="Vehicle Types">
            {byVehicle.length ? (
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <ResponsiveContainer width={130} height={130}>
                  <PieChart>
                    <Pie data={byVehicle} dataKey="value" innerRadius={40} outerRadius={62} paddingAngle={3}>
                      {byVehicle.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                  {byVehicle.map((v,i) => (
                    <div key={v.name} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12 }}>
                      <div style={{ width:9, height:9, borderRadius:2, background:PIE_COLORS[i%PIE_COLORS.length], flexShrink:0 }} />
                      <span style={{ flex:1 }}>{v.name}</span>
                      <span style={{ fontWeight:700 }}>{Math.round(v.value/history.length*100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <div style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:16 }}>No data yet</div>}
          </ChartCard>

          <ChartCard title="Peak Hours">
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={byHour}>
                <XAxis dataKey="hour" tick={{ fontSize:9, fill:'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis hide /><Tooltip content={<CT />} />
                <Bar dataKey="count" fill="#4682b4" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Peak Days">
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={byDay}>
                <XAxis dataKey="day" tick={{ fontSize:10, fill:'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis hide /><Tooltip content={<CT />} />
                <Bar dataKey="count" fill="#6c3483" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Table */}
          <div style={{ background:'var(--surface)', borderRadius:12, border:'1px solid var(--border)', overflow:'hidden' }}>
            <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ fontSize:13.5, fontWeight:700, flex:1 }}>Reservation History</div>
              <input className="inp" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{ width:130, padding:'6px 10px', fontSize:12.5 }} />
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:360 }}>
                <thead>
                  <tr style={{ background:'var(--surface2)' }}>
                    {['User','Lot','Vehicle','Date'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'8px 12px', fontSize:10.5, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0,30).map(r => (
                    <tr key={r.id} style={{ borderTop:'1px solid var(--border)' }}>
                      <td style={{ padding:'9px 12px', fontSize:13, fontWeight:500, whiteSpace:'nowrap' }}>{r.users?.full_name ?? '—'}</td>
                      <td style={{ padding:'9px 12px', fontSize:12.5, color:'var(--muted)', whiteSpace:'nowrap' }}>{r.parking_spots?.parking_lots?.lot_name ?? '—'}</td>
                      <td style={{ padding:'9px 12px' }}>
                        {r.vehicle_type && <span style={{ fontSize:11, padding:'2px 7px', borderRadius:99, background:'var(--maroon-pale)', color:'var(--maroon)', fontWeight:600 }}>{r.vehicle_type}</span>}
                      </td>
                      <td style={{ padding:'9px 12px', fontSize:11.5, color:'var(--muted)', whiteSpace:'nowrap' }}>{r.reservation_date}</td>
                    </tr>
                  ))}
                  {!filtered.length && (
                    <tr><td colSpan={4} style={{ padding:24, textAlign:'center', color:'var(--muted)', fontSize:13 }}>No records yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <GuardManager />
        </div>
      )}
    </div>
  )
}
