import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Layouts
import AdminLayout from './components/layout/AdminLayout'
import TrainerLayout from './components/layout/TrainerLayout'
import MemberLayout from './components/layout/MemberLayout'

// Pages
import LoginPage from './pages/LoginPage'

// Admin pages
import DashboardPage from './pages/admin/DashboardPage'
import MembersPage from './pages/admin/MembersPage'
import MemberDetailPage from './pages/admin/MemberDetailPage'
import NewMemberPage from './pages/admin/NewMemberPage'
import PlansPage from './pages/admin/PlansPage'
import PaymentsPage from './pages/admin/PaymentsPage'
import CashRegisterPage from './pages/admin/CashRegisterPage'
import ClassesPage from './pages/admin/ClassesPage'
import SchedulePage from './pages/admin/SchedulePage'
import TrainersPage from './pages/admin/TrainersPage'
import RoutinesPage from './pages/admin/RoutinesPage'
import ExercisesPage from './pages/admin/ExercisesPage'
import MeasurementsPage from './pages/admin/MeasurementsPage'
import CheckInPage from './pages/admin/CheckInPage'
import InventoryPage from './pages/admin/InventoryPage'
import CommunicationsPage from './pages/admin/CommunicationsPage'
import ReportsPage from './pages/admin/ReportsPage'
import StaffUsersPage from './pages/admin/StaffUsersPage'
import SettingsPage from './pages/admin/SettingsPage'

// Trainer pages
import TrainerDashboardPage from './pages/trainer/TrainerDashboardPage'
import TrainerClassPage from './pages/trainer/TrainerClassPage'

// Member pages
import MemberDashboardPage from './pages/member/MemberDashboardPage'
import MemberClassesPage from './pages/member/MemberClassesPage'
import MemberRoutinePage from './pages/member/MemberRoutinePage'
import MemberProgressPage from './pages/member/MemberProgressPage'
import MemberProfilePage from './pages/member/MemberProfilePage'

function AppRoutes() {
  const { user, staffUser, member, loading, isTrainer } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div className="spinner" style={{ width: 48, height: 48 }} />
        <p style={{ color: 'var(--color-text-muted)', fontFamily: 'DM Sans, sans-serif' }}>Cargando Krovex Gym...</p>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public login */}
      <Route path="/login" element={
        user ? <Navigate to="/admin" replace /> :
        member ? <Navigate to="/member" replace /> :
        <LoginPage />
      } />

      {/* Public schedule */}
      <Route path="/horarios" element={<SchedulePage public />} />

      {/* Admin routes */}
      <Route path="/admin" element={
        user ? <AdminLayout /> : <Navigate to="/login" replace />
      }>
        <Route index element={<DashboardPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="members/new" element={<NewMemberPage />} />
        <Route path="members/:id" element={<MemberDetailPage />} />
        <Route path="members/:id/edit" element={<NewMemberPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="cash" element={<CashRegisterPage />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="trainers" element={<TrainersPage />} />
        <Route path="routines" element={<RoutinesPage />} />
        <Route path="exercises" element={<ExercisesPage />} />
        <Route path="measurements" element={<MeasurementsPage />} />
        <Route path="checkin" element={<CheckInPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="communications" element={<CommunicationsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="staff" element={<StaffUsersPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Trainer routes */}
      <Route path="/trainer" element={
        user && isTrainer ? <TrainerLayout /> : <Navigate to="/login" replace />
      }>
        <Route index element={<TrainerDashboardPage />} />
        <Route path="class/:id" element={<TrainerClassPage />} />
      </Route>

      {/* Member routes */}
      <Route path="/member" element={
        member ? <MemberLayout /> : <Navigate to="/login" replace />
      }>
        <Route index element={<MemberDashboardPage />} />
        <Route path="classes" element={<MemberClassesPage />} />
        <Route path="routine" element={<MemberRoutinePage />} />
        <Route path="progress" element={<MemberProgressPage />} />
        <Route path="profile" element={<MemberProfilePage />} />
      </Route>

      {/* Redirect root */}
      <Route path="/" element={
        user ? <Navigate to="/admin" replace /> :
        member ? <Navigate to="/member" replace /> :
        <Navigate to="/login" replace />
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
