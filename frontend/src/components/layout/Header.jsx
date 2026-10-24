import { useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

const titles = {
  '/dashboard': 'Dashboard',
  '/assistant': 'AI Assistant',
  '/tickets': 'All Tickets',
  '/tickets/my': 'My Tickets',
  '/tickets/new': 'Create Ticket',
  '/users': 'Users',
  '/agents': 'Agents',
  '/profile': 'Profile',
}

export default function Header() {
  const { pathname } = useLocation()
  const { user } = useAuthStore()

  const title = Object.entries(titles).find(([p]) => pathname.startsWith(p))?.[1] || 'IntelliDesk'

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell size={18} className="text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
          {user?.name?.[0]?.toUpperCase()}
        </div>
      </div>
    </header>
  )
}
