'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Store,
  Puzzle,
  Settings,
  type LucideIcon,
} from 'lucide-react'

const mainLinks = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/stores', label: 'Stores', icon: Store },
]

const bottomLinks = [
  { href: '/integrations', label: 'Integrations', icon: Puzzle },
  { href: '/settings', label: 'Settings', icon: Settings },
]

function NavLink({ href, label, icon: Icon, isActive }: {
  href: string
  label: string
  icon: LucideIcon
  isActive: boolean
}) {
  return (
    <Link
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
}

export default function Nav() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav className="flex h-full flex-col px-3">
      <div className="flex flex-col gap-1">
        {mainLinks.map((link) => (
          <NavLink key={link.href} {...link} isActive={isActive(link.href)} />
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-1 pb-4">
        {bottomLinks.map((link) => (
          <NavLink key={link.href} {...link} isActive={isActive(link.href)} />
        ))}
      </div>
    </nav>
  )
}
