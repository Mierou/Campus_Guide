'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import { GraduationCap, Eye, EyeOff, ArrowRight, MapPin, Car, Navigation, BarChart3 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { setUser } = useSession()
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [newUser, setNewUser] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (!username || !password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('users').select('id, username, full_name, role, password').eq('username', username).single()
      if (err || !data) { setError('Incorrect username or password.') }
      else if (data.password !== password) { setError('Incorrect username or password.') }
      else { const { password: _, ...safeUser } = data; setUser(safeUser as any); router.push('/home') }
    } catch { setError('Connection error. Please check your Supabase settings.') }
    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (!fullName) { setError('Please enter your full name.'); return }
    if (newUser.length < 4) { setError('Username must be at least 4 characters.'); return }
    if (newPw.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (newPw !== confirmPw) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      const { data: existing } = await supabase.from('users').select('id').eq('username', newUser).single()
      if (existing) { setError('Username already taken.'); setLoading(false); return }
      const { error: err } = await supabase.from('users').insert({ username: newUser, password: newPw, full_name: fullName, role: 'User' })
      if (err) { setError('Could not create account. Try a different username.') }
      else { alert(`Account created! Sign in as "${newUser}".`); setTab('login'); setUsername(newUser) }
    } catch { setError('Connection error.') }
    setLoading(false)
  }

  const features = [
    { icon: MapPin,     text: 'Interactive satellite campus map' },
    { icon: Car,        text: 'Real-time parking spot status' },
    { icon: Navigation, text: 'Walking directions between locations' },
    { icon: BarChart3,  text: 'Admin analytics dashboard' },
  ]

  return (
    <>

      <div className="login-wrap">
        {/* Left panel — desktop only */}
        <div className="login-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={20} color="white" />
            </div>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>Campus Guide</span>
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Campus Navigation System</div>
            <h1 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 40, color: 'white', lineHeight: 1.15, marginBottom: 20 }}>
              Navigate your campus with confidence.
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.7, marginBottom: 36 }}>
              Find buildings, check live parking, get directions, and explore campus facilities — all in one place.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {features.map(({ icon: Icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.7)', fontSize: 13.5 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} color="rgba(255,255,255,0.8)" />
                  </div>
                  {text}
                </div>
              ))}
            </div>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>© 2026 Campus Guide & Parking System</div>
        </div>

        {/* Right panel */}
        <div className="login-right">
          <div className="login-form-box fade-up">
            {/* Mobile logo */}
            {isMobile && <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--maroon)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GraduationCap size={20} color="white" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--maroon)' }}>Campus Guide</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Navigation & Parking System</div>
              </div>
            </div>}

            {/* Heading */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'Instrument Serif, serif', fontSize: 28, color: 'var(--dark)', marginBottom: 4 }}>
                {tab === 'login' ? 'Welcome back' : 'Create account'}
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>
                {tab === 'login' ? 'Sign in to access the campus system' : 'Join the campus navigation system'}
              </p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', background: '#ede8e0', borderRadius: 12, padding: 4, marginBottom: 22 }}>
              {(['login', 'signup'] as const).map(t => (
                <button key={t} onClick={() => { setTab(t); setError('') }} style={{
                  flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.18s',
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
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Username</label>
                  <input className="inp" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username" autoComplete="username" style={{ fontSize: 15 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input className="inp" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" style={{ paddingRight: 42, fontSize: 15 }} />
                    <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', padding: 4 }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 2, padding: '12px 0', fontSize: 15, opacity: loading ? 0.7 : 1, borderRadius: 12 }}>
                  {loading ? 'Signing in…' : <><span>Sign In</span><ArrowRight size={16} /></>}
                </button>
                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted2)', padding: '10px 14px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  Demo: <strong style={{ color: 'var(--text)' }}>admin / admin123</strong> · <strong style={{ color: 'var(--text)' }}>student / student123</strong>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Full Name',        val: fullName,  set: setFullName,  ph: 'Your full name',       type: 'text' },
                  { label: 'Username',          val: newUser,   set: setNewUser,   ph: 'Min. 4 characters',    type: 'text' },
                  { label: 'Password',          val: newPw,     set: setNewPw,     ph: 'Min. 6 characters',    type: showPw ? 'text' : 'password' },
                  { label: 'Confirm Password',  val: confirmPw, set: setConfirmPw, ph: 'Repeat your password', type: showPw ? 'text' : 'password' },
                ].map(({ label, val, set, ph, type }) => (
                  <div key={label}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</label>
                    <input className="inp" type={type} value={val} onChange={e => set(e.target.value)} placeholder={ph} style={{ fontSize: 15 }} />
                  </div>
                ))}
                <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 2, padding: '12px 0', fontSize: 15, opacity: loading ? 0.7 : 1, borderRadius: 12 }}>
                  {loading ? 'Creating…' : <><span>Create Account</span><ArrowRight size={16} /></>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
