/**
 * MemberRoutineTab.jsx
 * Tab de rutina dentro del perfil de un miembro.
 * Permite:
 * - Ver la rutina activa del miembro
 * - Asignar una rutina existente (plantilla global)
 * - Copiar la rutina de otro miembro
 * - Crear una rutina nueva (pública o privada del miembro)
 * - Editar valores de la rutina asignada (peso, series, reps)
 */
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { muscleGroupLabel } from '../../utils/helpers'
import {
  Plus, Trash2, Copy, ListChecks, Dumbbell,
  ChevronDown, ChevronUp, Edit2, Check, X,
  Users, BookOpen, Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function MemberRoutineTab({ memberId, memberName }) {
  const [memberRoutine, setMemberRoutine] = useState(null)  // member_routines row con rutina expandida
  const [loading, setLoading]             = useState(true)
  const [mode, setMode]                   = useState(null)  // null | 'assign' | 'copy' | 'create'

  useEffect(() => { loadMemberRoutine() }, [memberId])

  async function loadMemberRoutine() {
    setLoading(true)
    const { data } = await supabase
      .from('member_routines')
      .select('*, routines(*, routine_days(*, routine_exercises(*, exercises(*))))')
      .eq('member_id', memberId)
      .eq('activa', true)
      .maybeSingle()
    setMemberRoutine(data || null)
    setLoading(false)
  }

  async function desasignarRutina() {
    if (!window.confirm('¿Desasignar la rutina actual?')) return
    await supabase.from('member_routines').update({ activa: false }).eq('id', memberRoutine.id)
    setMemberRoutine(null)
    toast.success('Rutina desasignada')
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>

  // ── Sin rutina: mostrar opciones ─────────────────────────
  if (!memberRoutine && !mode) {
    return (
      <div>
        <div className="empty-state" style={{ marginBottom: 24 }}>
          <div className="empty-state-icon"><Dumbbell size={28} /></div>
          <h3>Sin rutina asignada</h3>
          <p>Elegí cómo querés asignarle una rutina a {memberName}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <OptionCard
            icon={<BookOpen size={24} />}
            title="Usar plantilla"
            desc="Asignar una rutina del listado global"
            onClick={() => setMode('assign')}
          />
          <OptionCard
            icon={<Users size={24} />}
            title="Copiar de otro miembro"
            desc="Clonar la rutina activa de cualquier miembro"
            onClick={() => setMode('copy')}
          />
          <OptionCard
            icon={<Sparkles size={24} />}
            title="Crear nueva"
            desc="Armar una rutina desde cero para este miembro"
            onClick={() => setMode('create')}
          />
        </div>
      </div>
    )
  }

  // ── Flujos de asignación ──────────────────────────────────
  if (mode === 'assign') return (
    <AssignFromTemplate memberId={memberId} onDone={() => { setMode(null); loadMemberRoutine() }} onCancel={() => setMode(null)} />
  )
  if (mode === 'copy') return (
    <CopyFromMember memberId={memberId} onDone={() => { setMode(null); loadMemberRoutine() }} onCancel={() => setMode(null)} />
  )
  if (mode === 'create') return (
    <CreateRoutine memberId={memberId} onDone={() => { setMode(null); loadMemberRoutine() }} onCancel={() => setMode(null)} />
  )

  // ── Rutina asignada: vista + edición inline ───────────────
  return (
    <RoutineView
      memberRoutine={memberRoutine}
      onDesasignar={desasignarRutina}
      onReemplazar={() => { setMemberRoutine(null); setMode(null) }}
      onRefresh={loadMemberRoutine}
    />
  )
}

// ─────────────────────────────────────────────────────────────
// Subcomponente: Card de opción
// ─────────────────────────────────────────────────────────────
function OptionCard({ icon, title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 16px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s',
        display: 'flex', flexDirection: 'column', gap: 8
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(var(--color-primary-rgb),0.1)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ color: 'var(--color-primary)' }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{title}</div>
      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{desc}</div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Subcomponente: Asignar desde plantilla global
// ─────────────────────────────────────────────────────────────
function AssignFromTemplate({ memberId, onDone, onCancel }) {
  const [routines, setRoutines] = useState([])
  const [selected, setSelected] = useState('')
  const [saving, setSaving]     = useState(false)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    supabase
      .from('routines')
      .select('*, routine_days(*, routine_exercises(*, exercises(*)))')
      .eq('es_publica', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRoutines(data || []))
  }, [])

  async function asignar() {
    if (!selected) { toast.error('Seleccioná una rutina'); return }
    setSaving(true)
    // Desactivar rutina anterior si existe
    await supabase.from('member_routines').update({ activa: false }).eq('member_id', memberId).eq('activa', true)
    const { error } = await supabase.from('member_routines').insert({
      member_id: memberId,
      routine_id: selected,
      activa: true,
      fecha_inicio: new Date().toISOString().split('T')[0]
    })
    setSaving(false)
    if (error) { toast.error('Error al asignar'); return }
    toast.success('Rutina asignada')
    onDone()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}><X size={16} /> Volver</button>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem' }}>Seleccionar plantilla</h3>
      </div>

      {routines.length === 0 ? (
        <div className="empty-state">
          <p>No hay rutinas públicas disponibles. Creá una desde la sección Rutinas.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {routines.map(r => (
            <div
              key={r.id}
              onClick={() => setSelected(r.id)}
              style={{
                border: `2px solid ${selected === r.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-md)',
                background: selected === r.id ? 'rgba(var(--color-primary-rgb),0.04)' : 'var(--color-surface)',
                cursor: 'pointer', overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${selected === r.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: selected === r.id ? 'var(--color-primary)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {selected === r.id && <Check size={11} color="white" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{r.nombre}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                    {r.nivel} · {r.duracion_semanas} sem · {r.routine_days?.length || 0} días
                  </div>
                </div>
                <button
                  className="btn-icon"
                  onClick={e => { e.stopPropagation(); setExpanded(expanded === r.id ? null : r.id) }}
                >
                  {expanded === r.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
              {expanded === r.id && (
                <div style={{ borderTop: '1px solid var(--color-border)', padding: '12px 16px', background: 'var(--color-bg)' }}>
                  {r.routine_days?.sort((a, b) => a.orden - b.orden).map(day => (
                    <div key={day.id} style={{ marginBottom: 10 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 4 }}>{day.nombre}</div>
                      {day.routine_exercises?.map(ex => (
                        <div key={ex.id} style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', paddingLeft: 12, marginBottom: 2 }}>
                          • {ex.exercises?.nombre} — {ex.series}×{ex.repeticiones}
                          {ex.peso && ` — ${ex.peso}`}
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

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
        <button className="btn btn-primary" onClick={asignar} disabled={!selected || saving}>
          {saving ? 'Asignando...' : 'Asignar rutina'}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Subcomponente: Copiar rutina de otro miembro
// ─────────────────────────────────────────────────────────────
function CopyFromMember({ memberId, onDone, onCancel }) {
  const [members, setMembers]   = useState([])
  const [selected, setSelected] = useState('')
  const [preview, setPreview]   = useState(null)
  const [saving, setSaving]     = useState(false)
  const [loadingPrev, setLoadingPrev] = useState(false)

  useEffect(() => {
    supabase
      .from('members')
      .select('id, nombre, apellido, numero_socio')
      .eq('estado', 'activo')
      .neq('id', memberId)
      .order('apellido')
      .then(({ data }) => setMembers(data || []))
  }, [])

  async function cargarPreview(mId) {
    setSelected(mId)
    setPreview(null)
    if (!mId) return
    setLoadingPrev(true)
    const { data } = await supabase
      .from('member_routines')
      .select('*, routines(*, routine_days(*, routine_exercises(*, exercises(*))))')
      .eq('member_id', mId)
      .eq('activa', true)
      .maybeSingle()
    setPreview(data?.routines || null)
    setLoadingPrev(false)
  }

  async function copiar() {
    if (!preview) { toast.error('El miembro seleccionado no tiene rutina activa'); return }
    setSaving(true)
    try {
      // 1. Crear nueva rutina (copia)
      const { data: newRoutine } = await supabase.from('routines').insert({
        nombre: `${preview.nombre} (copia)`,
        descripcion: preview.descripcion,
        objetivo: preview.objetivo,
        nivel: preview.nivel,
        duracion_semanas: preview.duracion_semanas,
        es_publica: false,  // privada por defecto al copiar
        member_id: memberId,
      }).select().single()

      // 2. Copiar días y ejercicios
      const days = preview.routine_days?.sort((a, b) => a.orden - b.orden) || []
      for (const day of days) {
        const { data: newDay } = await supabase.from('routine_days').insert({
          routine_id: newRoutine.id,
          dia_numero: day.dia_numero,
          nombre: day.nombre,
          orden: day.orden
        }).select().single()

        const exs = day.routine_exercises?.sort((a, b) => a.orden - b.orden) || []
        for (const ex of exs) {
          await supabase.from('routine_exercises').insert({
            routine_day_id: newDay.id,
            exercise_id: ex.exercise_id,
            series: ex.series,
            repeticiones: ex.repeticiones,
            peso: ex.peso,
            descanso_segundos: ex.descanso_segundos,
            notas: ex.notas,
            orden: ex.orden
          })
        }
      }

      // 3. Asignar al miembro
      await supabase.from('member_routines').update({ activa: false }).eq('member_id', memberId).eq('activa', true)
      await supabase.from('member_routines').insert({
        member_id: memberId,
        routine_id: newRoutine.id,
        activa: true,
        fecha_inicio: new Date().toISOString().split('T')[0]
      })

      toast.success('Rutina copiada y asignada')
      onDone()
    } catch (err) {
      toast.error('Error al copiar rutina')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}><X size={16} /> Volver</button>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem' }}>Copiar de otro miembro</h3>
      </div>

      <div className="form-group" style={{ marginBottom: 16 }}>
        <label className="form-label">Miembro origen</label>
        <select className="form-select" value={selected} onChange={e => cargarPreview(e.target.value)}>
          <option value="">Seleccionar miembro...</option>
          {members.map(m => (
            <option key={m.id} value={m.id}>{m.apellido}, {m.nombre} — {m.numero_socio}</option>
          ))}
        </select>
      </div>

      {loadingPrev && <div className="spinner" style={{ margin: '16px auto' }} />}

      {selected && !loadingPrev && !preview && (
        <div style={{ padding: '14px 16px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: 16 }}>
          Este miembro no tiene rutina activa asignada.
        </div>
      )}

      {preview && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '14px 16px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Copy size={16} style={{ color: 'var(--color-primary)' }} />
              <strong>{preview.nombre}</strong>
              <span className="badge badge-neutral">{preview.nivel}</span>
              <span className="badge badge-primary">{preview.duracion_semanas} sem</span>
            </div>
            {preview.descripcion && <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: 4 }}>{preview.descripcion}</p>}
          </div>
          <div style={{ padding: '12px 16px', background: 'var(--color-bg)' }}>
            {preview.routine_days?.sort((a, b) => a.orden - b.orden).map(day => (
              <div key={day.id} style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 4 }}>{day.nombre}</div>
                {day.routine_exercises?.map(ex => (
                  <div key={ex.id} style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', paddingLeft: 12, marginBottom: 2 }}>
                    • {ex.exercises?.nombre} — {ex.series}×{ex.repeticiones}
                    {ex.peso && ` — ${ex.peso}`}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ padding: '10px 16px', background: 'rgba(var(--color-primary-rgb),0.04)', borderTop: '1px solid var(--color-border)', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Se creará una copia editable. Los cambios no afectan al miembro original.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
        <button className="btn btn-primary" onClick={copiar} disabled={!preview || saving}>
          {saving ? 'Copiando...' : 'Copiar y asignar'}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Subcomponente: Crear rutina nueva desde el perfil del miembro
// ─────────────────────────────────────────────────────────────
function CreateRoutine({ memberId, onDone, onCancel }) {
  const [exercises, setExercises] = useState([])
  const [form, setForm] = useState({
    nombre: '', descripcion: '', objetivo: '',
    nivel: 'intermedio', duracion_semanas: 4, es_publica: false
  })
  const [days, setDays] = useState([{
    nombre: 'Día 1',
    ejercicios: [{ exercise_id: '', series: 3, repeticiones: '10-12', peso: '', descanso_segundos: 60, notas: '' }]
  }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('exercises').select('*').eq('activo', true).order('nombre')
      .then(({ data }) => setExercises(data || []))
  }, [])

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const addDay = () => setDays(d => [...d, { nombre: `Día ${d.length + 1}`, ejercicios: [] }])
  const removeDay = i => setDays(d => d.filter((_, idx) => idx !== i))
  const setDayName = (i, v) => setDays(d => d.map((day, idx) => idx === i ? { ...day, nombre: v } : day))
  const addEx = di => setDays(d => d.map((day, i) => i === di
    ? { ...day, ejercicios: [...day.ejercicios, { exercise_id: '', series: 3, repeticiones: '10-12', peso: '', descanso_segundos: 60, notas: '' }] }
    : day))
  const removeEx = (di, ei) => setDays(d => d.map((day, i) => i === di
    ? { ...day, ejercicios: day.ejercicios.filter((_, j) => j !== ei) }
    : day))
  const setExF = (di, ei, field, val) => setDays(d => d.map((day, i) => i === di
    ? { ...day, ejercicios: day.ejercicios.map((ex, j) => j === ei ? { ...ex, [field]: val } : ex) }
    : day))

  async function handleSave(e) {
    e.preventDefault()
    if (!form.nombre) { toast.error('El nombre es requerido'); return }
    setSaving(true)
    try {
      // Crear rutina
      const { data: newRoutine } = await supabase.from('routines').insert({
        nombre: form.nombre,
        descripcion: form.descripcion,
        objetivo: form.objetivo,
        nivel: form.nivel,
        duracion_semanas: parseInt(form.duracion_semanas) || 4,
        es_publica: form.es_publica,
        member_id: form.es_publica ? null : memberId,  // si es privada, vincular al miembro
      }).select().single()

      // Crear días y ejercicios
      for (let di = 0; di < days.length; di++) {
        const day = days[di]
        const { data: newDay } = await supabase.from('routine_days').insert({
          routine_id: newRoutine.id, dia_numero: di + 1, nombre: day.nombre, orden: di
        }).select().single()
        for (let ei = 0; ei < day.ejercicios.length; ei++) {
          const ex = day.ejercicios[ei]
          if (!ex.exercise_id) continue
          await supabase.from('routine_exercises').insert({
            routine_day_id: newDay.id, exercise_id: ex.exercise_id,
            series: parseInt(ex.series) || 3, repeticiones: ex.repeticiones,
            peso: ex.peso || null, descanso_segundos: parseInt(ex.descanso_segundos) || 60,
            notas: ex.notas || null, orden: ei
          })
        }
      }

      // Asignar al miembro
      await supabase.from('member_routines').update({ activa: false }).eq('member_id', memberId).eq('activa', true)
      await supabase.from('member_routines').insert({
        member_id: memberId, routine_id: newRoutine.id,
        activa: true, fecha_inicio: new Date().toISOString().split('T')[0]
      })

      toast.success('Rutina creada y asignada')
      onDone()
    } catch (err) {
      toast.error('Error al guardar rutina')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}><X size={16} /> Volver</button>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem' }}>Nueva rutina</h3>
      </div>

      <form onSubmit={handleSave}>
        {/* Info básica */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><h4 className="card-title">Información general</h4></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Nombre *</label>
              <input className="form-input" value={form.nombre} onChange={e => setF('nombre', e.target.value)} placeholder="Ej: Rutina PPL para Juan" required />
            </div>
            <div className="form-group">
              <label className="form-label">Nivel</label>
              <select className="form-select" value={form.nivel} onChange={e => setF('nivel', e.target.value)}>
                <option value="principiante">Principiante</option>
                <option value="intermedio">Intermedio</option>
                <option value="avanzado">Avanzado</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Duración (semanas)</label>
              <input type="number" className="form-input" min={1} value={form.duracion_semanas} onChange={e => setF('duracion_semanas', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Descripción</label>
              <textarea className="form-textarea" rows={2} value={form.descripcion} onChange={e => setF('descripcion', e.target.value)} />
            </div>
          </div>

          {/* Toggle pública / privada */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            gap: 16, padding: '14px 16px', marginTop: 8,
            background: form.es_publica ? 'rgba(var(--color-primary-rgb),0.05)' : 'var(--color-bg)',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${form.es_publica ? 'rgba(var(--color-primary-rgb),0.2)' : 'var(--color-border)'}`,
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 }}>
                {form.es_publica ? '📚 Plantilla pública' : '🔒 Rutina privada del miembro'}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                {form.es_publica
                  ? 'Aparece en el listado global de Rutinas y puede asignarse a cualquier miembro'
                  : 'Solo visible en el perfil de este miembro, no aparece en el listado global'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setF('es_publica', !form.es_publica)}
              style={{
                width: 44, height: 26, borderRadius: 13, border: 'none',
                background: form.es_publica ? 'var(--color-primary)' : 'var(--color-border)',
                cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0
              }}
            >
              <span style={{
                position: 'absolute', top: 3, left: form.es_publica ? 21 : 3,
                width: 20, height: 20, borderRadius: '50%', background: 'white',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }} />
            </button>
          </div>
        </div>

        {/* Días */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <label className="form-label" style={{ margin: 0 }}>Días de entrenamiento</label>
          <button type="button" className="btn btn-sm btn-secondary" onClick={addDay}><Plus size={14} /> Agregar día</button>
        </div>

        {days.map((day, di) => (
          <div key={di} className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <input className="form-input" value={day.nombre} onChange={e => setDayName(di, e.target.value)} style={{ flex: 1 }} />
              {days.length > 1 && (
                <button type="button" className="btn-icon" style={{ color: 'var(--color-danger)' }} onClick={() => removeDay(di)}>
                  <Trash2 size={15} />
                </button>
              )}
            </div>

            {day.ejercicios.map((ex, ei) => (
              <div key={ei} style={{ display: 'grid', gridTemplateColumns: '2fr 60px 80px 80px 70px auto', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                <select className="form-select" value={ex.exercise_id} onChange={e => setExF(di, ei, 'exercise_id', e.target.value)}>
                  <option value="">Ejercicio...</option>
                  {exercises.map(e => <option key={e.id} value={e.id}>{e.nombre} ({muscleGroupLabel[e.grupo_muscular] || e.grupo_muscular})</option>)}
                </select>
                <input type="number" className="form-input" placeholder="Series" value={ex.series} onChange={e => setExF(di, ei, 'series', e.target.value)} min={1} />
                <input type="text" className="form-input" placeholder="Reps" value={ex.repeticiones} onChange={e => setExF(di, ei, 'repeticiones', e.target.value)} />
                <input type="text" className="form-input" placeholder="Peso" value={ex.peso} onChange={e => setExF(di, ei, 'peso', e.target.value)} />
                <input type="number" className="form-input" placeholder="Desc(s)" value={ex.descanso_segundos} onChange={e => setExF(di, ei, 'descanso_segundos', e.target.value)} />
                <button type="button" className="btn-icon" style={{ color: 'var(--color-danger)' }} onClick={() => removeEx(di, ei)}><Trash2 size={14} /></button>
              </div>
            ))}
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => addEx(di)}><Plus size={14} /> Ejercicio</button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Crear y asignar rutina'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Subcomponente: Ver rutina asignada con edición inline de valores
// ─────────────────────────────────────────────────────────────
function RoutineView({ memberRoutine, onDesasignar, onReemplazar, onRefresh }) {
  const routine = memberRoutine?.routines
  const [editingEx, setEditingEx] = useState(null)   // { dayId, exId }
  const [editVals, setEditVals]   = useState({})
  const [saving, setSaving]       = useState(false)
  const [expanded, setExpanded]   = useState(null)

  function startEdit(ex) {
    setEditingEx(ex.id)
    setEditVals({ series: ex.series, repeticiones: ex.repeticiones, peso: ex.peso || '', descanso_segundos: ex.descanso_segundos, notas: ex.notas || '' })
  }

  async function saveEdit(exId) {
    setSaving(true)
    const { error } = await supabase.from('routine_exercises').update({
      series: parseInt(editVals.series) || 3,
      repeticiones: editVals.repeticiones,
      peso: editVals.peso || null,
      descanso_segundos: parseInt(editVals.descanso_segundos) || 60,
      notas: editVals.notas || null,
    }).eq('id', exId)
    setSaving(false)
    if (error) { toast.error('Error al guardar'); return }
    toast.success('Valores actualizados')
    setEditingEx(null)
    onRefresh()
  }

  return (
    <div>
      {/* Header de la rutina */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: 6 }}>{routine?.nombre}</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-neutral">{routine?.nivel}</span>
              <span className="badge badge-primary">{routine?.duracion_semanas} semanas</span>
              <span className="badge badge-neutral">{routine?.routine_days?.length || 0} días</span>
              {!routine?.es_publica && <span className="badge badge-neutral">🔒 Privada</span>}
            </div>
            {routine?.descripcion && <p style={{ marginTop: 8, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{routine.descripcion}</p>}
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
              Asignada el {new Date(memberRoutine.fecha_inicio).toLocaleDateString('es-AR')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn btn-sm btn-secondary" onClick={onReemplazar}>
              <ListChecks size={14} /> Cambiar
            </button>
            <button className="btn btn-sm btn-ghost" onClick={onDesasignar} style={{ color: 'var(--color-danger)' }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Días */}
      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
        Hacé clic en ✏️ para editar series, reps o peso de un ejercicio sin modificar la plantilla original.
      </p>

      {routine?.routine_days?.sort((a, b) => a.orden - b.orden).map(day => (
        <div key={day.id} className="card" style={{ marginBottom: 12, overflow: 'hidden' }}>
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '14px 16px' }}
            onClick={() => setExpanded(expanded === day.id ? null : day.id)}
          >
            <h4 style={{ fontWeight: 700 }}>{day.nombre}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                {day.routine_exercises?.length || 0} ejercicios
              </span>
              {expanded === day.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>

          {expanded === day.id && (
            <div style={{ borderTop: '1px solid var(--color-border)' }}>
              {day.routine_exercises?.sort((a, b) => a.orden - b.orden).map(ex => (
                <div key={ex.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', background: editingEx === ex.id ? 'rgba(var(--color-primary-rgb),0.03)' : 'transparent' }}>
                  {editingEx === ex.id ? (
                    // ── Modo edición inline ──
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 10 }}>{ex.exercises?.nombre}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '60px 90px 90px 80px', gap: 8, marginBottom: 10 }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 3 }}>Series</label>
                          <input type="number" className="form-input" value={editVals.series} onChange={e => setEditVals(v => ({ ...v, series: e.target.value }))} min={1} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 3 }}>Reps</label>
                          <input type="text" className="form-input" value={editVals.repeticiones} onChange={e => setEditVals(v => ({ ...v, repeticiones: e.target.value }))} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 3 }}>Peso</label>
                          <input type="text" className="form-input" value={editVals.peso} onChange={e => setEditVals(v => ({ ...v, peso: e.target.value }))} placeholder="Ej: 40kg" />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 3 }}>Desc (seg)</label>
                          <input type="number" className="form-input" value={editVals.descanso_segundos} onChange={e => setEditVals(v => ({ ...v, descanso_segundos: e.target.value }))} />
                        </div>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 3 }}>Notas</label>
                        <input type="text" className="form-input" value={editVals.notas} onChange={e => setEditVals(v => ({ ...v, notas: e.target.value }))} placeholder="Opcional..." />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-sm btn-primary" onClick={() => saveEdit(ex.id)} disabled={saving}>
                          <Check size={14} /> {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => setEditingEx(null)}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    // ── Modo vista ──
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{ex.exercises?.nombre}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {ex.series} series × {ex.repeticiones} reps
                          {ex.peso && <span> — <strong style={{ color: 'var(--color-text)' }}>{ex.peso}</strong></span>}
                          {ex.descanso_segundos && ` — ${ex.descanso_segundos}s descanso`}
                        </div>
                        {ex.notas && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2, fontStyle: 'italic' }}>{ex.notas}</div>}
                      </div>
                      <button className="btn-icon" title="Editar valores" onClick={() => startEdit(ex)}>
                        <Edit2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
