import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Users, CreditCard, DollarSign, Calendar,
  Clock, Dumbbell, ListChecks, Activity, Ruler, QrCode,
  Package, Bell, BarChart2, Settings, LogOut, Menu, X,
  ChevronLeft, Zap, ShieldCheck
} from 'lucide-react'
import './AdminLayout.css'

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/members', label: 'Miembros', icon: Users },
  { path: '/admin/plans', label: 'Planes', icon: CreditCard },
  { path: '/admin/payments', label: 'Pagos', icon: DollarSign },
  { path: '/admin/cash', label: 'Caja', icon: DollarSign },
  { path: '/admin/checkin', label: 'Check-in', icon: QrCode },
  { path: '/admin/classes', label: 'Clases', icon: Zap },
  { path: '/admin/schedule', label: 'Horarios', icon: Clock },
  { path: '/admin/trainers', label: 'Entrenadores', icon: Users },
  { path: '/admin/routines', label: 'Rutinas', icon: ListChecks },
  { path: '/admin/exercises', label: 'Ejercicios', icon: Dumbbell },
  { path: '/admin/measurements', label: 'Medidas', icon: Ruler },
  { path: '/admin/inventory', label: 'Inventario', icon: Package },
  { path: '/admin/communications', label: 'Comunicaciones', icon: Bell },
  { path: '/admin/reports', label: 'Reportes', icon: BarChart2 },
  { path: '/admin/staff', label: 'Usuarios', icon: ShieldCheck },
  { path: '/admin/settings', label: 'Configuración', icon: Settings },
]

export default function AdminLayout() {
  const { staffUser, signOut } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className={`admin-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          {!collapsed && (
            <div className="sidebar-logo">
              <div className="sidebar-logo-icon">K</div>
              <div>
                <div className="sidebar-logo-name">KROVEX</div>
                <div className="sidebar-logo-sub">GYM SYSTEM</div>
              </div>
            </div>
          )}
          {collapsed && <div className="sidebar-logo-icon">K</div>}

          <button className="sidebar-collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            <ChevronLeft size={16} className={collapsed ? 'rotated' : ''} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ path, label, icon: Icon, exact }) => (
            <NavLink
              key={path}
              to={path}
              end={exact}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
            >
              <Icon size={20} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!collapsed && (
            <div className="sidebar-user">
              <div className="sidebar-user-avatar">
                {(staffUser?.nombre?.[0] || 'A').toUpperCase()}
              </div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">
                  {staffUser?.nombre} {staffUser?.apellido}
                </div>
                <div className="sidebar-user-role">{staffUser?.rol}</div>
              </div>
            </div>
          )}
          <button className="nav-item nav-item-logout" onClick={handleSignOut} title={collapsed ? 'Cerrar sesión' : undefined}>
            <LogOut size={20} />
            {!collapsed && <span>Salir</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="admin-main">
        <header className="admin-header">
          <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="admin-header-right">
            <span className="header-greeting">
              Hola, <strong>{staffUser?.nombre || 'Admin'}</strong>
            </span>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
