'use client'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

type Props = {
  title: string
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  loading?: boolean
  submitLabel?: string
  children: React.ReactNode
  danger?: boolean
}

export default function AdminModal({ title, onClose, onSubmit, loading, submitLabel = 'Save', children, danger }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div ref={overlayRef} onClick={e => { if (e.target === overlayRef.current) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="fade-up" style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'white', zIndex: 1, borderRadius: '18px 18px 0 0' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--dark)' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, borderRadius: 8, display: 'flex', alignItems: 'center' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={onSubmit}>
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {children}
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: 'white', borderRadius: '0 0 18px 18px' }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ fontSize: 13.5 }}>Cancel</button>
            <button type="submit" disabled={loading} style={{
              padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: danger ? 'var(--red)' : 'var(--maroon)',
              color: 'white', fontWeight: 700, fontSize: 13.5,
              fontFamily: 'inherit', opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s',
            }}>
              {loading ? 'Saving…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Reusable field components
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  )
}

export function TextInput({ value, onChange, placeholder, required, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; type?: string }) {
  return (
    <input className="inp" type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} required={required} style={{ fontSize: 14 }} />
  )
}

export function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select className="inp" value={value} onChange={e => onChange(e.target.value)} style={{ fontSize: 14, cursor: 'pointer' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

export function ToggleInput({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
      <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
      <button type="button" onClick={() => onChange(!value)} style={{
        width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer',
        background: value ? 'var(--green)' : '#cbd5e1', transition: 'background 0.2s', position: 'relative',
      }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: value ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  )
}

export function ConfirmDelete({ name, onConfirm, onCancel, loading }: { name: string; onConfirm: () => void; onCancel: () => void; loading?: boolean }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="fade-up" style={{ background: 'white', borderRadius: 16, padding: 28, maxWidth: 360, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--red-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <X size={24} color="var(--red)" />
        </div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Delete "{name}"?</div>
        <div style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 22 }}>This action cannot be undone.</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onCancel} className="btn-ghost" style={{ fontSize: 13.5, flex: 1 }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', background: 'var(--red)', color: 'white', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
