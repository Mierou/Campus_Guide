'use client'
import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import BottomNav from '@/components/BottomNav'
import AdminModal, { Field, TextInput, ConfirmDelete } from '@/components/AdminModal'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/session'
import { Car, ChevronRight, X, Plus, Pencil, Trash2 } from 'lucide-react'
import type { ParkingLot, ParkingSpot } from '@/lib/types'

const CampusMap = dynamic(() => import('@/components/CampusMap'), { ssr: false })

const EMPTY_LOT = { lot_name:'', departments:'', hours:'', latitude:'10.2945', longitude:'123.8811', rows:'3', cols:'8' }

export default function ParkingMobile() {
  const { user } = useSession()
  const isAdmin = user?.role === 'Admin'

  const [lots, setLots]                   = useState<ParkingLot[]>([])
  const [selectedLot, setSelectedLot]     = useState<ParkingLot | null>(null)
  const [spots, setSpots]                 = useState<ParkingSpot[]>([])
  const [selectedSpot, setSelectedSpot]   = useState<ParkingSpot | null>(null)
  const [loadingLots, setLoadingLots]     = useState(true)
  const [loadingSpots, setLoadingSpots]   = useState(false)
  const [lotCounts, setLotCounts]         = useState<Record<number,{avail:number;total:number}>>({})
  const [showSpotSheet, setShowSpotSheet] = useState(false)
  const [flyTo, setFlyTo]                 = useState<{ lat: number; lng: number; zoom?: number } | null>(null)
  const [lotModal, setLotModal]           = useState<'add'|'edit'|'delete'|null>(null)
  const [lotForm, setLotForm]             = useState(EMPTY_LOT)
  const [spotModal, setSpotModal]         = useState<'delete'|null>(null)
  const [saving, setSaving]               = useState(false)

  const loadLots = async () => {
    const { data } = await supabase.from('parking_lots').select('*').order('lot_name')
    const ls = data ?? []; setLots(ls); setLoadingLots(false)
    const counts: Record<number,{avail:number;total:number}> = {}
    await Promise.all(ls.map(async (lot: ParkingLot) => {
      const { data: sp } = await supabase.from('parking_spots').select('status').eq('lot_id', lot.id)
      counts[lot.id] = { avail: (sp??[]).filter((s:any)=>s.status==='Available').length, total: sp?.length??0 }
    }))
    setLotCounts(counts)
  }
  useEffect(() => { loadLots() }, [])

  const selectLot = async (lot: ParkingLot) => {
    setSelectedLot(lot); setSelectedSpot(null); setLoadingSpots(true); setShowSpotSheet(false)
    setFlyTo({ lat: lot.latitude, lng: lot.longitude, zoom: 20 })
    const { data } = await supabase.from('parking_spots').select('*').eq('lot_id', lot.id).order('row_num').order('col_num')
    setSpots(data ?? []); setLoadingSpots(false)
  }

  const generateSpots = async (lotId: number, rows: number, cols: number) => {
    const toInsert = []
    for (let r=0;r<rows;r++) for (let c=0;c<cols;c++)
      toInsert.push({ lot_id:lotId, spot_code:`${String.fromCharCode(65+r)}${String(c+1).padStart(2,'0')}`, row_num:r, col_num:c, status:'Available', reserved_label:'' })
    await supabase.from('parking_spots').insert(toInsert)
  }

  const openAddLot  = () => { setLotForm(EMPTY_LOT); setLotModal('add') }
  const openEditLot = (lot: ParkingLot) => {
    setLotForm({ lot_name:lot.lot_name, departments:lot.departments??'', hours:lot.hours??'', latitude:String(lot.latitude), longitude:String(lot.longitude), rows:String(lot.rows??3), cols:String(lot.cols??8) })
    setLotModal('edit')
  }

  const handleSaveLot = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const payload = { lot_name:lotForm.lot_name, departments:lotForm.departments, hours:lotForm.hours, latitude:parseFloat(lotForm.latitude)||0, longitude:parseFloat(lotForm.longitude)||0, rows:parseInt(lotForm.rows)||3, cols:parseInt(lotForm.cols)||8 }
    if (lotModal==='add') {
      const { data } = await supabase.from('parking_lots').insert(payload).select().single()
      if (data) { await generateSpots(data.id, payload.rows, payload.cols); await loadLots() }
    } else if (lotModal==='edit' && selectedLot) {
      const oldRows = selectedLot.rows ?? 3, oldCols = selectedLot.cols ?? 8
      await supabase.from('parking_lots').update(payload).eq('id', selectedLot.id)
      if (payload.rows !== oldRows || payload.cols !== oldCols) {
        const ok = confirm(`Grid changed to ${payload.rows}×${payload.cols}. Regenerate all spots? (Existing data will be reset.)`)
        if (ok) {
          await supabase.from('parking_spots').delete().eq('lot_id', selectedLot.id)
          await generateSpots(selectedLot.id, payload.rows, payload.cols)
          const { data: newSpots } = await supabase.from('parking_spots').select('*').eq('lot_id', selectedLot.id).order('row_num').order('col_num')
          setSpots(newSpots ?? [])
        }
      }
      setLots(p=>p.map(l=>l.id===selectedLot.id?{...l,...payload}:l))
      setSelectedLot(prev=>prev?{...prev,...payload}:prev)
      await loadLots()
    }
    setSaving(false); setLotModal(null)
  }

  const handleDeleteLot = async () => {
    if (!selectedLot) return; setSaving(true)
    await supabase.from('parking_spots').delete().eq('lot_id', selectedLot.id)
    await supabase.from('parking_lots').delete().eq('id', selectedLot.id)
    setLots(p=>p.filter(l=>l.id!==selectedLot.id)); setSelectedLot(null); setSpots([])
    setSaving(false); setLotModal(null); loadLots()
  }

  const updateSpot = async (spot: ParkingSpot, status: ParkingSpot['status'], label='') => {
    await supabase.from('parking_spots').update({ status, reserved_label: label }).eq('id', spot.id)
    setSpots(p=>p.map(s=>s.id===spot.id?{...s,status,reserved_label:label}:s))
    setSelectedSpot(prev=>prev?.id===spot.id?{...prev,status,reserved_label:label}:prev)
    setLotCounts(prev=>{
      const curr=prev[spot.lot_id]??{avail:0,total:0}
      return {...prev,[spot.lot_id]:{...curr,avail:curr.avail+(status==='Available'?1:0)-(spot.status==='Available'?1:0)}}
    })
  }

  const handleDeleteSpot = async () => {
    if (!selectedSpot) return; setSaving(true)
    await supabase.from('parking_spots').delete().eq('id', selectedSpot.id)
    setSpots(p=>p.filter(s=>s.id!==selectedSpot.id))
    setSelectedSpot(null); setSaving(false); setSpotModal(null)
  }

  const stats = useMemo(()=>({
    avail: spots.filter(s=>s.status==='Available').length,
    occ:   spots.filter(s=>s.status==='Occupied').length,
    res:   spots.filter(s=>s.status==='Reserved').length,
    total: spots.length,
  }), [spots])

  const rows = useMemo(()=>{
    const map:Record<number,ParkingSpot[]>={}
    spots.forEach(s=>{if(!map[s.row_num])map[s.row_num]=[];map[s.row_num].push(s)})
    return Object.entries(map).map(([r,ss])=>({row:Number(r),spots:ss.sort((a,b)=>a.col_num-b.col_num)}))
  }, [spots])

  const markers = useMemo(() => lots.map(lot=>({
    id: lot.id, lat:lot.latitude, lng:lot.longitude, label:lot.lot_name,
    color: selectedLot?.id===lot.id?'#D4A017':'#1a7a40',
  })), [lots, selectedLot?.id])

  const handleMarkerClick = (id: string | number) => {
    const lot = lots.find(l => l.id === id)
    if (lot) selectLot(lot)
  }

  const pct = stats.total ? Math.round(stats.occ/stats.total*100) : 0

  const SpotSheet = ({ spot }: { spot: ParkingSpot }) => (
    <div style={{ position:'fixed', bottom:60, left:0, right:0, background:'white', borderRadius:'18px 18px 0 0', borderTop:'1px solid var(--border)', boxShadow:'0 -4px 24px rgba(0,0,0,0.15)', padding:16, zIndex:9997, maxHeight:'55vh', overflowY:'auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Spot Details</div>
        <button onClick={()=>setShowSpotSheet(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', padding:4 }}><X size={16}/></button>
      </div>
      <div style={{ marginBottom:14, padding:14, borderRadius:12, background:'var(--surface2)', border:'1px solid var(--border)' }}>
        <div style={{ fontSize:22, fontWeight:800, marginBottom:3 }}>{spot.spot_code}</div>
        <div style={{ fontSize:12, color:'var(--muted)' }}>{selectedLot?.lot_name}</div>
        <div style={{ marginTop:8 }}>
          <span className={spot.status==='Available'?'badge-open':spot.status==='Reserved'?'badge-amber':'badge-closed'} style={{ fontSize:11, padding:'4px 10px', borderRadius:99 }}>{spot.status}</span>
        </div>
        {spot.reserved_label && <div style={{ fontSize:11.5, color:'var(--amber)', marginTop:5 }}>For: {spot.reserved_label}</div>}
      </div>
      {isAdmin && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <button onClick={async()=>{ if(spot.status!=='Available')return; const v=prompt('Vehicle type (Car, Motorcycle, SUV/Van, Truck, Bicycle):')??''; if(v){await updateSpot(spot,'Occupied'); if(user) await supabase.from('reservation_history').insert({spot_id:spot.id,user_id:user.id,vehicle_type:v,time_start:new Date().getHours()+':00',reservation_date:new Date().toISOString().split('T')[0],status:'Occupied'})}}}
            disabled={spot.status!=='Available'} style={{ padding:'11px 0', borderRadius:10, border:'1.5px solid #f0b3ab', background:'var(--red-pale)', color:'var(--red)', fontSize:14, fontWeight:600, cursor:'pointer', opacity:spot.status!=='Available'?0.4:1 }}>
            Mark Occupied
          </button>
          <button onClick={()=>updateSpot(spot,'Available')} disabled={spot.status==='Available'}
            style={{ padding:'11px 0', borderRadius:10, border:'1.5px solid #a8d5b8', background:'var(--green-pale)', color:'var(--green)', fontSize:14, fontWeight:600, cursor:'pointer', opacity:spot.status==='Available'?0.4:1 }}>
            Mark Available
          </button>
          <button onClick={async()=>{ if(spot.status==='Reserved')return; const l=prompt('Reserve for (name):')??''; if(l) updateSpot(spot,'Reserved',l)}}
            disabled={spot.status==='Reserved'} style={{ padding:'11px 0', borderRadius:10, border:'1.5px solid #f0d090', background:'var(--amber-pale)', color:'var(--amber)', fontSize:14, fontWeight:600, cursor:'pointer', opacity:spot.status==='Reserved'?0.4:1 }}>
            Mark Reserved
          </button>
          <button onClick={()=>setSpotModal('delete')} style={{ padding:'11px 0', borderRadius:10, border:'1.5px solid #f0b3ab', background:'var(--red-pale)', color:'var(--red)', fontSize:14, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontFamily:'inherit' }}>
            <Trash2 size={14}/> Delete Spot
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', background:'var(--cream)', paddingBottom:60 }}>
        <BottomNav />

        {/* Header */}
        <div style={{ padding:'12px 16px', background:'var(--surface)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontSize:16, fontWeight:700 }}>Parking</h1>
            <p style={{ fontSize:11.5, color:'var(--muted)', marginTop:2 }}>Select a lot</p>
          </div>
          {isAdmin && (
            <button onClick={openAddLot} className="btn-primary" style={{ fontSize:12, padding:'6px 12px', gap:4 }}>
              <Plus size={13}/> Add Lot
            </button>
          )}
        </div>

        {/* Map */}
        <div style={{ padding:'10px 12px', background:'var(--surface)', borderBottom:'1px solid var(--border)' }}>
          <CampusMap markers={markers} height="180px" flyTo={flyTo} onMarkerClick={handleMarkerClick} />
        </div>

        {/* Lot list */}
        <div style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)' }}>
          {loadingLots && <div style={{ padding:20, textAlign:'center', color:'var(--muted)', fontSize:13.5 }}>Loading…</div>}
          {lots.map(lot => {
            const counts = lotCounts[lot.id]
            const active = selectedLot?.id === lot.id
            return (
              <div key={lot.id} style={{ display:'flex', alignItems:'center', borderBottom:'1px solid var(--border)', background:active?'var(--maroon-pale)':'transparent' }}>
                <button onClick={()=>selectLot(lot)} style={{ flex:1, display:'flex', alignItems:'center', gap:10, padding:'12px 14px', border:'none', cursor:'pointer', textAlign:'left', background:'transparent' }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:active?'var(--maroon)':'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Car size={16} color={active?'white':'var(--muted)'}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600 }}>{lot.lot_name}</div>
                    <div style={{ fontSize:12, color:'var(--muted)', marginTop:1 }}>{counts?`${counts.avail}/${counts.total} available`:'Loading…'}</div>
                  </div>
                  <ChevronRight size={14} color="var(--muted2)"/>
                </button>
                {isAdmin && (
                  <div style={{ display:'flex', gap:1, paddingRight:8 }}>
                    <button onClick={()=>{setSelectedLot(lot);openEditLot(lot)}} style={{ background:'none', border:'none', cursor:'pointer', padding:'8px', borderRadius:7, color:'var(--muted)' }}><Pencil size={14}/></button>
                    <button onClick={()=>{setSelectedLot(lot);setLotModal('delete')}} style={{ background:'none', border:'none', cursor:'pointer', padding:'8px', borderRadius:7, color:'var(--red)' }}><Trash2 size={14}/></button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Stats + Spot grid */}
        {selectedLot && (
          <>
            {/* Stats bar */}
            <div style={{ display:'flex', background:'var(--surface)', borderBottom:'1px solid var(--border)', overflowX:'auto' }}>
              {[
                {label:'Available',val:stats.avail,color:'var(--green)',bg:'var(--green-pale)'},
                {label:'Occupied', val:stats.occ,  color:'var(--red)',  bg:'var(--red-pale)'},
                {label:'Reserved', val:stats.res,  color:'var(--amber)',bg:'var(--amber-pale)'},
                {label:'Total',    val:stats.total, color:'var(--dark)', bg:'var(--surface2)'},
              ].map((s,i)=>(
                <div key={s.label} style={{ flex:'1 0 70px', padding:'8px 12px', borderRight:i<3?'1px solid var(--border)':'none', background:s.bg }}>
                  <div style={{ fontSize:18, fontWeight:700, color:s.color }}>{s.val}</div>
                  <div style={{ fontSize:10.5, color:s.color, fontWeight:600, opacity:0.8 }}>{s.label}</div>
                </div>
              ))}
              <div style={{ flex:'1 0 70px', padding:'8px 12px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
                <div style={{ height:6, borderRadius:99, background:'var(--border)', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:pct>80?'var(--red)':pct>50?'var(--amber)':'var(--green)', borderRadius:99 }}/>
                </div>
                <div style={{ fontSize:10.5, color:'var(--muted)', marginTop:3 }}>{pct}%</div>
              </div>
            </div>

            {/* Spot grid */}
            <div style={{ padding:16, background:'var(--surface)' }}>
              {isAdmin && (
                <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                  <button onClick={()=>openEditLot(selectedLot)} className="btn-ghost" style={{ fontSize:12.5, flex:1, justifyContent:'center' }}><Pencil size={13}/> Edit Lot</button>
                  <button onClick={()=>setLotModal('delete')} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'8px 0', borderRadius:10, border:'1.5px solid #f0b3ab', background:'var(--red-pale)', color:'var(--red)', fontSize:12.5, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}><Trash2 size={13}/> Delete Lot</button>
                </div>
              )}
              <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>{selectedLot.lot_name} — Tap a spot</div>
              {loadingSpots
                ? <div style={{ textAlign:'center', color:'var(--muted)', fontSize:13.5, padding:20 }}>Loading spots…</div>
                : (
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {rows.map(({row,spots:rowSpots},ri)=>(
                      <div key={row}>
                        {ri===Math.floor(rows.length/2) && (
                          <div style={{ textAlign:'center', fontSize:10, fontWeight:700, color:'var(--muted)', padding:'4px 0', margin:'3px 0', background:'var(--surface2)', borderRadius:6, letterSpacing:'0.08em' }}>── DRIVE AISLE ──</div>
                        )}
                        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <span style={{ width:16, fontSize:10, fontWeight:700, color:'var(--muted2)', textAlign:'center', flexShrink:0 }}>{String.fromCharCode(65+row)}</span>
                          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                            {rowSpots.map(spot=>(
                              <button key={spot.id}
                                onClick={()=>{ setSelectedSpot(spot); setShowSpotSheet(true) }}
                                className={`${spot.status==='Available'?'spot-available':spot.status==='Occupied'?'spot-occupied':'spot-reserved'} ${selectedSpot?.id===spot.id?'spot-selected':''}`}
                                style={{ width:40, height:32, borderRadius:7, fontSize:10, fontWeight:700, cursor:'pointer', transition:'all 0.15s', flexShrink:0 }}>
                                {spot.spot_code.replace(/[A-Za-z]/g,'')}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
              {/* Legend */}
              <div style={{ display:'flex', gap:12, marginTop:16, flexWrap:'wrap' }}>
                {[['spot-available','Available'],['spot-occupied','Occupied'],['spot-reserved','Reserved']].map(([cls,lbl])=>(
                  <div key={lbl} style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div className={cls} style={{ width:24, height:18, borderRadius:5, fontSize:8, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>A1</div>
                    <span style={{ fontSize:12 }}>{lbl}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Spot bottom sheet */}
      {selectedSpot && showSpotSheet && <SpotSheet spot={selectedSpot} />}

      {/* Lot modals */}
      {(lotModal==='add'||lotModal==='edit') && (
        <AdminModal title={lotModal==='add'?'Add Parking Lot':`Edit — ${selectedLot?.lot_name}`} onClose={()=>setLotModal(null)} onSubmit={handleSaveLot} loading={saving} submitLabel={lotModal==='add'?'Add Lot':'Save Changes'}>
          <Field label="Lot Name"><TextInput value={lotForm.lot_name} onChange={v=>setLotForm(p=>({...p,lot_name:v}))} placeholder="e.g. RTL Parking" required /></Field>
          <Field label="Departments / Access"><TextInput value={lotForm.departments} onChange={v=>setLotForm(p=>({...p,departments:v}))} placeholder="e.g. CS, IT Dept." /></Field>
          <Field label="Hours"><TextInput value={lotForm.hours} onChange={v=>setLotForm(p=>({...p,hours:v}))} placeholder="7:00 AM – 8:00 PM" /></Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Latitude"><TextInput type="number" value={lotForm.latitude} onChange={v=>setLotForm(p=>({...p,latitude:v}))} /></Field>
            <Field label="Longitude"><TextInput type="number" value={lotForm.longitude} onChange={v=>setLotForm(p=>({...p,longitude:v}))} /></Field>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Rows"><TextInput type="number" value={lotForm.rows} onChange={v=>setLotForm(p=>({...p,rows:v}))} placeholder="3" /></Field>
            <Field label="Columns"><TextInput type="number" value={lotForm.cols} onChange={v=>setLotForm(p=>({...p,cols:v}))} placeholder="8" /></Field>
          </div>
          <div style={{ fontSize:12.5, color:'var(--muted)', padding:'8px 12px', borderRadius:9, background:'var(--surface2)', border:'1px solid var(--border)' }}>
            {lotModal==='add' ? 'Spots auto-generated from rows × columns.' : 'Changing grid size will prompt to regenerate spots.'}
          </div>
        </AdminModal>
      )}
      {lotModal==='delete' && selectedLot && <ConfirmDelete name={selectedLot.lot_name} onConfirm={handleDeleteLot} onCancel={()=>setLotModal(null)} loading={saving} />}
      {spotModal==='delete' && selectedSpot && <ConfirmDelete name={`Spot ${selectedSpot.spot_code}`} onConfirm={handleDeleteSpot} onCancel={()=>setSpotModal(null)} loading={saving} />}
    </>
  )
}
