import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Home, Calendar, ListChecks, TrendingUp, User, LogOut } from 'lucide-react'
import './MemberLayout.css'

const navItems = [
  { path: '/member', label: 'Inicio', icon: Home, exact: true },
  { path: '/member/classes', label: 'Clases', icon: Calendar },
  { path: '/member/routine', label: 'Rutina', icon: ListChecks },
  { path: '/member/progress', label: 'Progreso', icon: TrendingUp },
  { path: '/member/profile', label: 'Perfil', icon: User },
]

export default function MemberLayout() {
  const { member, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="member-layout">
      {/* Top header */}
      <header className="member-header">
        <div className="member-header-logo">
          <div className="member-logo-icon">K</div>
          <span>KROVEX GYM</span>
        </div>
        <div className="member-header-user">
          <span className="member-header-name">
            {member?.nombre}
          </span>
          <button className="btn-icon" onClick={handleSignOut} title="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="member-content">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="member-bottom-nav">
        {navItems.map(({ path, label, icon: Icon, exact }) => (
          <NavLink
            key={path}
            to={path}
            end={exact}
            className={({ isActive }) => `member-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
