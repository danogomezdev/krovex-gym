import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDate, membershipStatusBadge, membershipStatusLabel } from '../../utils/helpers'
import {
  Users, DollarSign, TrendingUp, AlertCircle,
  QrCode, Calendar, UserPlus, Clock
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts'
import './DashboardPage.css'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [recentPayments, setRecentPayments] = useState([])
  const [expiringMembers, setExpiringMembers] = useState([])
  const [monthlyRevenue, setMonthlyRevenue] = useState([])
  const [todayAttendance, setTodayAttendance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadStats(),
        loadRecentPayments(),
        loadExpiringMembers(),
        loadMonthlyRevenue(),
        loadTodayAttendance()
      ])
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    const { data } = await supabase.rpc('get_gym_stats')
    if (data) setStats(data)
  }

  const loadRecentPayments = async () => {
    const { data } = await supabase
      .from('payments')
      .select('*, members(nombre, apellido, numero_socio)')
      .order('created_at', { ascending: false })
      .limit(5)
    if (data) setRecentPayments(data)
  }

  const loadExpiringMembers = async () => {
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    const { data } = await supabase
      .from('memberships')
      .select('*, members(nombre, apellido, numero_socio, telefono)')
      .eq('estado', 'activo')
      .lte('fecha_vencimiento', sevenDaysFromNow.toISOString().split('T')[0])
      .gte('fecha_vencimiento', new Date().toISOString().split('T')[0])
      .order('fecha_vencimiento')
      .limit(8)
    if (data) setExpiringMembers(data)
  }

  const loadMonthlyRevenue = async () => {
    // Last 6 months revenue
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const year = d.getFullYear()
      const month = d.getMonth() + 1
      const { data } = await supabase
        .from('payments')
        .select('monto')
        .eq('estado', 'pagado')
        .gte('created_at', `${year}-${String(month).padStart(2, '0')}-01`)
        .lt('created_at', month < 12
          ? `${year}-${String(month + 1).padStart(2, '0')}-01`
          : `${year + 1}-01-01`)
      const total = (data || []).reduce((sum, p) => sum + Number(p.monto), 0)
      months.push({
        mes: new Date(year, month - 1).toLocaleString('es-AR', { month: 'short' }),
        ingresos: total
      })
    }
    setMonthlyRevenue(months)
  }

  const loadTodayAttendance = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('attendance')
      .select('*, members(nombre, apellido)')
      .gte('created_at', today + 'T00:00:00')
      .order('created_at', { ascending: false })
      .limit(8)
    if (data) setTodayAttendance(data)
  }

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
        <p>Cargando dashboard...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Resumen general del gimnasio</p>
        </div>
        <div className="dashboard-actions">
          <Link to="/admin/checkin" className="btn btn-primary">
            <QrCode size={18} />
            Check-in
          </Link>
          <Link to="/admin/members/new" className="btn btn-secondary">
            <UserPlus size={18} />
            Nuevo socio
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <Users size={22} />
          </div>
          <div className="stat-value">{stats?.miembros_activos || 0}</div>
          <div className="stat-label">Miembros activos</div>
          {stats?.miembros_vencidos > 0 && (
            <div className="stat-change negative">
              <AlertCircle size={12} />
              {stats.miembros_vencidos} vencidos
            </div>
          )}
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            <DollarSign size={22} />
          </div>
          <div className="stat-value">{formatCurrency(stats?.ingresos || 0)}</div>
          <div className="stat-label">Ingresos del mes</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
            <UserPlus size={22} />
          </div>
          <div className="stat-value">{stats?.nuevos_mes || 0}</div>
          <div className="stat-label">Nuevos este mes</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-info-light)', color: 'var(--color-info)' }}>
            <Clock size={22} />
          </div>
          <div className="stat-value">{stats?.asistencias_hoy || 0}</div>
          <div className="stat-label">Check-ins hoy</div>
        </div>
      </div>

      {/* Charts row */}
      <div className="dashboard-charts">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Ingresos últimos 6 meses</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyRevenue}>
              <defs>
                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [formatCurrency(v), 'Ingresos']} labelStyle={{ color: 'var(--color-text)' }} />
              <Area type="monotone" dataKey="ingresos" stroke="#2563EB" strokeWidth={2} fill="url(#colorIngresos)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="dashboard-bottom">
        {/* Expiring memberships */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Membresías por vencer</h3>
            <Link to="/admin/members" className="btn btn-ghost btn-sm">Ver todos</Link>
          </div>
          {expiringMembers.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
              <p>No hay membresías por vencer en los próximos 7 días</p>
            </div>
          ) : (
            <div className="expiring-list">
              {expiringMembers.map(m => {
                const days = Math.ceil((new Date(m.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24))
                return (
                  <Link key={m.id} to={`/admin/members/${m.member_id}`} className="expiring-item">
                    <div className="expiring-avatar">
                      {m.members?.nombre?.[0]}{m.members?.apellido?.[0]}
                    </div>
                    <div className="expiring-info">
                      <div className="expiring-name">{m.members?.nombre} {m.members?.apellido}</div>
                      <div className="expiring-date">Vence: {formatDate(m.fecha_vencimiento)}</div>
                    </div>
                    <span className={`badge ${days <= 2 ? 'badge-danger' : 'badge-warning'}`}>
                      {days === 0 ? 'Hoy' : `${days}d`}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent payments */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Últimos pagos</h3>
            <Link to="/admin/payments" className="btn btn-ghost btn-sm">Ver todos</Link>
          </div>
          {recentPayments.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
              <p>No hay pagos registrados</p>
            </div>
          ) : (
            <div className="payments-list">
              {recentPayments.map(p => (
                <div key={p.id} className="payment-item">
                  <div className="payment-info">
                    <div className="payment-member">{p.members?.nombre} {p.members?.apellido}</div>
                    <div className="payment-concept text-muted text-sm">{p.concepto || 'Pago'}</div>
                  </div>
                  <div className="payment-right">
                    <div className="payment-amount">{formatCurrency(p.monto)}</div>
                    <div className="text-xs text-muted">{formatDate(p.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Today attendance */}
      {todayAttendance.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-4)' }}>
          <div className="card-header">
            <h3 className="card-title">Check-ins de hoy</h3>
            <span className="badge badge-primary">{todayAttendance.length}</span>
          </div>
          <div className="attendance-today-list">
            {todayAttendance.map(a => (
              <div key={a.id} className="attendance-today-item">
                <div className="expiring-avatar" style={{ fontSize: '0.75rem' }}>
                  {a.members?.nombre?.[0]}{a.members?.apellido?.[0]}
                </div>
                <span>{a.members?.nombre} {a.members?.apellido}</span>
                <span className="text-xs text-muted" style={{ marginLeft: 'auto' }}>
                  {new Date(a.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
