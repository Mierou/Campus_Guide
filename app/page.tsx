'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session'
import { GraduationCap, Eye, EyeOff, ArrowRight } from 'lucide-react'

const DEMO_USERS = [
  { id: 1, username: 'admin',   full_name: 'Admin User',     role: 'Admin' as const },
  { id: 2, username: 'student', full_name: 'Juan dela Cruz', role: 'User'  as const },
]
const DEMO_PW: Record<string, string> = { admin: 'admin123', student: 'student123' }

export default function LoginPage() {
  const router   = useRouter()
  const { setUser } = useSession()
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [showPw, setShowPw]   = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [newUser, setNewUser]   = useState('')
  const [newPw, setNewPw]       = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (!username || !password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 350))
    const user = DEMO_USERS.find(u => u.username === username && DEMO_PW[u.username] === password)
    if (user) { setUser(user); router.push('/home') }
    else setError('Incorrect username or password.')
    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (!fullName) { setError('Please enter your full name.'); return }
    if (newUser.length < 4) { setError('Username must be at least 4 characters.'); return }
    if (newPw.length < 6)   { setError('Password must be at least 6 characters.'); return }
    if (newPw !== confirmPw) { setError('Passwords do not match.'); return }
    alert(`Account created! Log in as "${newUser}". (Connect Supabase for real persistence.)`)
    setTab('login'); setUsername(newUser)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--cream)' }}>
      {/* Left branding panel */}
      <div style={{ width: 420, flexShrink: 0, background: 'var(--maroon-dark)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px 44px' }} className="hidden lg:flex">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={20} color="white" />
          </div>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>Campus Guide</span>
        </div>

        <div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Campus Navigation System</div>
          <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 42, color: 'white', lineHeight: 1.15, marginBottom: 20 }}>
            Navigate your campus with confidence.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14.5, lineHeight: 1.7, marginBottom: 40 }}>
            Find buildings, check live parking availability, get walking directions, and explore campus facilities — all in one elegant interface.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              ['🗺️', 'Interactive satellite campus map'],
              ['🚗', 'Real-time parking spot status'],
              ['🧭', 'Walking directions between locations'],
              ['📊', 'Admin analytics dashboard'],
            ].map(([icon, text]) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.7)', fontSize: 13.5 }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                {text}
              </div>
            ))}
          </div>
        </div>

        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>© 2025 Campus Guide & Parking System</div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ width: '100%', maxWidth: 380 }} className="fade-up">
          {/* Mobile logo */}
          <div className="lg:hidden" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--maroon)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={18} color="white" />
            </div>
            <span style={{ color: 'var(--maroon)', fontWeight: 700, fontSize: 15 }}>Campus Guide</span>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 28, color: 'var(--dark)', marginBottom: 4 }}>
              {tab === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>
              {tab === 'login' ? 'Sign in to access the campus system' : 'Join the campus navigation system'}
            </p>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', background: '#ede8e0', borderRadius: 12, padding: 4, marginBottom: 24 }}>
            {(['login', 'signup'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError('') }} style={{
                flex: 1, padding: '8px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontSize: 13.5, fontWeight: 600, transition: 'all 0.18s',
                background: tab === t ? 'white' : 'transparent',
                color: tab === t ? 'var(--maroon)' : 'var(--muted)',
                boxShadow: tab === t ? '0 1px 6px rgba(0,0,0,0.09)' : 'none',
              }}>
                {t === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'var(--red-pale)', color: 'var(--red)', fontSize: 13, border: '1px solid #f5c0bb', fontWeight: 500 }}>
              {error}
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, letterSpacing: '0.03em' }}>USERNAME</label>
                <input className="inp" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username" autoComplete="username" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, letterSpacing: '0.03em' }}>PASSWORD</label>
                <div style={{ position: 'relative' }}>
                  <input className="inp" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" style={{ paddingRight: 40 }} autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)' }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4, padding: '11px 0', fontSize: 14, opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Signing in…' : <><span>Sign In</span><ArrowRight size={15} /></>}
              </button>
              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted2)', marginTop: 4, padding: '10px 14px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                Demo: <strong style={{ color: 'var(--text)' }}>admin / admin123</strong> &nbsp;·&nbsp; <strong style={{ color: 'var(--text)' }}>student / student123</strong>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'FULL NAME',        val: fullName,  set: setFullName,  ph: 'Your full name',        type: 'text' },
                { label: 'USERNAME',          val: newUser,   set: setNewUser,   ph: 'Min. 4 characters',     type: 'text' },
                { label: 'PASSWORD',          val: newPw,     set: setNewPw,     ph: 'Min. 6 characters',     type: showPw ? 'text' : 'password' },
                { label: 'CONFIRM PASSWORD',  val: confirmPw, set: setConfirmPw, ph: 'Repeat your password',  type: showPw ? 'text' : 'password' },
              ].map(({ label, val, set, ph, type }) => (
                <div key={label}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, letterSpacing: '0.03em' }}>{label}</label>
                  <input className="inp" type={type} value={val} onChange={e => set(e.target.value)} placeholder={ph} />
                </div>
              ))}
              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4, padding: '11px 0', fontSize: 14 }}>
                Create Account <ArrowRight size={15} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
