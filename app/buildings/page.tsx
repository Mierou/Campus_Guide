'use client'
import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'
import AdminModal, { Field, TextInput, SelectInput, ToggleInput, ConfirmDelete } from '@/components/AdminModal'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/session'
import { Search, Clock, Navigation, Plus, Pencil, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

const CampusMap = dynamic(() => import('@/components/CampusMap'), { ssr: false })

type Building = { id: number; name: string; abbreviation: string; departments: string[]; hours: string; latitude: number; longitude: number; filter_category: string; is_open: boolean }
type FlyTarget = { lat: number; lng: number; zoom?: number } | null

const FILTERS = ['All', 'Engineering', 'Health', 'Education']
const ABBR_COLORS: Record<string, string> = { RTL:'#1a5fa0', GLE:'#a01a1a', ACAD:'#1a7a2a', SAL:'#8a6010', NGE:'#6a1a9a', ALY:'#107a50', ELEM:'#a01a6a', GLEC:'#1a30a0' }
const EMPTY: Omit<Building,'id'> = { name:'', abbreviation:'', departments:[], hours:'', latitude:10.2945, longitude:123.8811, filter_category:'Engineering', is_open:true }

export default function BuildingsPage() {
  const router = useRouter()
  const { user } = useSession()
  const isAdmin = user?.role === 'Admin'

  const [buildings, setBuildings] = useState<Building[]>([])
  const [filter, setFilter]     = useState('All')
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<Building | null>(null)
  const [loading, setLoading]   = useState(true)
  const [flyTo, setFlyTo]       = useState<FlyTarget>(null)
  const [isMobile, setIsMobile] = useState(false)

  const [modal, setModal]         = useState<'add'|'edit'|'delete'|null>(null)
  const [form, setForm]           = useState<Omit<Building,'id'>>(EMPTY)
  const [deptInput, setDeptInput] = useState('')
  const [saving, setSaving]       = useState(false)

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  
  const load = async () => {
  try {
    setLoading(true)

    const { data, error } = await supabase
      .from("buildings")
      .select("*")
      .order("name")

    if (error) {
      console.error(error)
      return
    }

    setBuildings(data || [])
  } catch (err) {
    console.error("Buildings load error:", err)
  } finally {
    setLoading(false)
  }
}

  const openAdd  = () => { setForm(EMPTY); setDeptInput(''); setModal('add') }
  const openEdit = (b: Building) => {
    setForm({ name:b.name, abbreviation:b.abbreviation, departments:b.departments??[], hours:b.hours, latitude:b.latitude, longitude:b.longitude, filter_category:b.filter_category, is_open:b.is_open })
    setDeptInput((b.departments??[]).join(', ')); setModal('edit')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const payload = { ...form, departments: deptInput.split(',').map(s=>s.trim()).filter(Boolean) }
    if (modal === 'add') {
      const { data } = await supabase.from('buildings').insert(payload).select().single()
      if (data) setBuildings(p => [...p, data].sort((a,b) => a.name.localeCompare(b.name)))
    } else if (modal === 'edit' && selected) {
      await supabase.from('buildings').update(payload).eq('id', selected.id)
      setBuildings(p => p.map(b => b.id===selected.id ? {...b,...payload} : b))
      setSelected(prev => prev ? {...prev,...payload} : prev)
    }
    setSaving(false); setModal(null)
  }

  const handleDelete = async () => {
    if (!selected) return; setSaving(true)
    await supabase.from('buildings').delete().eq('id', selected.id)
    setBuildings(p => p.filter(b => b.id!==selected.id))
    setSelected(null); setSaving(false); setModal(null)
  }

  const isValidCoordinate = (lat?: number, lng?: number) => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng)
    )
  }
  
 const selectBuilding = (b: Building) => {
  setSelected(b)

  if (
    typeof b.latitude === "number" &&
    typeof b.longitude === "number"
  ) {
    setFlyTo({
      lat: b.latitude,
      lng: b.longitude,
      zoom: 20,
    })
  }
}
  
  const filtered = useMemo(() => buildings.filter(b =>
    (filter==='All' || b.filter_category===filter) &&
    b.name.toLowerCase().includes(search.toLowerCase())
  ), [buildings, filter, search])

  const markers = useMemo(() =>
  filtered
    .filter(b => isValidCoordinate(b.latitude, b.longitude))
    .map(b => ({
      id: b.id,
      lat: Number(b.latitude),
      lng: Number(b.longitude),
      label: b.name,
      color:
        selected?.id === b.id
          ? '#D4A017'
          : b.is_open
          ? '#1a7a40'
          : '#c0392b',
    })),
  [filtered, selected?.id]
)

  const handleMarkerClick = (id: string | number) => {
    const b = buildings.find(b => b.id === id)
    if (b) selectBuilding(b)
  }

  const col = (abbr: string) => ABBR_COLORS[abbr] ?? 'var(--maroon)'

  return (
    <>
    <div className="bldg-wrap">
        <Sidebar />
        <BottomNav />
        <main className="bldg-main">

          {/* Header */}
          <div className="page-header" style={{ gap:10, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:120 }}>
              <h1 style={{ fontSize:17, fontWeight:700 }}>Buildings</h1>
              <p style={{ fontSize:12.5, color:'var(--muted)', marginTop:1 }}>{filtered.length} locations</p>
            </div>
            <div style={{ position:'relative', flex:1, minWidth:140 }}>
              <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--muted2)' }} />
              <input className="inp" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{ paddingLeft:32, width:'100%', padding:'8px 14px 8px 32px' }} />
            </div>
            {isAdmin && (
              <button onClick={openAdd} className="btn-primary" style={{ fontSize:13, padding:'7px 14px', gap:6, flexShrink:0 }}>
                <Plus size={14} /> Add Building
              </button>
            )}
          </div>

          {/* Mobile map — shown above list on mobile */}
          <div className="bldg-mobile-map">
            <CampusMap markers={markers} height="220px" flyTo={flyTo} onMarkerClick={handleMarkerClick} />
          </div>

          <div className="bldg-body">
            {/* List panel */}
            <div className="bldg-list">
              {/* Filter pills */}
              <div className="filter-row">
                {FILTERS.map(f => (
                  <button key={f} className={`pill ${filter===f?'active':''}`} onClick={()=>setFilter(f)} style={{ flexShrink:0 }}>{f}</button>
                ))}
              </div>

              <div style={{ flex:1, overflowY:'auto' }}>
                {loading && <div style={{ padding:24, textAlign:'center', color:'var(--muted)', fontSize:13.5 }}>Loading…</div>}
                {filtered.map(b => {
                  const active = selected?.id===b.id
                  return (
                    <div key={b.id} style={{ display:'flex', alignItems:'center', borderBottom:'1px solid var(--border)', background:active?'var(--maroon-pale)':'transparent', transition:'background 0.15s' }}>
                      <button onClick={()=>selectBuilding(b)} style={{ flex:1, display:'flex', alignItems:'center', gap:10, padding:'11px 12px', border:'none', cursor:'pointer', textAlign:'left', background:'transparent', minWidth:0 }}>
                        <div style={{ width:38, height:36, borderRadius:9, background:col(b.abbreviation)+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:col(b.abbreviation), flexShrink:0 }}>{b.abbreviation}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13.5, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{b.name}</div>
                          <div style={{ fontSize:11.5, color:'var(--muted)', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{(b.departments??[]).join(' · ')}</div>
                        </div>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:b.is_open?'var(--green)':'var(--red)', flexShrink:0 }} />
                      </button>
                      {isAdmin && (
                        <div style={{ display:'flex', gap:1, paddingRight:6, flexShrink:0 }}>
                          <button onClick={()=>{setSelected(b);openEdit(b)}} style={{ background:'none', border:'none', cursor:'pointer', padding:'6px', borderRadius:7, color:'var(--muted)' }} title="Edit"><Pencil size={13} /></button>
                          <button onClick={()=>{setSelected(b);setModal('delete')}} style={{ background:'none', border:'none', cursor:'pointer', padding:'6px', borderRadius:7, color:'var(--red)' }} title="Delete"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </div>
                  )
                })}
                {!loading && !filtered.length && <div style={{ textAlign:'center', padding:40, color:'var(--muted)', fontSize:13.5 }}>No buildings found</div>}
              </div>
            </div>

            {/* Desktop map + detail */}
            <div className="bldg-map">
              <div style={{ flex:1, padding:16 }}>
                <CampusMap markers={markers} height="100%" flyTo={flyTo} onMarkerClick={handleMarkerClick} />
              </div>
              {selected && (
                <div style={{ background:'var(--surface)', borderTop:'1px solid var(--border)', padding:'14px 20px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                  <div style={{ width:44, height:40, borderRadius:10, background:col(selected.abbreviation)+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:col(selected.abbreviation), flexShrink:0 }}>{selected.abbreviation}</div>
                  <div style={{ flex:1, minWidth:180 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                      <span style={{ fontSize:14, fontWeight:700 }}>{selected.name}</span>
                      <span className={selected.is_open?'badge-open':'badge-closed'} style={{ fontSize:11, padding:'3px 9px', borderRadius:99 }}>{selected.is_open?'Open':'Closed'}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:5, color:'var(--muted)', fontSize:12, marginBottom:5 }}><Clock size={11}/>{selected.hours}</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                      {(selected.departments??[]).map(d=><span key={d} style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:'var(--maroon-pale)', color:'var(--maroon)', fontWeight:600 }}>{d}</span>)}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                    {isAdmin && (
                      <>
                        <button onClick={()=>openEdit(selected)} className="btn-ghost" style={{ fontSize:12.5, padding:'7px 12px' }}><Pencil size={13}/> Edit</button>
                        <button onClick={()=>setModal('delete')} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:10, border:'1.5px solid #f0b3ab', background:'var(--red-pale)', color:'var(--red)', fontSize:12.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}><Trash2 size={13}/> Delete</button>
                      </>
                    )}
                    <button className="btn-primary" onClick={()=>router.push(`/routes?to=${encodeURIComponent(selected.name)}`)} style={{ fontSize:12.5 }}><Navigation size={13}/> Directions</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile detail card — React-state based, no style tag trick */}
          {selected && isMobile && (
            <div style={{ position:'fixed', bottom:68, left:12, right:12, background:'var(--surface)', borderRadius:16, border:'1px solid var(--border)', boxShadow:'0 -4px 24px rgba(0,0,0,0.12)', padding:'14px 16px', zIndex:9990 }} className="fade-up">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>{selected.name}</div>
                  <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{selected.hours}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span className={selected.is_open?'badge-open':'badge-closed'} style={{ fontSize:11, padding:'3px 9px', borderRadius:99 }}>{selected.is_open?'Open':'Closed'}</span>
                  <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', padding:2 }}><X size={15}/></button>
                </div>
              </div>
              <div style={{ display:'flex', gap:7 }}>
                {isAdmin && (
                  <>
                    <button onClick={()=>openEdit(selected)} className="btn-ghost" style={{ fontSize:12, padding:'7px 10px', flex:1, justifyContent:'center' }}><Pencil size={12}/> Edit</button>
                    <button onClick={()=>setModal('delete')} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'7px 10px', borderRadius:10, border:'1.5px solid #f0b3ab', background:'var(--red-pale)', color:'var(--red)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}><Trash2 size={12}/> Delete</button>
                  </>
                )}
                <button className="btn-primary" onClick={()=>router.push(`/routes?to=${encodeURIComponent(selected.name)}`)} style={{ flex:1, justifyContent:'center', fontSize:12, padding:'7px 0' }}><Navigation size={12}/> Directions</button>
              </div>
            </div>
          )}
        </main>
      </div>

      {(modal==='add'||modal==='edit') && (
        <AdminModal title={modal==='add'?'Add Building':`Edit — ${selected?.name}`} onClose={()=>setModal(null)} onSubmit={handleSave} loading={saving} submitLabel={modal==='add'?'Add Building':'Save Changes'}>
          <Field label="Building Name"><TextInput value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} placeholder="e.g. RTL Building" required /></Field>
          <Field label="Abbreviation"><TextInput value={form.abbreviation} onChange={v=>setForm(p=>({...p,abbreviation:v}))} placeholder="e.g. RTL" required /></Field>
          <Field label="Category"><SelectInput value={form.filter_category} onChange={v=>setForm(p=>({...p,filter_category:v}))} options={['Engineering','Health','Education'].map(o=>({value:o,label:o}))} /></Field>
          <Field label="Departments (comma-separated)"><TextInput value={deptInput} onChange={setDeptInput} placeholder="e.g. Computer Science, Information Technology" /></Field>
          <Field label="Hours"><TextInput value={form.hours} onChange={v=>setForm(p=>({...p,hours:v}))} placeholder="e.g. 8:00 AM – 5:00 PM" /></Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Latitude"><TextInput type="number" value={String(form.latitude)} onChange={v=>setForm(p=>({...p,latitude:parseFloat(v)||0}))} placeholder="10.2945" /></Field>
            <Field label="Longitude"><TextInput type="number" value={String(form.longitude)} onChange={v=>setForm(p=>({...p,longitude:parseFloat(v)||0}))} placeholder="123.8811" /></Field>
          </div>
          <ToggleInput label="Currently Open" value={form.is_open} onChange={v=>setForm(p=>({...p,is_open:v}))} />
        </AdminModal>
      )}
      {modal==='delete' && selected && <ConfirmDelete name={selected.name} onConfirm={handleDelete} onCancel={()=>setModal(null)} loading={saving} />}
    </>
  )
}
