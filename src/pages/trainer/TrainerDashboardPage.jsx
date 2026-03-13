import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatDateTime, formatCurrency } from '../../utils/helpers'
import { Zap, Users, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TrainerDashboardPage() {
  const { staffUser } = useAuth()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [trainer, setTrainer] = useState(null)

  useEffect(() => { loadData() }, [staffUser])

  const loadData = async () => {
    setLoading(true)
    // Get trainer profile linked to staff
    if (staffUser?.id && staffUser.id !== 'demo') {
      const { data: trainerData } = await supabase.from('trainers').select('*').eq('staff_id', staffUser.id).single()
      if (trainerData) {
        setTrainer(trainerData)
        const { data: classesData } = await supabase
          .from('classes')
          .select('*, class_types(*), class_bookings(count)')
          .eq('trainer_id', trainerData.id)
          .gte('fecha_hora', new Date().toISOString())
          .order('fecha_hora')
          .limit(10)
        setClasses(classesData || [])
      }
    } else {
      // Demo mode: show all upcoming classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('*, class_types(*), trainers(nombre, apellido)')
        .gte('fecha_hora', new Date().toISOString())
        .order('fecha_hora')
        .limit(10)
      setClasses(classesData || [])
    }
    setLoading(false)
  }

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Mis clases</h2>
          <p className="page-subtitle">Próximas clases programadas</p>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Zap size={28} /></div>
            <h3>No tenés clases programadas</h3>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {classes.map(cls => (
            <Link key={cls.id} to={`/trainer/class/${cls.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ cursor: 'pointer', transition: 'box-shadow var(--transition-fast)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 'var(--radius-md)',
                    background: (cls.class_types?.color || '#2563EB') + '20',
                    color: cls.class_types?.color || '#2563EB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Zap size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>{cls.nombre}</h3>
                    <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                        <Clock size={14} />
                        {formatDateTime(cls.fecha_hora)} — {cls.duracion_minutos}min
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                        <Users size={14} />
                        {cls.cupo_disponible}/{cls.cupo_maximo} disponibles
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${cls.class_types?.color ? 'badge-primary' : 'badge-neutral'}`}
                      style={{ background: (cls.class_types?.color || '#2563EB') + '20', color: cls.class_types?.color || '#2563EB' }}>
                      {cls.class_types?.nombre || 'Clase'}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
