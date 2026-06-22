'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from '@/lib/session'
import { MapPin, Building2, Wrench, Navigation, Car, BarChart3, LogOut } from 'lucide-react'

export default function BottomNav() {
  const pathname  = usePathname()
  const router    = useRouter()
  const { user, logout } = useSession()

  const items = [
    { href: '/home',       label: 'Map',        icon: MapPin },
    { href: '/buildings',  label: 'Buildings',  icon: Building2 },
    { href: '/facilities', label: 'Facilities', icon: Wrench },
    { href: '/routes',     label: 'Routes',     icon: Navigation },
    { href: '/parking',    label: 'Parking',    icon: Car },
    ...(user?.role === 'Admin' ? [{ href: '/analytics', label: 'Analytics', icon: BarChart3 }] : []),
  ]

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <nav className="bottom-nav">
      {items.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={`bottom-nav-item ${pathname === href ? 'active' : ''}`}>
          <Icon size={18} />
          <span>{label}</span>
        </Link>
      ))}

      {/* Logout button */}
      <button
        onClick={handleLogout}
        className="bottom-nav-item"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <LogOut size={18} />
        <span>Logout</span>
      </button>
    </nav>
  )
}
