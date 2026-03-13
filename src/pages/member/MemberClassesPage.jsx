import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatTime, formatDate } from '../../utils/helpers'
import { Calendar, Clock, Users, CheckCircle, XCircle, List } from 'lucide-react'
import toast from 'react-hot-toast'

function getWeekDates() {
  const today = new Date()
  const day = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function MemberClassesPage() {
  const { member } = useAuth()
  const [classes, setClasses] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1)
  const [tab, setTab] = useState('schedule') // 'schedule' | 'my'
  const weekDates = getWeekDates()

  useEffect(() => { loadData() }, [member?.id])

  const loadData = async () => {
    if (!member?.id) return
    setLoading(true)
    const from = weekDates[0].toISOString().split('T')[0]
    const to = new Date(weekDates[6].getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [classesRes, bookingsRes] = await Promise.all([
      supabase.from('classes').select('*, class_types(*), trainers(nombre, apellido)')
        .gte('fecha_hora', from + 'T00:00:00')
        .lte('fecha_hora', to + 'T23:59:59')
        .eq('activa', true)
        .order('fecha_hora'),
      supabase.from('class_bookings')
        .select('*, classes(nombre, fecha_hora, class_types(nombre, color))')
        .eq('member_id', member.id)
        .neq('estado', 'cancelada')
        .order('created_at', { ascending: false })
    ])
    setClasses(classesRes.data || [])
    setMyBookings(bookingsRes.data || [])
    setLoading(false)
  }

  const handleBook = async (classId) => {
    const { data, error } = await supabase.rpc('book_class', {
      p_member_id: member.id,
      p_class_id: classId
    })
    if (error) { toast.error('Error al reservar'); return }
    if (!data.success) { toast.error(data.error || 'No se pudo reservar'); return }

    if (data.estado === 'confirmada') {
      toast.success('✅ Reserva confirmada')
    } else {
      toast(`📋 Estás en lista de espera, posición ${data.posicion}`, { icon: '⏳' })
    }
    loadData()
  }

  const handleCancel = async (bookingId) => {
    if (!window.confirm('¿Cancelar esta reserva?')) return
    const { data, error } = await supabase.rpc('cancel_booking', {
      p_booking_id: bookingId,
      p_member_id: member.id
    })
    if (error || !data?.success) { toast.error('Error al cancelar'); return }
    toast.success('Reserva cancelada')
    loadData()
  }

  const getClassesForDay = (dayIdx) => {
    const d = weekDates[dayIdx].toISOString().split('T')[0]
    return classes.filter(c => c.fecha_hora.startsWith(d))
  }

  const isBooked = (classId) => myBookings.some(b => b.class_id === classId && b.estado === 'confirmada')
  const isWaiting = (classId) => myBookings.some(b => b.class_id === classId && b.estado === 'lista_espera')
  const getBookingId = (classId) => myBookings.find(b => b.class_id === classId)?.id

  const dayClasses = getClassesForDay(selectedDay)

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: 4, marginBottom: 'var(--space-4)' }}>
        <button className={`btn btn-sm ${tab === 'schedule' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('schedule')} style={{ flex: 1 }}>
          <Calendar size={14} /> Horarios
        </button>
        <button className={`btn btn-sm ${tab === 'my' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('my')} style={{ flex: 1 }}>
          <List size={14} /> Mis reservas
          {myBookings.length > 0 && <span className="badge badge-primary" style={{ fontSize: '0.65rem', marginLeft: 4 }}>{myBookings.length}</span>}
        </button>
      </div>

      {tab === 'schedule' && (
        <>
          {/* Day selector */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 'var(--space-4)' }}>
            {weekDates.map((date, i) => {
              const isToday = date.toDateString() === new Date().toDateString()
              const hasClasses = getClassesForDay(i).length > 0
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(i)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '8px 12px', borderRadius: 'var(--radius-md)',
                    border: `2px solid ${selectedDay === i ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: selectedDay === i ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: selectedDay === i ? '#fff' : 'var(--color-text)',
                    cursor: 'pointer', flexShrink: 0, minWidth: 52, transition: 'all var(--transition-fast)',
                    opacity: hasClasses ? 1 : 0.5
                  }}
                >
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.05em' }}>{DAYS_SHORT[i]}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', lineHeight: 1 }}>{date.getDate()}</span>
                  {isToday && <span style={{ width: 4, height: 4, borderRadius: '50%', background: selectedDay === i ? '#fff' : 'var(--color-primary)', marginTop: 2 }} />}
                </button>
              )
            })}
          </div>

          {/* Classes for selected day */}
          {loading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : dayClasses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Calendar size={28} /></div>
              <h3>Sin clases este día</h3>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {dayClasses.map(cls => {
                const booked = isBooked(cls.id)
                const waiting = isWaiting(cls.id)
                const full = cls.cupo_disponible === 0 && !booked
                return (
                  <div key={cls.id} style={{
                    background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-4)', border: `1px solid ${booked ? '#bbf7d0' : 'var(--color-border)'}`,
                    borderLeft: `4px solid ${cls.class_types?.color || 'var(--color-primary)'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 'var(--radius-full)',
                          background: (cls.class_types?.color || '#2563EB') + '20',
                          color: cls.class_types?.color || '#2563EB',
                          fontSize: '0.7rem', fontWeight: 600, marginBottom: 6
                        }}>
                          {cls.class_types?.nombre || 'Clase'}
                        </div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>{cls.nombre}</h3>
                        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 6, flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            <Clock size={13} /> {formatTime(cls.fecha_hora)} · {cls.duracion_minutos}min
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: full ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                            <Users size={13} /> {cls.cupo_disponible}/{cls.cupo_maximo}
                            {full && ' — Llena'}
                          </span>
                          {cls.trainers && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                              👤 {cls.trainers.nombre} {cls.trainers.apellido}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        {booked ? (
                          <button className="btn btn-sm btn-danger" onClick={() => handleCancel(getBookingId(cls.id))}>
                            <XCircle size={14} /> Cancelar
                          </button>
                        ) : waiting ? (
                          <span className="badge badge-warning">Lista espera</span>
                        ) : (
                          <button className="btn btn-sm btn-primary" onClick={() => handleBook(cls.id)} disabled={full && !waiting}>
                            {full ? 'Lista espera' : 'Reservar'}
                          </button>
                        )}
                      </div>
                    </div>
                    {booked && (
                      <div style={{ marginTop: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-success)', fontSize: '0.8rem', fontWeight: 600 }}>
                        <CheckCircle size={14} /> Reserva confirmada
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'my' && (
        <div>
          {myBookings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Calendar size={28} /></div>
              <h3>Sin reservas</h3>
              <p>Reservá clases desde la pestaña de Horarios</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {myBookings.map(b => (
                <div key={b.id} style={{
                  background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-4)', border: '1px solid var(--color-border)',
                  borderLeft: `4px solid ${b.estado === 'confirmada' ? 'var(--color-success)' : 'var(--color-warning)'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>{b.classes?.nombre}</h3>
                      {b.classes?.fecha_hora && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                          {new Date(b.classes.fecha_hora).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })} — {formatTime(b.classes.fecha_hora)}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <span className={`badge ${b.estado === 'confirmada' ? 'badge-success' : b.estado === 'lista_espera' ? 'badge-warning' : 'badge-neutral'}`}>
                        {b.estado === 'confirmada' ? 'Confirmada' : b.estado === 'lista_espera' ? 'Lista espera' : b.estado}
                      </span>
                      {b.estado === 'confirmada' && new Date(b.classes?.fecha_hora) > new Date() && (
                        <button className="btn btn-sm btn-danger" onClick={() => handleCancel(b.id)}>Cancelar</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
