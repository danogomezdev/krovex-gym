import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { muscleGroupLabel } from '../../utils/helpers'
import { ListChecks, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react'

export default function MemberRoutinePage() {
  const { member } = useAuth()
  const [routine, setRoutine] = useState(null)
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedDay, setExpandedDay] = useState(0)

  useEffect(() => { loadRoutine() }, [member?.id])

  const loadRoutine = async () => {
    if (!member?.id) return
    setLoading(true)
    const { data: mr } = await supabase
      .from('member_routines')
      .select('*, routines(*, routine_days(*, routine_exercises(*, exercises(*))))')
      .eq('member_id', member.id)
      .eq('activa', true)
      .single()

    if (mr?.routines) {
      setRoutine(mr.routines)
      const sortedDays = [...(mr.routines.routine_days || [])].sort((a, b) => a.orden - b.orden)
      setDays(sortedDays)
    }
    setLoading(false)
  }

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>

  if (!routine) return (
    <div className="empty-state" style={{ marginTop: 'var(--space-8)' }}>
      <div className="empty-state-icon"><Dumbbell size={32} /></div>
      <h3>Sin rutina asignada</h3>
      <p>Tu entrenador todavía no te asignó ninguna rutina. Consultá en recepción.</p>
    </div>
  )

  return (
    <div>
      {/* Routine header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
        borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)',
        color: '#fff', marginBottom: 'var(--space-4)'
      }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Tu rutina activa
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginTop: 4 }}>{routine.nombre}</h1>
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-full)', padding: '4px 12px', fontSize: '0.8rem' }}>
            {routine.nivel}
          </span>
          <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-full)', padding: '4px 12px', fontSize: '0.8rem' }}>
            {routine.duracion_semanas} semanas
          </span>
          <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-full)', padding: '4px 12px', fontSize: '0.8rem' }}>
            {days.length} días
          </span>
        </div>
        {routine.descripcion && (
          <p style={{ marginTop: 'var(--space-3)', fontSize: '0.875rem', opacity: 0.9 }}>{routine.descripcion}</p>
        )}
      </div>

      {/* Days */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {days.map((day, i) => {
          const isOpen = expandedDay === i
          const exs = [...(day.routine_exercises || [])].sort((a, b) => a.orden - b.orden)
          return (
            <div key={day.id} style={{
              background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
              border: `1px solid ${isOpen ? 'var(--color-primary)' : 'var(--color-border)'}`,
              overflow: 'hidden', transition: 'border-color var(--transition-fast)'
            }}>
              <button
                onClick={() => setExpandedDay(isOpen ? -1 : i)}
                style={{
                  width: '100%', padding: 'var(--space-4)', display: 'flex',
                  alignItems: 'center', gap: 'var(--space-3)',
                  background: 'none', border: 'none', cursor: 'pointer', text: 'left'
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: isOpen ? 'var(--color-primary)' : 'var(--color-primary-light)',
                  color: isOpen ? '#fff' : 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-text)' }}>{day.nombre}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{exs.length} ejercicios</div>
                </div>
                {isOpen ? <ChevronUp size={18} color="var(--color-text-muted)" /> : <ChevronDown size={18} color="var(--color-text-muted)" />}
              </button>

              {isOpen && (
                <div style={{ borderTop: '1px solid var(--color-border)' }}>
                  {exs.length === 0 ? (
                    <p style={{ padding: 'var(--space-4)', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Sin ejercicios asignados</p>
                  ) : (
                    exs.map((ex, ei) => (
                      <div key={ex.id} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
                        padding: 'var(--space-3) var(--space-4)',
                        borderBottom: ei < exs.length - 1 ? '1px solid var(--color-border-light)' : 'none'
                      }}>
                        {ex.exercises?.gif_url ? (
                          <img src={ex.exercises.gif_url} alt="" style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{
                            width: 48, height: 48, borderRadius: 'var(--radius-sm)',
                            background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            <Dumbbell size={20} />
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{ex.exercises?.nombre}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                            {muscleGroupLabel[ex.exercises?.grupo_muscular] || ex.exercises?.grupo_muscular}
                          </div>
                          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                            <span style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600 }}>
                              {ex.series} series × {ex.repeticiones}
                            </span>
                            {ex.peso && (
                              <span style={{ background: 'var(--color-bg)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                                {ex.peso}
                              </span>
                            )}
                            {ex.descanso_segundos && (
                              <span style={{ background: 'var(--color-bg)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                ⏱ {ex.descanso_segundos}s descanso
                              </span>
                            )}
                          </div>
                          {ex.notas && (
                            <div style={{ marginTop: 'var(--space-2)', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                              💡 {ex.notas}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
