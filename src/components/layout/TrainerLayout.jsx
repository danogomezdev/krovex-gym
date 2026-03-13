import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LayoutDashboard, Zap, LogOut } from 'lucide-react'
import './TrainerLayout.css'

export default function TrainerLayout() {
  const { staffUser, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="trainer-layout">
      <aside className="trainer-sidebar">
        <div className="trainer-logo">
          <div className="sidebar-logo-icon">K</div>
          <div>
            <div className="sidebar-logo-name">KROVEX</div>
            <div className="sidebar-logo-sub">ENTRENADOR</div>
          </div>
        </div>

        <nav className="trainer-nav">
          <NavLink to="/trainer" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            <span>Mis Clases</span>
          </NavLink>
        </nav>

        <div className="trainer-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {(staffUser?.nombre?.[0] || 'E').toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{staffUser?.nombre} {staffUser?.apellido}</div>
              <div className="sidebar-user-role">Entrenador</div>
            </div>
          </div>
          <button className="nav-item nav-item-logout" onClick={handleSignOut}>
            <LogOut size={20} />
            <span>Salir</span>
          </button>
        </div>
      </aside>

      <main className="trainer-main">
        <Outlet />
      </main>
    </div>
  )
}
