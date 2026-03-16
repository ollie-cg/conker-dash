'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  Store,
  Gauge,
  Target,
  AlertTriangle,
} from 'lucide-react'

const links = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/sales', label: 'Sales', icon: TrendingUp },
  { href: '/distribution', label: 'Distribution', icon: Store },
  { href: '/ros', label: 'Rate of Sale', icon: Gauge },
  { href: '/performance', label: 'vs Plan', icon: Target },
  { href: '/risks', label: 'Risks & Opps', icon: AlertTriangle },
]

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 px-3">
      {links.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href

        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'border-l-2 border-sky-400 bg-slate-800 text-white'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
