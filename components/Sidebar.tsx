'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from '@/lib/session'
import { MapPin, Building2, Wrench, Navigation, Car, BarChart3, LogOut, GraduationCap } from 'lucide-react'

const navItems = [
  { href: '/home',       label: 'Campus Map',  icon: MapPin },
  { href: '/buildings',  label: 'Buildings',   icon: Building2 },
  { href: '/facilities', label: 'Facilities',  icon: Wrench },
  { href: '/routes',     label: 'Routes',      icon: Navigation },
  { href: '/parking',    label: 'Parking',     icon: Car },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { user, logout } = useSession()

  const initials = user?.full_name
    ? user.full_name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : 'G'

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.13)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={17} color="white" />
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>Campus</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 500, fontSize: 11.5 }}>Guide & Parking</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', padding: '6px 10px 8px', textTransform: 'uppercase' }}>
          Navigate
        </div>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 9,
              background: active ? 'rgba(255,255,255,0.13)' : 'transparent',
              color: active ? 'white' : 'rgba(255,255,255,0.55)',
              fontSize: 13.5, fontWeight: active ? 600 : 500,
              textDecoration: 'none', transition: 'all 0.15s',
            }}
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)' } }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)' } }}
            >
              <Icon size={15} />
              {label}
            </Link>
          )
        })}

        {user?.role === 'Admin' && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', padding: '14px 10px 8px', textTransform: 'uppercase' }}>
              Admin
            </div>
            <Link href="/analytics" style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 9,
              background: pathname === '/analytics' ? 'rgba(255,255,255,0.13)' : 'transparent',
              color: pathname === '/analytics' ? 'white' : 'rgba(255,255,255,0.55)',
              fontSize: 13.5, fontWeight: pathname === '/analytics' ? 600 : 500,
              textDecoration: 'none', transition: 'all 0.15s',
            }}>
              <BarChart3 size={15} />
              Analytics
            </Link>
          </>
        )}
      </nav>

      {/* User */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.06)', marginBottom: 4 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'white', fontWeight: 600, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.full_name ?? 'Guest'}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{user?.role ?? 'User'}</div>
          </div>
        </div>
        <button onClick={() => { logout(); router.push('/') }} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 12px', borderRadius: 8, border: 'none',
          background: 'transparent', color: 'rgba(255,255,255,0.38)',
          fontSize: 12.5, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,80,80,0.13)'; (e.currentTarget as HTMLElement).style.color = '#ff9090' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.38)' }}
        >
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </aside>
  )
}
