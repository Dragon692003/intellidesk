import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, ShieldCheck, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { userService } from '../services/userService'
import { useAuthStore } from '../store/authStore'

export default function UsersPage() {
  const qc = useQueryClient()
  const { user: currentUser, setUser } = useAuthStore()

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: userService.getUsers,
  })

  const normalUsers = users.filter((u) => u.role === 'user')

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }) => userService.changeRole(userId, role),
    onSuccess: (_, variables) => {
      toast.success('Role updated')
      qc.invalidateQueries({ queryKey: ['all-users'] })
      qc.invalidateQueries({ queryKey: ['agents'] })
      if (currentUser?.id === variables.userId) {
        setUser({ ...currentUser, role: variables.role })
      }
    },
  })

  const roleColor = {
    admin: 'bg-red-100 text-red-700',
    agent: 'bg-brand-100 text-brand-700',
    user: 'bg-gray-100 text-gray-600',
  }
  const roleIcon = { admin: ShieldCheck, agent: Users, user: User }

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold">Users ({normalUsers.length})</h3>
          <p className="text-sm text-gray-500 mt-1">Normal users who can create and track their own tickets.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Current Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Change Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-400">
                    Loading users...
                  </td>
                </tr>
              ) : normalUsers.length ? (
                normalUsers.map((u) => {
                  const Icon = roleIcon[u.role] || User
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
                            {u.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span className="font-medium text-gray-900">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-500">{u.email}</td>
                      <td className="px-4 py-4">
                        <span className={`badge ${roleColor[u.role]}`}>
                          <Icon size={12} className="mr-1" />
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          className="input w-auto text-xs py-1"
                          value={u.role}
                          onChange={(e) => roleMutation.mutate({ userId: u.id, role: e.target.value })}
                        >
                          <option value="user">user</option>
                          <option value="agent">agent</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-400">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
