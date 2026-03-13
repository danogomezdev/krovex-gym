import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatDate, membershipStatusBadge, membershipStatusLabel, daysUntil } from '../../utils/helpers'
import { Calendar, ListChecks, TrendingUp, Bell, AlertTriangle, CheckCircle, CreditCard } from 'lucide-react'
import './MemberDashboardPage.css'

export default function MemberDashboardPage() {
  const { member } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [upcomingClasses, setUpcomingClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboard() }, [member?.id])

  const loadDashboard = async () => {
    if (!member?.id) return
    setLoading(true)
    const [dashRes, notifRes, classesRes] = await Promise.all([
      supabase.rpc('get_member_dashboard', { p_member_id: member.id }),
      supabase.from('notifications').select('*').eq('member_id', member.id).eq('leida', false).order('created_at', { ascending: false }).limit(5),
      supabase.from('class_bookings')
        .select('*, classes(nombre, fecha_hora, duracion_minutos, class_types(nombre, color))')
        .eq('member_id', member.id)
        .eq('estado', 'confirmada')
        .gte('classes.fecha_hora', new Date().toISOString())
        .limit(3)
    ])
    setDashboard(dashRes.data)
    setNotifications(notifRes.data || [])
    setUpcomingClasses(classesRes.data?.filter(b => b.classes) || [])
    setLoading(false)
  }

  const markRead = async (id) => {
    await supabase.from('notifications').update({ leida: true }).eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const membership = dashboard?.membership || member?.membership
  const daysLeft = membership ? daysUntil(membership.fecha_vencimiento) : null
  const isExpired = daysLeft !== null && daysLeft < 0
  const expiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7

  if (loading) return (
    <div className="loading-spinner">
      <div className="spinner" />
      <p style={{ fontSize: '0.875rem' }}>Cargando...</p>
    </div>
  )

  return (
    <div className="member-dashboard">
      {/* Welcome */}
      <div className="member-welcome">
        <div className="member-welcome-text">
          <h2>¡Hola, {member?.nombre}! 👋</h2>
          <p>Bienvenido a tu portal</p>
        </div>
        <div className="member-socio-badge">
          <span className="text-xs">Socio</span>
          <span className="font-mono" style={{ fontWeight: 700 }}>{member?.numero_socio}</span>
        </div>
      </div>

      {/* Membership card */}
      <div className={`member-membership-card ${isExpired ? 'expired' : expiringSoon ? 'expiring' : 'active'}`}>
        <div className="member-card-icon">
          {isExpired ? <AlertTriangle size={24} /> : <CreditCard size={24} />}
        </div>
        <div className="member-card-info">
          {membership ? (
            <>
              <div className="member-card-plan">{/* plan name from membership */}Membresía</div>
              <div className="member-card-status">
                {isExpired ? (
                  <span>⚠️ Vencida hace {Math.abs(daysLeft)} días</span>
                ) : daysLeft === 0 ? (
                  <span>⚠️ Vence hoy</span>
                ) : expiringSoon ? (
                  <span>⏰ Vence en {daysLeft} días</span>
                ) : (
                  <span>✅ Activa hasta {formatDate(membership.fecha_vencimiento)}</span>
                )}
              </div>
              {membership.clases_restantes !== null && (
                <div className="member-card-classes">
                  <strong>{membership.clases_restantes}</strong> clases restantes
                </div>
              )}
            </>
          ) : (
            <div className="member-card-plan">Sin membresía activa</div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="member-stats-row">
        <div className="member-stat">
          <div className="member-stat-value">{dashboard?.asistencias_mes || 0}</div>
          <div className="member-stat-label">Visitas este mes</div>
        </div>
        <div className="member-stat">
          <div className="member-stat-value">{membership?.clases_restantes ?? '—'}</div>
          <div className="member-stat-label">Clases restantes</div>
        </div>
        <div className="member-stat">
          <div className="member-stat-value">
            {dashboard?.ultima_medicion?.peso ? `${dashboard.ultima_medicion.peso}kg` : '—'}
          </div>
          <div className="member-stat-label">Peso actual</div>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="member-section">
          <h3 className="member-section-title">
            <Bell size={16} /> Notificaciones
            <span className="badge badge-danger" style={{ marginLeft: 8, fontSize: '0.7rem' }}>{notifications.length}</span>
          </h3>
          <div className="member-notifications">
            {notifications.map(n => (
              <div key={n.id} className="member-notification">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{n.titulo}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{n.mensaje}</div>
                </div>
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', flexShrink: 0, fontSize: '1.1rem' }}
                  onClick={() => markRead(n.id)}
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming classes */}
      {upcomingClasses.length > 0 && (
        <div className="member-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="member-section-title"><Calendar size={16} /> Mis próximas clases</h3>
            <Link to="/member/classes" style={{ fontSize: '0.8125rem', color: 'var(--color-primary)' }}>Ver todas</Link>
          </div>
          <div className="member-classes-list">
            {upcomingClasses.map(b => (
              <div key={b.id} className="member-class-item">
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 6,
                  background: b.classes?.class_types?.color || 'var(--color-primary)'
                }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{b.classes?.nombre}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {new Date(b.classes?.fecha_hora).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })} — {new Date(b.classes?.fecha_hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="member-section">
        <h3 className="member-section-title">Accesos rápidos</h3>
        <div className="member-quick-actions">
          <Link to="/member/classes" className="member-quick-action">
            <div className="member-qa-icon" style={{ background: '#EFF6FF', color: 'var(--color-primary)' }}>
              <Calendar size={24} />
            </div>
            <span>Reservar clase</span>
          </Link>
          <Link to="/member/routine" className="member-quick-action">
            <div className="member-qa-icon" style={{ background: '#f0fdf4', color: 'var(--color-success)' }}>
              <ListChecks size={24} />
            </div>
            <span>Mi rutina</span>
          </Link>
          <Link to="/member/progress" className="member-quick-action">
            <div className="member-qa-icon" style={{ background: '#fffbeb', color: 'var(--color-warning)' }}>
              <TrendingUp size={24} />
            </div>
            <span>Mi progreso</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
