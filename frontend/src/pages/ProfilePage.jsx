import { useAuthStore } from '../store/authStore'
import { ShieldCheck, Mail, User } from 'lucide-react'

export default function ProfilePage() {
  const { user } = useAuthStore()

  return (
    <div className="max-w-lg mx-auto">
      <div className="card p-8 text-center">
        <div className="w-20 h-20 bg-brand-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
        <p className="text-gray-500 mb-6">{user?.email}</p>

        <div className="grid grid-cols-1 gap-3 text-left">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <User size={18} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Full Name</p>
              <p className="text-sm font-medium">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Mail size={18} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Email Address</p>
              <p className="text-sm font-medium">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <ShieldCheck size={18} className="text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Role</p>
              <p className="text-sm font-medium capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
