import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Ticket, PlusCircle, Users, UserCircle,
  Bot,
  LogOut, Zap, ListFilter
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import clsx from 'clsx'

const navItem = (to, icon, label) => ({ to, icon, label })

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const isAdmin = user?.role === 'admin'
  const isAgent = user?.role === 'agent' || isAdmin

  const links = [
    ...(isAgent ? [navItem('/dashboard', LayoutDashboard, 'Dashboard')] : []),
    navItem('/assistant', Bot, 'AI Assistant'),
    ...(isAgent ? [navItem('/tickets', ListFilter, isAdmin ? 'All Tickets' : 'Assigned Tickets')] : []),
    ...(!isAgent ? [navItem('/tickets/my', Ticket, 'My Tickets')] : []),
    navItem('/tickets/new', PlusCircle, 'New Ticket'),
    ...(isAdmin ? [navItem('/users', Users, 'Users')] : []),
    ...(isAdmin ? [navItem('/agents', Users, 'Agents')] : []),
    navItem('/profile', UserCircle, 'Profile'),
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="w-64 bg-brand-900 text-white flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-brand-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">IntelliDesk</h1>
            <p className="text-brand-100 text-xs capitalize">{user?.role} Portal</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-brand-100 hover:bg-brand-700 hover:text-white'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-brand-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-sm font-bold">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-brand-300 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-brand-100 hover:bg-red-600 hover:text-white transition-all"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
