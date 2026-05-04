'use client'
import { useState, useMemo } from 'react'
import Sidebar from '@/components/Sidebar'
import { useSession } from '@/lib/session'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { PARKING_LOTS, generateSpots } from '@/lib/data'
import { TrendingUp, Car, Clock, Users } from 'lucide-react'

function genHistory(count = 300) {
  const lots = PARKING_LOTS
  const vehicles = ['Car', 'Motorcycle', 'SUV / Van', 'Truck', 'Bicycle']
  const users = ['Juan dela Cruz', 'Maria Santos', 'Pedro Reyes', 'Ana Garcia', 'Carlos Lim', 'Lisa Tan']
  return Array.from({ length: count }, (_, i) => {
    const lot = lots[Math.floor(Math.random() * lots.length)]
    const dayOffset = Math.floor(Math.random() * 90) + 1
    const hour = Math.floor(Math.random() * 14) + 6
    return { id: i, lot_name: lot.lot_name, vehicle: vehicles[Math.floor(Math.random() * vehicles.length)], user: users[Math.floor(Math.random() * users.length)], date: new Date(Date.now() - dayOffset * 86400000).toISOString().split('T')[0], hour, day: new Date(Date.now() - dayOffset * 86400000).getDay() }
  })
}
const HISTORY = genHistory()
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const PIE_COLORS = ['#6D1A1A','#9e2a2a','#c94040','#D4A017','#888']

const CustomTooltip = ({ active, payload, label }: any) =>
  active && payload?.length ? (
    <div style={{ background: 'white', border: '1px solid #e8e2da', borderRadius: 10, padding: '8px 12px', fontSize: 12.5, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ color: 'var(--maroon)' }}>{payload[0].value} records</div>
    </div>
  ) : null

export default function AnalyticsPage() {
  const { user } = useSession()
  const [search, setSearch] = useState('')

  if (user?.role !== 'Admin') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>Admin Access Only</div>
            <div style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 6 }}>This page is restricted to administrators.</div>
          </div>
        </main>
      </div>
    )
  }

  const allSpots = PARKING_LOTS.flatMap(lot => generateSpots(lot.id, lot.rows, lot.cols))
  const avail = allSpots.filter(s => s.status === 'Available').length
  const occ   = allSpots.filter(s => s.status === 'Occupied').length
  const total = allSpots.length
  const pct   = Math.round(occ / total * 100)

  const byLot = useMemo(() => {
    const m: Record<string, number> = {}
    HISTORY.forEach(r => { m[r.lot_name] = (m[r.lot_name] ?? 0) + 1 })
    return Object.entries(m).map(([name, count]) => ({ name: name.replace(' Parking','').replace(' Lot',''), count }))
  }, [])

  const byVehicle = useMemo(() => {
    const m: Record<string, number> = {}
    HISTORY.forEach(r => { m[r.vehicle] = (m[r.vehicle] ?? 0) + 1 })
    return Object.entries(m).map(([name, value]) => ({ name, value }))
  }, [])

  const byHour = useMemo(() => {
    const m: Record<number, number> = {}
    for (let h = 6; h <= 20; h++) m[h] = 0
    HISTORY.forEach(r => { if (r.hour >= 6 && r.hour <= 20) m[r.hour]++ })
    return Object.entries(m).map(([h, count]) => ({ hour: Number(h) <= 12 ? (Number(h)===12?'12p':`${h}a`) : `${Number(h)-12}p`, count }))
  }, [])

  const byDay = useMemo(() => {
    const m: Record<number, number> = {0:0,1:0,2:0,3:0,4:0,5:0,6:0}
    HISTORY.forEach(r => { m[r.day]++ })
    return DAYS.map((d,i) => ({ day: d, count: m[i] }))
  }, [])

  const filtered = HISTORY.filter(r =>
    r.user.toLowerCase().includes(search.toLowerCase()) ||
    r.lot_name.toLowerCase().includes(search.toLowerCase()) ||
    r.vehicle.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 50)

  const StatCard = ({ icon: Icon, label, value, sub, valueColor = 'var(--dark)' }: any) => (
    <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--maroon-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color="var(--maroon)" />
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>{label}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color: valueColor, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</div>
    </div>
  )

  const ChartCard = ({ title, children }: any) => (
    <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', padding: '18px 20px' }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--dark)', marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--cream)' }}>
        <div className="page-header" style={{ justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700 }}>Analytics</h1>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 1 }}>Parking usage overview · Last 90 days</p>
          </div>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Metric cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <StatCard icon={Car}       label="Currently Occupied" value={occ}    sub={`of ${total} total spots`} valueColor="var(--red)" />
            <StatCard icon={TrendingUp} label="Available Now"     value={avail}  sub="Ready to park"            valueColor="var(--green)" />
            <StatCard icon={Clock}     label="Avg Occupancy"      value={`${pct}%`} sub={pct>70?'High traffic':'Normal usage'} valueColor={pct>70?'var(--red)':'var(--green)'} />
            <StatCard icon={Users}     label="Total Records"      value={HISTORY.length} sub="In analytics history" />
          </div>

          {/* Charts row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <ChartCard title="Reservations by Lot">
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={byLot} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={105} tick={{ fontSize: 12, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="var(--maroon)" radius={[0,6,6,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Vehicle Types">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={byVehicle} dataKey="value" innerRadius={48} outerRadius={72} paddingAngle={3} startAngle={90} endAngle={-270}>
                      {byVehicle.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {byVehicle.map((v, i) => (
                    <div key={v.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                      <span style={{ color: 'var(--text)', flex: 1 }}>{v.name}</span>
                      <span style={{ fontWeight: 700, color: 'var(--dark)' }}>{Math.round(v.value / HISTORY.length * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          </div>

          {/* Charts row 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <ChartCard title="Peak Hours">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={byHour}>
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#4682b4" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Peak Days">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={byDay}>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#6c3483" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Table */}
          <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>Recent Occupancy Records</div>
              <input className="inp" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records…" style={{ width: 180, padding: '7px 12px', fontSize: 13 }} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  {['User', 'Parking Lot', 'Vehicle', 'Date'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 18px', fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <td style={{ padding: '11px 18px', fontSize: 13.5, fontWeight: 500 }}>{r.user}</td>
                    <td style={{ padding: '11px 18px', fontSize: 13.5, color: 'var(--muted)' }}>{r.lot_name}</td>
                    <td style={{ padding: '11px 18px' }}>
                      <span style={{ fontSize: 11.5, padding: '3px 9px', borderRadius: 99, background: 'var(--maroon-pale)', color: 'var(--maroon)', fontWeight: 600 }}>{r.vehicle}</span>
                    </td>
                    <td style={{ padding: '11px 18px', fontSize: 12.5, color: 'var(--muted)' }}>{r.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
