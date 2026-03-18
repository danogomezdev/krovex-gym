import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { muscleGroupLabel } from '../../utils/helpers'
import { Plus, Edit, Trash2, ListChecks, Copy, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import './RoutinesPage.css'

export default function RoutinesPage() {
  const [routines, setRoutines] = useState([])
  const [exercises, setExercises] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editRoutine, setEditRoutine] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedRoutine, setSelectedRoutine] = useState(null)
  const [assignMemberId, setAssignMemberId] = useState('')
  const [form, setForm] = useState({ nombre: '', descripcion: '', objetivo: '', nivel: 'intermedio', duracion_semanas: 4 })
  const [days, setDays] = useState([{ nombre: 'Día 1', ejercicios: [] }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([loadRoutines(), loadExercises(), loadMembers()])
  }, [])

  const loadRoutines = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('routines')
      .select('*, routine_days(*, routine_exercises(*, exercises(*)))')
      .order('created_at', { ascending: false })
    setRoutines(data || [])
    setLoading(false)
  }

  const loadExercises = async () => {
    const { data } = await supabase.from('exercises').select('*').eq('activo', true).order('nombre')
    setExercises(data || [])
  }

  const loadMembers = async () => {
    const { data } = await supabase.from('members').select('id, nombre, apellido, numero_socio').eq('estado', 'activo').order('apellido')
    setMembers(data || [])
  }

  const openCreate = () => {
    setEditRoutine(null)
    setForm({ nombre: '', descripcion: '', objetivo: '', nivel: 'intermedio', duracion_semanas: 4 })
    setDays([{ nombre: 'Día 1 - Pecho y Espalda', ejercicios: [{ exercise_id: '', series: 3, repeticiones: '10-12', peso: '', descanso_segundos: 60, notas: '' }] }])
    setShowModal(true)
  }

  const addDay = () => setDays(d => [...d, { nombre: `Día ${d.length + 1}`, ejercicios: [] }])
  const removeDay = (i) => setDays(d => d.filter((_, idx) => idx !== i))
  const setDayName = (i, v) => setDays(d => d.map((day, idx) => idx === i ? { ...day, nombre: v } : day))
  const addExercise = (dayIdx) => setDays(d => d.map((day, i) => i === dayIdx
    ? { ...day, ejercicios: [...day.ejercicios, { exercise_id: '', series: 3, repeticiones: '10-12', peso: '', descanso_segundos: 60, notas: '' }] }
    : day))
  const removeExercise = (dayIdx, exIdx) => setDays(d => d.map((day, i) => i === dayIdx
    ? { ...day, ejercicios: day.ejercicios.filter((_, j) => j !== exIdx) }
    : day))
  const setExField = (dayIdx, exIdx, field, val) => setDays(d => d.map((day, i) => i === dayIdx
    ? { ...day, ejercicios: day.ejercicios.map((ex, j) => j === exIdx ? { ...ex, [field]: val } : ex) }
    : day))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.nombre) { toast.error('El nombre es requerido'); return }
    setSaving(true)
    try {
      let routineId
      if (editRoutine) {
        await supabase.from('routines').update({ ...form }).eq('id', editRoutine.id)
        routineId = editRoutine.id
        // Delete existing days
        await supabase.from('routine_days').delete().eq('routine_id', routineId)
      } else {
        const { data } = await supabase.from('routines').insert({ ...form }).select().single()
        routineId = data.id
      }
      // Insert days and exercises
      for (let di = 0; di < days.length; di++) {
        const day = days[di]
        const { data: dayData } = await supabase.from('routine_days').insert({
          routine_id: routineId, dia_numero: di + 1, nombre: day.nombre, orden: di
        }).select().single()
        for (let ei = 0; ei < day.ejercicios.length; ei++) {
          const ex = day.ejercicios[ei]
          if (!ex.exercise_id) continue
          await supabase.from('routine_exercises').insert({
            routine_day_id: dayData.id,
            exercise_id: ex.exercise_id,
            series: parseInt(ex.series) || 3,
            repeticiones: ex.repeticiones,
            peso: ex.peso || null,
            descanso_segundos: parseInt(ex.descanso_segundos) || 60,
            notas: ex.notas || null,
            orden: ei
          })
        }
      }
      toast.success(editRoutine ? 'Rutina actualizada' : 'Rutina creada')
      setShowModal(false)
      loadRoutines()
    } catch (err) {
      toast.error('Error al guardar rutina')
    } finally {
      setSaving(false)
    }
  }

  const handleAssign = async () => {
    if (!assignMemberId || !selectedRoutine) return
    const { error } = await supabase.from('member_routines').insert({
      member_id: assignMemberId,
      routine_id: selectedRoutine.id,
      activa: true,
      fecha_inicio: new Date().toISOString().split('T')[0]
    })
    if (error) { toast.error('Error al asignar rutina'); return }
    toast.success('Rutina asignada correctamente')
    setShowAssignModal(false)
    setAssignMemberId('')
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta rutina?')) return
    await supabase.from('routines').delete().eq('id', id)
    toast.success('Rutina eliminada')
    loadRoutines()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Rutinas</h1>
          <p className="page-subtitle">{routines.length} rutinas creadas</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> Nueva rutina
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : routines.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><ListChecks size={28} /></div>
            <h3>No hay rutinas</h3>
            <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Crear primera rutina</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {routines.map(r => (
            <div key={r.id} className="card routine-card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>{r.nombre}</h3>
                    <span className="badge badge-neutral">{r.nivel}</span>
                    <span className="badge badge-primary">{r.duracion_semanas} sem</span>
                  </div>
                  {r.descripcion && <p className="text-sm text-muted" style={{ marginTop: 4 }}>{r.descripcion}</p>}
                  <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                    {r.routine_days?.length || 0} días · {r.routine_days?.reduce((s, d) => s + (d.routine_exercises?.length || 0), 0)} ejercicios
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => { setSelectedRoutine(r); setShowAssignModal(true) }}>
                    Asignar
                  </button>
                  <button className="btn-icon" onClick={() => handleDelete(r.id)} style={{ color: 'var(--color-danger)' }}>
                    <Trash2 size={15} />
                  </button>
                  <button className="btn-icon" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                    {expandedId === r.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {expandedId === r.id && (
                <div className="routine-days">
                  {r.routine_days?.sort((a, b) => a.orden - b.orden).map(day => (
                    <div key={day.id} className="routine-day">
                      <h4 className="routine-day-name">{day.nombre}</h4>
                      {day.routine_exercises?.sort((a, b) => a.orden - b.orden).map(ex => (
                        <div key={ex.id} className="routine-exercise">
                          <span style={{ fontWeight: 500 }}>{ex.exercises?.nombre}</span>
                          <span className="text-xs text-muted font-mono">
                            {ex.series}×{ex.repeticiones}
                            {ex.peso && ` — ${ex.peso}`}
                            {ex.descanso_segundos && ` — ${ex.descanso_segundos}s`}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nueva rutina</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Nombre *</label>
                  <input type="text" className="form-input" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} required placeholder="Rutina Fullbody 3x..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Nivel</label>
                  <select className="form-select" value={form.nivel} onChange={e => setForm(p => ({ ...p, nivel: e.target.value }))}>
                    <option value="principiante">Principiante</option>
                    <option value="intermedio">Intermedio</option>
                    <option value="avanzado">Avanzado</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Duración (semanas)</label>
                  <input type="number" className="form-input" value={form.duracion_semanas} onChange={e => setForm(p => ({ ...p, duracion_semanas: e.target.value }))} min={1} />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Descripción</label>
                  <textarea className="form-textarea" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} rows={2} />
                </div>
              </div>

              {/* Days */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <label className="form-label">Días de entrenamiento</label>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={addDay}><Plus size={14} /> Agregar día</button>
                </div>
                {days.map((day, di) => (
                  <div key={di} style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                      <input type="text" className="form-input" value={day.nombre} onChange={e => setDayName(di, e.target.value)} placeholder="Nombre del día" style={{ flex: 1 }} />
                      {days.length > 1 && (
                        <button type="button" className="btn-icon" style={{ color: 'var(--color-danger)' }} onClick={() => removeDay(di)}><Trash2 size={15} /></button>
                      )}
                    </div>
                    {day.ejercicios.map((ex, ei) => (
                      <div key={ei} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
                        <select className="form-select" value={ex.exercise_id} onChange={e => setExField(di, ei, 'exercise_id', e.target.value)}>
                          <option value="">Elegir ejercicio...</option>
                          {exercises.map(e => <option key={e.id} value={e.id}>{e.nombre} ({muscleGroupLabel[e.grupo_muscular]})</option>)}
                        </select>
                        <input type="number" className="form-input" placeholder="Series" value={ex.series} onChange={e => setExField(di, ei, 'series', e.target.value)} min={1} />
                        <input type="text" className="form-input" placeholder="Reps" value={ex.repeticiones} onChange={e => setExField(di, ei, 'repeticiones', e.target.value)} />
                        <input type="text" className="form-input" placeholder="Peso" value={ex.peso} onChange={e => setExField(di, ei, 'peso', e.target.value)} />
                        <input type="number" className="form-input" placeholder="Desc(s)" value={ex.descanso_segundos} onChange={e => setExField(di, ei, 'descanso_segundos', e.target.value)} />
                        <button type="button" className="btn-icon" style={{ color: 'var(--color-danger)' }} onClick={() => removeExercise(di, ei)}><Trash2 size={14} /></button>
                      </div>
                    ))}
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => addExercise(di)}>
                      <Plus size={14} /> Ejercicio
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button type="button" className="btn btn-secondary w-full" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary w-full" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar rutina'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Asignar rutina</h2>
              <button className="btn-icon" onClick={() => setShowAssignModal(false)}>✕</button>
            </div>
            <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-4)' }}>
              Asignando: <strong>{selectedRoutine?.nombre}</strong>
            </p>
            <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="form-label">Miembro</label>
              <select className="form-select" value={assignMemberId} onChange={e => setAssignMemberId(e.target.value)}>
                <option value="">Seleccionar miembro...</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.nombre} {m.apellido} — {m.numero_socio}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button className="btn btn-secondary w-full" onClick={() => setShowAssignModal(false)}>Cancelar</button>
              <button className="btn btn-primary w-full" onClick={handleAssign} disabled={!assignMemberId}>Asignar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
