import { Link, useLocation } from 'react-router-dom'
import { MapPin, BarChart2, Navigation, Shield } from 'lucide-react'
import { clsx } from 'clsx'

const navLinks = [
  { to: '/',          label: 'Map',       icon: MapPin },
  { to: '/route',     label: 'Routes',    icon: Navigation },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart2 },
  { to: '/admin',     label: 'Admin',     icon: Shield },
]

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav className="fixed top-0 left-0 right-0 z-[1000] glass border-b border-road-border">
      <div className="flex items-center justify-between px-4 h-14 max-w-screen-2xl mx-auto">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <span className="text-white text-sm font-display font-bold">S</span>
          </div>
          <span className="font-display font-bold text-lg leading-none">
            Street<span className="text-gradient">Info</span>Hub
          </span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-1">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-body font-medium transition-colors',
                  pathname === to
                    ? 'bg-brand-500/15 text-brand-400'
                    : 'text-road-muted hover:text-white hover:bg-road-border',
                )}
              >
                <Icon size={15} />
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Live badge */}
        <div className="flex items-center gap-2 text-xs font-mono text-road-muted">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-dot" />
          India
        </div>
      </div>

      {/* Mobile bottom bar */}
      <ul className="md:hidden flex border-t border-road-border">
        {navLinks.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className={clsx(
                'flex flex-col items-center gap-0.5 py-2 text-[10px] font-body transition-colors',
                pathname === to ? 'text-brand-400' : 'text-road-muted',
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
