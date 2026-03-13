import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatTime } from '../../utils/helpers'
import { ChevronLeft, ChevronRight, Users } from 'lucide-react'
import './SchedulePage.css'

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function getWeekDates(offset = 0) {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export default function SchedulePage({ public: isPublic }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const weekDates = getWeekDates(weekOffset)

  useEffect(() => { loadSchedule() }, [weekOffset])

  const loadSchedule = async () => {
    setLoading(true)
    const from = weekDates[0].toISOString().split('T')[0]
    const to = weekDates[6].toISOString().split('T')[0]
    const { data } = await supabase
      .from('classes')
      .select('*, class_types(*), trainers(nombre, apellido)')
      .gte('fecha_hora', from + 'T00:00:00')
      .lte('fecha_hora', to + 'T23:59:59')
      .eq('activa', true)
      .order('fecha_hora')
    setClasses(data || [])
    setLoading(false)
  }

  const getClassesForDay = (date) => {
    const d = date.toISOString().split('T')[0]
    return classes.filter(c => c.fecha_hora.startsWith(d))
  }

  const isToday = (date) => date.toDateString() === new Date().toDateString()

  return (
    <div className={isPublic ? 'schedule-public' : ''}>
      {isPublic && (
        <div className="schedule-public-header">
          <div className="schedule-public-logo">K</div>
          <div>
            <h1>KROVEX GYM</h1>
            <p>Horario de clases</p>
          </div>
        </div>
      )}

      <div className={isPublic ? 'schedule-public-container' : ''}>
        {!isPublic && (
          <div className="page-header">
            <div>
              <h1 className="page-title">Horarios</h1>
              <p className="page-subtitle">Vista semanal de clases</p>
            </div>
          </div>
        )}

        {/* Week navigation */}
        <div className="week-nav">
          <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft size={18} />
          </button>
          <span className="week-label">
            {weekDates[0].toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} –{' '}
            {weekDates[6].toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(0)}>Hoy</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(w => w + 1)}>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Calendar grid */}
        <div className="schedule-grid">
          {weekDates.map((date, i) => (
            <div key={i} className={`schedule-day ${isToday(date) ? 'today' : ''}`}>
              <div className="schedule-day-header">
                <div className="schedule-day-name">{DAYS[i]}</div>
                <div className="schedule-day-number">{date.getDate()}</div>
              </div>
              <div className="schedule-day-classes">
                {loading ? (
                  <div style={{ padding: 8 }}><div className="spinner" style={{ width: 20, height: 20 }} /></div>
                ) : getClassesForDay(date).length === 0 ? (
                  <div className="schedule-empty">—</div>
                ) : (
                  getClassesForDay(date).map(cls => (
                    <div
                      key={cls.id}
                      className="schedule-class-item"
                      style={{ borderLeftColor: cls.class_types?.color || 'var(--color-primary)' }}
                    >
                      <div className="schedule-class-time">{formatTime(cls.fecha_hora)}</div>
                      <div className="schedule-class-name">{cls.nombre}</div>
                      {cls.trainers && (
                        <div className="schedule-class-trainer">{cls.trainers.nombre}</div>
                      )}
                      <div className="schedule-class-cupo">
                        <Users size={11} />
                        {cls.cupo_disponible}/{cls.cupo_maximo}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
