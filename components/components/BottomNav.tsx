'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from '@/lib/session'
import { MapPin, Building2, Wrench, Navigation, Car, BarChart3 } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()
  const { user } = useSession()

  const items = [
    { href: '/home',       label: 'Map',       icon: MapPin },
    { href: '/buildings',  label: 'Buildings', icon: Building2 },
    { href: '/facilities', label: 'Facilities',icon: Wrench },
    { href: '/routes',     label: 'Routes',    icon: Navigation },
    { href: '/parking',    label: 'Parking',   icon: Car },
    ...(user?.role === 'Admin' ? [{ href: '/analytics', label: 'Analytics', icon: BarChart3 }] : []),
  ]

  return (
    <nav className="bottom-nav">
      {items.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={`bottom-nav-item ${pathname === href ? 'active' : ''}`}>
          <Icon size={18} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  )
}
