import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDateTime, getInitials, getAvatarColor } from '../../utils/helpers'
import { ArrowLeft, CheckCircle, XCircle, Users, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TrainerClassPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cls, setCls] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadClass() }, [id])

  const loadClass = async () => {
    setLoading(true)
    const [clsRes, bookRes] = await Promise.all([
      supabase.from('classes').select('*, class_types(*), trainers(nombre, apellido)').eq('id', id).single(),
      supabase.from('class_bookings').select('*, members(nombre, apellido, numero_socio, dni)').eq('class_id', id).neq('estado', 'cancelada').order('created_at')
    ])
    setCls(clsRes.data)
    setBookings(bookRes.data || [])
    setLoading(false)
  }

  const markAttendance = async (bookingId, attended) => {
    const newStatus = attended ? 'asistio' : 'confirmada'
    const { error } = await supabase.from('class_bookings').update({ estado: newStatus }).eq('id', bookingId)
    if (error) { toast.error('Error al actualizar asistencia'); return }

    if (attended) {
      // Register attendance record
      const booking = bookings.find(b => b.id === bookingId)
      if (booking) {
        await supabase.from('attendance').insert({
          member_id: booking.member_id,
          class_id: id,
          tipo: 'clase',
          metodo: 'entrenador'
        })
      }
    }

    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, estado: newStatus } : b))
    toast.success(attended ? 'Asistencia registrada' : 'Marcado como ausente')
  }

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>
  if (!cls) return <div className="card"><p>Clase no encontrada</p></div>

  const confirmed = bookings.filter(b => b.estado === 'confirmada' || b.estado === 'asistio')
  const attended = bookings.filter(b => b.estado === 'asistio')

  return (
    <div>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/trainer')} style={{ marginBottom: 'var(--space-4)' }}>
        <ArrowLeft size={18} /> Volver
      </button>

      {/* Class info card */}
      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 'var(--radius-lg)',
            background: (cls.class_types?.color || '#2563EB') + '20',
            color: cls.class_types?.color || '#2563EB',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem'
          }}>💪</div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem' }}>{cls.nombre}</h1>
            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginTop: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                <Clock size={14} /> {formatDateTime(cls.fecha_hora)} — {cls.duracion_minutos} min
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                <Users size={14} /> {confirmed.length} inscriptos · {attended.length} asistieron
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--color-primary)' }}>
              {attended.length}/{confirmed.length}
            </div>
            <div className="text-sm text-muted">asistencia</div>
          </div>
        </div>
      </div>

      {/* Bookings list */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Lista de inscriptos</h3>
          <div className="flex gap-2">
            <span className="badge badge-success">{attended.length} asistieron</span>
            <span className="badge badge-warning">{confirmed.length - attended.length} pendientes</span>
          </div>
        </div>

        {bookings.length === 0 ? (
          <div className="empty-state"><p>No hay inscriptos en esta clase</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {bookings.map(b => (
              <div key={b.id} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                background: b.estado === 'asistio' ? 'var(--color-success-light)' : 'var(--color-surface-2)',
                border: `1px solid ${b.estado === 'asistio' ? '#bbf7d0' : 'var(--color-border)'}`,
                transition: 'all var(--transition-fast)'
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: b.estado === 'asistio' ? 'var(--color-success)' : getAvatarColor(b.member_id),
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.875rem', flexShrink: 0
                }}>
                  {b.estado === 'asistio' ? '✓' : getInitials(b.members?.nombre, b.members?.apellido)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{b.members?.nombre} {b.members?.apellido}</div>
                  <div className="text-xs text-muted">{b.members?.numero_socio} · DNI {b.members?.dni}</div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {b.estado !== 'asistio' ? (
                    <button className="btn btn-success btn-sm" onClick={() => markAttendance(b.id, true)}>
                      <CheckCircle size={16} /> Presente
                    </button>
                  ) : (
                    <button className="btn btn-secondary btn-sm" onClick={() => markAttendance(b.id, false)}>
                      <XCircle size={16} /> Deshacer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
