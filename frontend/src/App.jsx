import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import TicketsPage from './pages/TicketsPage'
import TicketDetailPage from './pages/TicketDetailPage'
import CreateTicketPage from './pages/CreateTicketPage'
import UsersPage from './pages/UsersPage'
import AgentsPage from './pages/AgentsPage'
import ProfilePage from './pages/ProfilePage'
import AssistantPage from './pages/AssistantPage'

function getHomeRoute(role) {
  return role === 'user' ? '/tickets/my' : '/dashboard'
}

function PrivateRoute({ children, roles }) {
  const { user, token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user?.role)) return <Navigate to="/tickets/my" replace />
  return children
}

export default function App() {
  const { token, user } = useAuthStore()

  return (
    <Routes>
      <Route path="/login" element={!token ? <LoginPage /> : <Navigate to={getHomeRoute(user?.role)} replace />} />
      <Route path="/register" element={!token ? <RegisterPage /> : <Navigate to={getHomeRoute(user?.role)} replace />} />

      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to={getHomeRoute(user?.role)} replace />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="dashboard" element={
          <PrivateRoute roles={['admin', 'agent']}><DashboardPage /></PrivateRoute>
        } />
        <Route path="tickets" element={
          <PrivateRoute roles={['admin', 'agent']}><TicketsPage /></PrivateRoute>
        } />
        <Route path="tickets/my" element={<TicketsPage myOnly />} />
        <Route path="tickets/new" element={<CreateTicketPage />} />
        <Route path="tickets/:id" element={<TicketDetailPage />} />
        <Route path="users" element={
          <PrivateRoute roles={['admin']}><UsersPage /></PrivateRoute>
        } />
        <Route path="agents" element={
          <PrivateRoute roles={['admin']}><AgentsPage /></PrivateRoute>
        } />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
