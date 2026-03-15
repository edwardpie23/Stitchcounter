import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FolderOpen, Hash, BookOpen, Layers, X } from 'lucide-react'

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/counters', icon: Hash, label: 'Quick Counter' },
  { to: '/patterns', icon: BookOpen, label: 'Patterns' },
  { to: '/stash', icon: Layers, label: 'Yarn Stash' },
]

interface SidebarProps {
  mobile?: boolean
  onClose?: () => void
}

export default function Sidebar({ mobile, onClose }: SidebarProps) {
  return (
    <aside className={`flex flex-col h-full ${mobile ? '' : 'w-64'}`}>
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center">
            <span className="text-white text-base font-bold">S</span>
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
            Stitch<span className="text-brand-600">Counter</span>
          </span>
        </div>
        {mobile && (
          <button onClick={onClose} className="btn-ghost rounded-lg p-1">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 pb-4 space-y-0.5">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={mobile ? onClose : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs text-gray-400 dark:text-gray-600">StitchCounter v1.0</p>
      </div>
    </aside>
  )
}
