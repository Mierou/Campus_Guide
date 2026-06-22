'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AdminModal, { Field, TextInput, ConfirmDelete } from '@/components/AdminModal'
import { Shield, Plus, Pencil, Trash2, Car, Check } from 'lucide-react'

type Guard = {
  id: number
  username: string
  full_name: string
  assigned_lots: number[]
  lot_names: string[]
}

type Lot = { id: number; lot_name: string }

const EMPTY = { username: '', password: '', full_name: '' }

export default function GuardManager() {
  const [guards, setGuards]     = useState<Guard[]>([])
  const [lots, setLots]         = useState<Lot[]>([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState<'add' | 'edit' | 'delete' | null>(null)
  const [selected, setSelected] = useState<Guard | null>(null)
  const [form, setForm]         = useState(EMPTY)
  const [chosenLots, setChosenLots] = useState<number[]>([])
  const [saving, setSaving]     = useState(false)

  const load = async () => {
    const [{ data: guardData }, { data: lotData }, { data: assignData }] = await Promise.all([
      supabase.from('users').select('id, username, full_name').eq('role', 'Guard').order('full_name'),
      supabase.from('parking_lots').select('id, lot_name').order('lot_name'),
      supabase.from('guard_lot_assignments').select('guard_id, lot_id'),
    ])
    const lotsArr    = lotData ?? []
    const assignArr  = assignData ?? []
    setLots(lotsArr)
    setGuards((guardData ?? []).map((g: any) => {
      const lotIds = assignArr.filter((a: any) => a.guard_id === g.id).map((a: any) => a.lot_id)
      return {
        ...g,
        assigned_lots: lotIds,
        lot_names: lotIds.map((lid: number) => lotsArr.find((l: Lot) => l.id === lid)?.lot_name ?? '').filter(Boolean),
      }
    }))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const openAdd = () => { setForm(EMPTY); setChosenLots([]); setSelected(null); setModal('add') }
  const openEdit = (g: Guard) => {
    setForm({ username: g.username, password: '', full_name: g.full_name })
    setChosenLots(g.assigned_lots); setSelected(g); setModal('edit')
  }

  const toggleLot = (id: number) =>
    setChosenLots(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    let guardId = selected?.id

    if (modal === 'add') {
      const { data } = await supabase.from('users').insert({
        username: form.username, password: form.password,
        full_name: form.full_name, role: 'Guard',
      }).select('id').single()
      guardId = data?.id
    } else if (modal === 'edit' && selected) {
      const update: any = { full_name: form.full_name, username: form.username }
      if (form.password) update.password = form.password
      await supabase.from('users').update(update).eq('id', selected.id)
    }

    if (guardId) {
      // Replace all lot assignments
      await supabase.from('guard_lot_assignments').delete().eq('guard_id', guardId)
      if (chosenLots.length > 0) {
        await supabase.from('guard_lot_assignments').insert(
          chosenLots.map(lid => ({ guard_id: guardId, lot_id: lid }))
        )
      }
    }

    setSaving(false); setModal(null); load()
  }

  const handleDelete = async () => {
    if (!selected) return; setSaving(true)
    await supabase.from('guard_lot_assignments').delete().eq('guard_id', selected.id)
    await supabase.from('users').delete().eq('id', selected.id)
    setSaving(false); setModal(null); load()
  }

  return (
    <>
      <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--maroon-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={16} color="var(--maroon)" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Security Guards</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{guards.length} guard account{guards.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <button onClick={openAdd} className="btn-primary" style={{ fontSize: 13, gap: 6 }}>
            <Plus size={14} /> Add Guard
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13.5 }}>Loading…</div>
        ) : guards.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Shield size={32} color="var(--muted2)" style={{ margin: '0 auto 12px', display: 'block' }} />
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>No guard accounts yet</div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>Guards log in to manage parking spots in their assigned lots.</div>
            <button onClick={openAdd} className="btn-primary" style={{ fontSize: 13, gap: 6 }}>
              <Plus size={14} /> Create First Guard Account
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface2)' }}>
                {['Guard', 'Username', 'Assigned Lots', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 18px', fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guards.map(g => (
                <tr key={g.id} style={{ borderTop: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <td style={{ padding: '12px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--maroon-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--maroon)', flexShrink: 0 }}>
                        {g.full_name.split(' ').map(p => p[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{g.full_name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>Security Guard</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 18px', fontSize: 13, color: 'var(--muted)', fontFamily: 'monospace' }}>{g.username}</td>
                  <td style={{ padding: '12px 18px' }}>
                    {g.lot_names.length === 0 ? (
                      <span style={{ fontSize: 13, color: 'var(--muted2)', fontStyle: 'italic' }}>No lots assigned</span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {g.lot_names.map(name => (
                          <span key={name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '3px 9px', borderRadius: 99, background: 'var(--maroon-pale)', color: 'var(--maroon)', fontWeight: 600 }}>
                            <Car size={11} />{name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 18px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(g)} className="btn-ghost" style={{ fontSize: 12.5, padding: '5px 10px' }}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={() => { setSelected(g); setModal('delete') }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 9, border: '1.5px solid #f0b3ab', background: 'var(--red-pale)', color: 'var(--red)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit modal */}
      {(modal === 'add' || modal === 'edit') && (
        <AdminModal
          title={modal === 'add' ? 'Add Guard Account' : `Edit — ${selected?.full_name}`}
          onClose={() => setModal(null)} onSubmit={handleSave} loading={saving}
          submitLabel={modal === 'add' ? 'Create Guard' : 'Save Changes'}>

          <Field label="Full Name">
            <TextInput value={form.full_name} onChange={v => setForm(p => ({ ...p, full_name: v }))} placeholder="e.g. Juan dela Cruz" required />
          </Field>
          <Field label="Username">
            <TextInput value={form.username} onChange={v => setForm(p => ({ ...p, username: v }))} placeholder="e.g. guard_backgate" required />
          </Field>
          <Field label={modal === 'edit' ? 'New Password (leave blank to keep current)' : 'Password'}>
            <TextInput type="password" value={form.password} onChange={v => setForm(p => ({ ...p, password: v }))} placeholder={modal === 'edit' ? 'Leave blank to keep current' : 'Min. 6 characters'} required={modal === 'add'} />
          </Field>

          {/* Multi-lot picker */}
          <Field label="Assigned Parking Lots">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {lots.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>No parking lots found. Add lots in the Parking section first.</div>
              )}
              {lots.map(lot => {
                const checked = chosenLots.includes(lot.id)
                return (
                  <button key={lot.id} type="button" onClick={() => toggleLot(lot.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 10,
                    border: `1.5px solid ${checked ? 'var(--maroon-light)' : 'var(--border)'}`,
                    background: checked ? 'var(--maroon-pale)' : 'var(--surface2)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  }}>
                    {/* Checkbox */}
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                      border: `2px solid ${checked ? 'var(--maroon)' : 'var(--border2)'}`,
                      background: checked ? 'var(--maroon)' : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                      {checked && <Check size={12} color="white" strokeWidth={3} />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                      <Car size={14} color={checked ? 'var(--maroon)' : 'var(--muted)'} />
                      <span style={{ fontSize: 13.5, fontWeight: checked ? 600 : 400, color: checked ? 'var(--maroon)' : 'var(--text)' }}>
                        {lot.lot_name}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </Field>

          <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: '8px 12px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            Guards can access all assigned lots and switch between them. They can mark spots Available or Occupied with one tap.
          </div>
        </AdminModal>
      )}

      {modal === 'delete' && selected && (
        <ConfirmDelete name={selected.full_name} onConfirm={handleDelete} onCancel={() => setModal(null)} loading={saving} />
      )}
    </>
  )
}
