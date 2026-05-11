'use client'
import { useState, useEffect, useMemo, Suspense } from 'react'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'
import AdminModal, { Field, TextInput, ConfirmDelete } from '@/components/AdminModal'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/session'
import { Navigation, ArrowLeftRight, ChevronDown, ChevronUp, Plus, Pencil, Trash2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

const CampusMap = dynamic(() => import('@/components/CampusMap'), { ssr: false })

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000, dLat=(b.lat-a.lat)*Math.PI/180, dLng=(b.lng-a.lng)*Math.PI/180
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x))
}

type Loc   = { name: string; latitude: number; longitude: number }
type Route = { id: number; from_location: string; to_location: string; waypoints: {lat:number;lng:number}[]; distance_m?: number }

const EMPTY_ROUTE = { from_location:'', to_location:'', waypoints_text:'', distance_m:'' }

function RoutesInner() {
  const params  = useSearchParams()
  const { user } = useSession()
  const isAdmin = user?.role === 'Admin'

  const [locations, setLocations] = useState<Loc[]>([])
  const [routes, setRoutes]       = useState<Route[]>([])
  const [from, setFrom]           = useState('')
  const [to, setTo]               = useState('')
  const [activeRoute, setActiveRoute] = useState<{ points:{lat:number;lng:number}[] }|undefined>()
  const [info, setInfo]           = useState<{dist:number;sec:number}|null>(null)
  const [noRoute, setNoRoute]     = useState(false)
  const [showMap, setShowMap]     = useState(false)
  const [isMobile, setIsMobile]   = useState(false)

  const [modal, setModal]         = useState<'add'|'edit'|'delete'|null>(null)
  const [editTarget, setEditTarget] = useState<Route|null>(null)
  const [form, setForm]           = useState(EMPTY_ROUTE)
  const [saving, setSaving]       = useState(false)

  const loadLocations = async () => {
    const [{ data: b }, { data: f }] = await Promise.all([
      supabase.from('buildings').select('name, latitude, longitude').order('name'),
      supabase.from('facilities').select('name, latitude, longitude').order('name'),
    ])
    const locs: Loc[] = [...(b??[]), ...(f??[])]
    setLocations(locs)
    const preset = params.get('to')
    setFrom(locs[0]?.name ?? '')
    setTo(preset && locs.find(l=>l.name===preset) ? preset : (locs[1]?.name ?? ''))
  }

  const loadRoutes = async () => {
    const { data } = await supabase.from('routes').select('*').order('from_location')
    setRoutes(data ?? [])
  }

  useEffect(() => { loadLocations(); loadRoutes() }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const go = () => {
    const route = routes.find(r => r.from_location===from && r.to_location===to)
    if (route?.waypoints?.length) {
      setActiveRoute({ points: route.waypoints })
      let d=0; for (let i=1;i<route.waypoints.length;i++) d += haversine(route.waypoints[i-1], route.waypoints[i])
      setInfo({ dist: Math.round(d), sec: Math.round(d/1.2) })
      setNoRoute(false); setShowMap(true)
    } else { setActiveRoute(undefined); setInfo(null); setNoRoute(true) }
  }

  const openAdd = () => {
    setForm({ from_location: from, to_location: to, waypoints_text: '', distance_m: '' })
    setEditTarget(null); setModal('add')
  }
  const openEdit = (r: Route) => {
    setForm({
      from_location: r.from_location,
      to_location:   r.to_location,
      waypoints_text: r.waypoints.map(p=>`${p.lat},${p.lng}`).join('\n'),
      distance_m:    String(r.distance_m ?? ''),
    })
    setEditTarget(r); setModal('edit')
  }

  const parseWaypoints = (text: string) =>
    text.split('\n').map(s=>s.trim()).filter(Boolean).map(s => {
      const [lat,lng] = s.split(',').map(Number)
      return { lat, lng }
    }).filter(p => !isNaN(p.lat) && !isNaN(p.lng))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const waypoints = parseWaypoints(form.waypoints_text)
    const payload = {
      from_location: form.from_location,
      to_location:   form.to_location,
      waypoints,
      distance_m: form.distance_m ? Number(form.distance_m) : undefined,
    }
    if (modal==='add') {
      const { data } = await supabase.from('routes').insert(payload).select().single()
      if (data) setRoutes(p => [...p, data])
    } else if (modal==='edit' && editTarget) {
      await supabase.from('routes').update(payload).eq('id', editTarget.id)
      setRoutes(p => p.map(r => r.id===editTarget.id ? {...r,...payload} : r))
    }
    setSaving(false); setModal(null); loadRoutes()
  }

  const handleDelete = async () => {
    if (!editTarget) return; setSaving(true)
    await supabase.from('routes').delete().eq('id', editTarget.id)
    setRoutes(p => p.filter(r => r.id!==editTarget.id))
    setSaving(false); setModal(null)
  }

  const fromLoc = locations.find(l=>l.name===from)
  const toLoc   = locations.find(l=>l.name===to)
  const markers = useMemo(() => [
    fromLoc && { id:'from', lat:fromLoc.latitude, lng:fromLoc.longitude, label:`Start: ${from}`, color:'#1a7a40' },
    toLoc   && { id:'to',   lat:toLoc.latitude,   lng:toLoc.longitude,   label:`End: ${to}`,     color:'#c0392b' },
  ].filter(Boolean) as any[], [fromLoc, toLoc, from, to])

  // Routes for selected from/to pair
  const pairRoutes = routes.filter(r => r.from_location===from && r.to_location===to)
  const reverseRoutes = routes.filter(r => r.from_location===to && r.to_location===from)

  return (
    <>
      <div style={{ display:'flex', minHeight:'100vh' }}>
        <Sidebar />
        <BottomNav />
        <main style={{ flex:1, display:'flex', overflow:'hidden', background:'var(--cream)' }}>
          {/* Left panel */}
          <div style={{ width:300, background:'var(--surface)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', flexShrink:0, overflowY:'auto' }}>
            <div style={{ padding:'16px 18px 12px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <h1 style={{ fontSize:17, fontWeight:700 }}>Get Directions</h1>
                  <p style={{ fontSize:12.5, color:'var(--muted)', marginTop:2 }}>Campus walking routes</p>
                </div>
                {isAdmin && (
                  <button onClick={openAdd} className="btn-primary" style={{ fontSize:12, padding:'6px 12px', gap:5 }}>
                    <Plus size={13}/> Add Route
                  </button>
                )}
              </div>
            </div>

            <div style={{ padding:16, display:'flex', flexDirection:'column', gap:12 }}>
              {locations.length===0 ? (
                <div style={{ color:'var(--muted)', fontSize:13.5, textAlign:'center', paddingTop:20 }}>Loading…</div>
              ) : (
                <>
                  {/* From / To selectors */}
                  <div style={{ background:'var(--surface2)', borderRadius:12, border:'1px solid var(--border)', overflow:'hidden' }}>
                    <div style={{ padding:'11px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--green)', flexShrink:0 }}/>
                      <select value={from} onChange={e=>{setFrom(e.target.value);setActiveRoute(undefined);setInfo(null);setNoRoute(false)}}
                        style={{ flex:1, border:'none', background:'transparent', fontSize:13.5, fontWeight:500, outline:'none', cursor:'pointer', fontFamily:'inherit' }}>
                        {locations.map(l=><option key={l.name}>{l.name}</option>)}
                      </select>
                    </div>
                    <div style={{ padding:'11px 14px', display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--red)', flexShrink:0 }}/>
                      <select value={to} onChange={e=>{setTo(e.target.value);setActiveRoute(undefined);setInfo(null);setNoRoute(false)}}
                        style={{ flex:1, border:'none', background:'transparent', fontSize:13.5, fontWeight:500, outline:'none', cursor:'pointer', fontFamily:'inherit' }}>
                        {locations.map(l=><option key={l.name}>{l.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn-ghost" onClick={()=>{const t=from;setFrom(to);setTo(t);setActiveRoute(undefined);setInfo(null);setNoRoute(false)}} style={{ flex:1, justifyContent:'center', fontSize:12.5 }}>
                      <ArrowLeftRight size={13}/> Swap
                    </button>
                    <button className="btn-primary" onClick={go} style={{ flex:2, justifyContent:'center' }}>
                      <Navigation size={14}/> Go
                    </button>
                  </div>

                  {/* Mobile map toggle */}
                  {isMobile && (
                    <button onClick={()=>setShowMap(v=>!v)} className="btn-ghost" style={{ justifyContent:'center', fontSize:12.5 }}>
                      {showMap ? <><ChevronUp size={13}/> Hide Map</> : <><ChevronDown size={13}/> Show Map</>}
                    </button>
                  )}
                  {showMap && isMobile && (
                    <CampusMap markers={markers} route={activeRoute} height="220px" />
                  )}

                  {/* Result */}
                  {info && (
                    <div className="fade-up" style={{ background:'var(--maroon-pale)', borderRadius:12, border:'1px solid var(--maroon-pale2)', overflow:'hidden' }}>
                      <div style={{ background:'var(--maroon)', padding:'10px 14px' }}>
                        <div style={{ color:'white', fontSize:12.5, fontWeight:600 }}>{from}</div>
                        <div style={{ color:'rgba(255,255,255,0.6)', fontSize:11, margin:'2px 0' }}>↓ Walking route</div>
                        <div style={{ color:'white', fontSize:12.5, fontWeight:600 }}>{to}</div>
                      </div>
                      <div style={{ padding:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                        <div style={{ textAlign:'center', padding:'10px 0', borderRadius:10, background:'white' }}>
                          <div style={{ fontSize:20, fontWeight:800, color:'var(--maroon)' }}>{info.dist}m</div>
                          <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600 }}>Distance</div>
                        </div>
                        <div style={{ textAlign:'center', padding:'10px 0', borderRadius:10, background:'white' }}>
                          <div style={{ fontSize:20, fontWeight:800, color:'var(--maroon)' }}>{info.sec<60?`${info.sec}s`:`${Math.round(info.sec/60)}min`}</div>
                          <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600 }}>Walk time</div>
                        </div>
                      </div>
                      <div style={{ padding:'0 12px 12px', display:'flex', flexDirection:'column', gap:7 }}>
                        {[`Start at ${from}`,'Follow the campus walkway',`Head toward ${to}`,`Arrive at ${to}`].map((step,i)=>(
                          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:9, fontSize:12.5 }}>
                            <div style={{ width:20, height:20, borderRadius:'50%', background:'var(--maroon)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>{i+1}</div>
                            <span style={{ paddingTop:2 }}>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {noRoute && (
                    <div style={{ background:'var(--amber-pale)', borderRadius:12, border:'1px solid #f0d090', padding:14, fontSize:13, color:'var(--amber)' }}>
                      <strong>No route available</strong> for this pair.
                      {isAdmin && <div style={{ marginTop:8 }}><button onClick={openAdd} className="btn-primary" style={{ fontSize:12, padding:'6px 12px', gap:5 }}><Plus size={12}/> Add This Route</button></div>}
                    </div>
                  )}

                  {/* Admin: route list for selected pair */}
                  {isAdmin && (pairRoutes.length>0||reverseRoutes.length>0) && (
                    <div style={{ background:'var(--surface2)', borderRadius:12, border:'1px solid var(--border)', overflow:'hidden' }}>
                      <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', fontSize:11.5, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Routes for this pair</div>
                      {[...pairRoutes,...reverseRoutes].map(r=>(
                        <div key={r.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderBottom:'1px solid var(--border)' }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.from_location} → {r.to_location}</div>
                            <div style={{ fontSize:11.5, color:'var(--muted)', marginTop:2 }}>{r.waypoints?.length??0} waypoints {r.distance_m ? `· ${r.distance_m}m` : ''}</div>
                          </div>
                          <button onClick={()=>openEdit(r)} style={{ background:'none', border:'none', cursor:'pointer', padding:'5px', borderRadius:7, color:'var(--muted)' }}><Pencil size={13}/></button>
                          <button onClick={()=>{setEditTarget(r);setModal('delete')}} style={{ background:'none', border:'none', cursor:'pointer', padding:'5px', borderRadius:7, color:'var(--red)' }}><Trash2 size={13}/></button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Admin: all routes list */}
                  {isAdmin && (
                    <div style={{ background:'var(--surface2)', borderRadius:12, border:'1px solid var(--border)', overflow:'hidden' }}>
                      <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', fontSize:11.5, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>All Saved Routes ({routes.length})</div>
                      <div style={{ maxHeight:200, overflowY:'auto' }}>
                        {routes.length===0 && <div style={{ padding:16, color:'var(--muted)', fontSize:13, textAlign:'center' }}>No routes saved yet.</div>}
                        {routes.map(r=>(
                          <div key={r.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', borderBottom:'1px solid var(--border)' }}>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:12.5, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.from_location} → {r.to_location}</div>
                              <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>{r.waypoints?.length??0} pts</div>
                            </div>
                            <button onClick={()=>openEdit(r)} style={{ background:'none', border:'none', cursor:'pointer', padding:'4px', borderRadius:6, color:'var(--muted)' }}><Pencil size={12}/></button>
                            <button onClick={()=>{setEditTarget(r);setModal('delete')}} style={{ background:'none', border:'none', cursor:'pointer', padding:'4px', borderRadius:6, color:'var(--red)' }}><Trash2 size={12}/></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Desktop map */}
          {!isMobile && (
            <div style={{ flex:1, padding:16 }}>
              <CampusMap markers={markers} route={activeRoute} height="calc(100vh - 32px)" />
            </div>
          )}
        </main>
      </div>

      {/* Add / Edit Route Modal */}
      {(modal==='add'||modal==='edit') && (
        <AdminModal
          title={modal==='add' ? 'Add Route' : `Edit Route`}
          onClose={()=>setModal(null)} onSubmit={handleSave} loading={saving}
          submitLabel={modal==='add'?'Add Route':'Save Changes'}>
          <Field label="From">
            <select className="inp" value={form.from_location} onChange={e=>setForm(p=>({...p,from_location:e.target.value}))} style={{ fontSize:14 }}>
              {locations.map(l=><option key={l.name}>{l.name}</option>)}
            </select>
          </Field>
          <Field label="To">
            <select className="inp" value={form.to_location} onChange={e=>setForm(p=>({...p,to_location:e.target.value}))} style={{ fontSize:14 }}>
              {locations.map(l=><option key={l.name}>{l.name}</option>)}
            </select>
          </Field>
          <Field label="Distance (meters, optional)">
            <TextInput type="number" value={form.distance_m} onChange={v=>setForm(p=>({...p,distance_m:v}))} placeholder="e.g. 120"/>
          </Field>
          <Field label="Waypoints (one lat,lng per line)">
            <textarea
              className="inp" value={form.waypoints_text}
              onChange={e=>setForm(p=>({...p,waypoints_text:e.target.value}))}
              placeholder={"10.29484,123.88097\n10.29487,123.88107\n10.29507,123.88101"}
              rows={6} style={{ fontSize:13, resize:'vertical', fontFamily:'monospace' }}/>
            <p style={{ fontSize:11.5, color:'var(--muted)', marginTop:4 }}>
              Each line: <code>latitude,longitude</code>. Get coordinates by right-clicking on Google Maps.
            </p>
          </Field>
        </AdminModal>
      )}

      {modal==='delete' && editTarget && (
        <ConfirmDelete name={`${editTarget.from_location} → ${editTarget.to_location}`} onConfirm={handleDelete} onCancel={()=>setModal(null)} loading={saving}/>
      )}
    </>
  )
}

export default function RoutesPage() {
  return <Suspense><RoutesInner/></Suspense>
}
