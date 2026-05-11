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

type Facility = { id: number; name: string; emoji: string; category: string; services: string[]; hours: string; latitude: number; longitude: number; is_open: boolean }
type FlyTarget = { lat: number; lng: number; zoom?: number } | null

const FILTERS   = ['All', 'Food', 'Sports', 'Academic', 'Leisure']
const CATEGORIES = ['Food', 'Sports', 'Academic', 'Leisure']
const EMPTY: Omit<Facility,'id'> = { name:'', emoji:'📍', category:'Academic', services:[], hours:'', latitude:10.2945, longitude:123.8811, is_open:true }

export default function FacilitiesPage() {
  const router = useRouter()
  const { user } = useSession()
  const isAdmin = user?.role === 'Admin'

  const [facilities, setFacilities] = useState<Facility[]>([])
  const [filter, setFilter]         = useState('All')
  const [search, setSearch]         = useState('')
  const [selected, setSelected]     = useState<Facility | null>(null)
  const [loading, setLoading]       = useState(true)
  const [flyTo, setFlyTo]           = useState<FlyTarget>(null)
  const [isMobile, setIsMobile]     = useState(false)

  const [modal, setModal]       = useState<'add'|'edit'|'delete'|null>(null)
  const [form, setForm]         = useState<Omit<Facility,'id'>>(EMPTY)
  const [svcInput, setSvcInput] = useState('')
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const load = async () => {
    const { data } = await supabase.from('facilities').select('*').order('name')
    setFacilities(data ?? []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openAdd  = () => { setForm(EMPTY); setSvcInput(''); setModal('add') }
  const openEdit = (f: Facility) => {
    setForm({ name:f.name, emoji:f.emoji, category:f.category, services:f.services??[], hours:f.hours, latitude:f.latitude, longitude:f.longitude, is_open:f.is_open })
    setSvcInput((f.services??[]).join(', ')); setModal('edit')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const payload = { ...form, services: svcInput.split(',').map(s=>s.trim()).filter(Boolean) }
    if (modal==='add') {
      const { data } = await supabase.from('facilities').insert(payload).select().single()
      if (data) setFacilities(p => [...p, data].sort((a,b)=>a.name.localeCompare(b.name)))
    } else if (modal==='edit' && selected) {
      await supabase.from('facilities').update(payload).eq('id', selected.id)
      setFacilities(p => p.map(f => f.id===selected.id ? {...f,...payload} : f))
      setSelected(prev => prev ? {...prev,...payload} : prev)
    }
    setSaving(false); setModal(null)
  }

  const handleDelete = async () => {
    if (!selected) return; setSaving(true)
    await supabase.from('facilities').delete().eq('id', selected.id)
    setFacilities(p => p.filter(f => f.id!==selected.id))
    setSelected(null); setSaving(false); setModal(null)
  }

  const selectFacility = (f: Facility) => { setSelected(f); setFlyTo({ lat:f.latitude, lng:f.longitude, zoom:20 }) }

  const filtered = useMemo(() => facilities.filter(f =>
    (filter==='All' || f.category===filter) &&
    f.name.toLowerCase().includes(search.toLowerCase())
  ), [facilities, filter, search])

  const markers = useMemo(() => filtered.map(f => ({
    lat: f.latitude, lng: f.longitude, label: f.name,
    color: selected?.id===f.id ? '#D4A017' : (f.is_open ? '#1a7a40' : '#c0392b'),
    onClick: () => selectFacility(f),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [filtered, selected?.id])

  return (
    <>
      <style>{`
        .fac-wrap { display:flex; min-height:100vh; }
        .fac-main { flex:1; display:flex; flex-direction:column; overflow:hidden; background:var(--cream); }
        .fac-body { display:flex; flex:1; overflow:hidden; }
        .fac-list { width:288px; background:var(--surface); border-right:1px solid var(--border); display:flex; flex-direction:column; flex-shrink:0; }
        .fac-map  { flex:1; display:flex; flex-direction:column; overflow:hidden; }
        .fac-mobile-map { display:none; padding:0 12px 12px; }
        .fac-filter-row { display:flex; gap:6px; padding:10px 14px; border-bottom:1px solid var(--border); overflow-x:auto; flex-wrap:nowrap; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
        .fac-filter-row::-webkit-scrollbar { display:none; }
        @media(max-width:768px) {
          .fac-list { width:100%; max-height:42vh; border-right:none; border-bottom:1px solid var(--border); }
          .fac-map  { display:none !important; }
          .fac-mobile-map { display:block; }
          .fac-body { flex-direction:column; overflow-y:auto; }
        }
      `}</style>

      <div className="fac-wrap">
        <Sidebar />
        <BottomNav />
        <main className="fac-main">
          <div className="page-header" style={{ gap:10, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:120 }}>
              <h1 style={{ fontSize:17, fontWeight:700 }}>Facilities</h1>
              <p style={{ fontSize:12.5, color:'var(--muted)', marginTop:1 }}>{filtered.length} available</p>
            </div>
            <div style={{ position:'relative', flex:1, minWidth:140 }}>
              <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--muted2)' }} />
              <input className="inp" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{ paddingLeft:32, width:'100%', padding:'8px 14px 8px 32px' }} />
            </div>
            {isAdmin && (
              <button onClick={openAdd} className="btn-primary" style={{ fontSize:13, padding:'7px 14px', gap:6, flexShrink:0 }}>
                <Plus size={14}/> Add Facility
              </button>
            )}
          </div>

          {/* Mobile map */}
          <div className="fac-mobile-map">
            <CampusMap markers={markers} height="220px" flyTo={flyTo} />
          </div>

          <div className="fac-body">
            {/* List */}
            <div className="fac-list">
              <div className="fac-filter-row">
                {FILTERS.map(f=>(
                  <button key={f} className={`pill ${filter===f?'active':''}`} onClick={()=>setFilter(f)} style={{ flexShrink:0 }}>{f}</button>
                ))}
              </div>
              <div style={{ flex:1, overflowY:'auto' }}>
                {loading && <div style={{ padding:24, textAlign:'center', color:'var(--muted)', fontSize:13.5 }}>Loading…</div>}
                {filtered.map(f => {
                  const active = selected?.id===f.id
                  return (
                    <div key={f.id} style={{ display:'flex', alignItems:'center', borderBottom:'1px solid var(--border)', background:active?'var(--maroon-pale)':'transparent', transition:'background 0.15s' }}>
                      <button onClick={()=>selectFacility(f)} style={{ flex:1, display:'flex', alignItems:'center', gap:10, padding:'11px 12px', border:'none', cursor:'pointer', textAlign:'left', background:'transparent', minWidth:0 }}>
                        <div style={{ width:38, height:38, borderRadius:10, background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{f.emoji}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13.5, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{f.name}</div>
                          <div style={{ fontSize:11.5, color:'var(--muted)', marginTop:2 }}>{f.category} · {f.hours}</div>
                        </div>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:f.is_open?'var(--green)':'var(--red)', flexShrink:0 }}/>
                      </button>
                      {isAdmin && (
                        <div style={{ display:'flex', gap:1, paddingRight:6 }}>
                          <button onClick={()=>{setSelected(f);openEdit(f)}} style={{ background:'none', border:'none', cursor:'pointer', padding:'6px', borderRadius:7, color:'var(--muted)' }}><Pencil size={13}/></button>
                          <button onClick={()=>{setSelected(f);setModal('delete')}} style={{ background:'none', border:'none', cursor:'pointer', padding:'6px', borderRadius:7, color:'var(--red)' }}><Trash2 size={13}/></button>
                        </div>
                      )}
                    </div>
                  )
                })}
                {!loading && !filtered.length && <div style={{ textAlign:'center', padding:40, color:'var(--muted)', fontSize:13.5 }}>No facilities found</div>}
              </div>
            </div>

            {/* Desktop map + detail */}
            <div className="fac-map">
              <div style={{ flex:1, padding:16 }}>
                <CampusMap markers={markers} height="100%" flyTo={flyTo} />
              </div>
              {selected && (
                <div style={{ background:'var(--surface)', borderTop:'1px solid var(--border)', padding:'14px 20px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                  <div style={{ fontSize:34, lineHeight:1, flexShrink:0 }}>{selected.emoji}</div>
                  <div style={{ flex:1, minWidth:180 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                      <span style={{ fontSize:14, fontWeight:700 }}>{selected.name}</span>
                      <span className={selected.is_open?'badge-open':'badge-closed'} style={{ fontSize:11, padding:'3px 9px', borderRadius:99 }}>{selected.is_open?'Open':'Closed'}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:5, color:'var(--muted)', fontSize:12, marginBottom:5 }}><Clock size={11}/>{selected.hours}</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                      {(selected.services??[]).map(s=><span key={s} style={{ fontSize:11, padding:'2px 8px', borderRadius:99, background:'var(--maroon-pale)', color:'var(--maroon)', fontWeight:600 }}>{s}</span>)}
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

          {/* Mobile detail — React state based, no crash */}
          {selected && isMobile && (
            <div style={{ position:'fixed', bottom:68, left:12, right:12, background:'var(--surface)', borderRadius:16, border:'1px solid var(--border)', boxShadow:'0 -4px 24px rgba(0,0,0,0.12)', padding:'14px 16px', zIndex:9990 }} className="fade-up">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
                  <span style={{ fontSize:26, flexShrink:0 }}>{selected.emoji}</span>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{selected.name}</div>
                    <div style={{ fontSize:12, color:'var(--muted)', marginTop:1 }}>{selected.hours}</div>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0, marginLeft:8 }}>
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
        <AdminModal title={modal==='add'?'Add Facility':`Edit — ${selected?.name}`} onClose={()=>setModal(null)} onSubmit={handleSave} loading={saving} submitLabel={modal==='add'?'Add Facility':'Save Changes'}>
          <Field label="Name"><TextInput value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} placeholder="e.g. College Library" required /></Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Emoji"><TextInput value={form.emoji} onChange={v=>setForm(p=>({...p,emoji:v}))} placeholder="📍" /></Field>
            <Field label="Category"><SelectInput value={form.category} onChange={v=>setForm(p=>({...p,category:v}))} options={CATEGORIES.map(c=>({value:c,label:c}))} /></Field>
          </div>
          <Field label="Services (comma-separated)"><TextInput value={svcInput} onChange={setSvcInput} placeholder="e.g. Library Services, Research" /></Field>
          <Field label="Hours"><TextInput value={form.hours} onChange={v=>setForm(p=>({...p,hours:v}))} placeholder="8:00 AM – 9:00 PM" /></Field>
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
