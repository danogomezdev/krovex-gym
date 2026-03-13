import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDate, formatDateTime, formatTime } from '../../utils/helpers'
import { Plus, Edit, Trash2, Users, Zap, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import './ClassesPage.css'

const EMPTY_CLASS = {
  nombre: '', class_type_id: '', trainer_id: '', fecha_hora: '',
  duracion_minutos: 60, cupo_maximo: 20, ubicacion: '', descripcion: '', activa: true
}

export default function ClassesPage() {
  const [classes, setClasses] = useState([])
  const [classTypes, setClassTypes] = useState([])
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editClass, setEditClass] = useState(null)
  const [form, setForm] = useState(EMPTY_CLASS)
  const [saving, setSaving] = useState(false)
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [typeForm, setTypeForm] = useState({ nombre: '', tipo: 'otro', color: '#2563EB', descripcion: '' })

  useEffect(() => {
    Promise.all([loadClasses(), loadClassTypes(), loadTrainers()])
  }, [])

  const loadClasses = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('classes')
      .select('*, class_types(*), trainers(nombre, apellido)')
      .order('fecha_hora', { ascending: true })
      .gte('fecha_hora', new Date().toISOString().split('T')[0])
      .limit(50)
    setClasses(data || [])
    setLoading(false)
  }

  const loadClassTypes = async () => {
    const { data } = await supabase.from('class_types').select('*').eq('activo', true)
    setClassTypes(data || [])
  }

  const loadTrainers = async () => {
    const { data } = await supabase.from('trainers').select('*').eq('activo', true)
    setTrainers(data || [])
  }

  const openModal = (cls = null) => {
    setEditClass(cls)
    if (cls) {
      setForm({
        nombre: cls.nombre,
        class_type_id: cls.class_type_id || '',
        trainer_id: cls.trainer_id || '',
        fecha_hora: cls.fecha_hora ? new Date(cls.fecha_hora).toISOString().slice(0, 16) : '',
        duracion_minutos: cls.duracion_minutos,
        cupo_maximo: cls.cupo_maximo,
        ubicacion: cls.ubicacion || '',
        descripcion: cls.descripcion || '',
        activa: cls.activa
      })
    } else {
      setForm(EMPTY_CLASS)
    }
    setShowModal(true)
  }

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const data = {
      nombre: form.nombre,
      class_type_id: form.class_type_id || null,
      trainer_id: form.trainer_id || null,
      fecha_hora: form.fecha_hora,
      duracion_minutos: parseInt(form.duracion_minutos),
      cupo_maximo: parseInt(form.cupo_maximo),
      cupo_disponible: editClass ? editClass.cupo_disponible : parseInt(form.cupo_maximo),
      ubicacion: form.ubicacion || null,
      descripcion: form.descripcion || null,
      activa: form.activa
    }
    const { error } = editClass
      ? await supabase.from('classes').update(data).eq('id', editClass.id)
      : await supabase.from('classes').insert(data)
    setSaving(false)
    if (error) { toast.error('Error al guardar clase'); return }
    toast.success(editClass ? 'Clase actualizada' : 'Clase creada')
    setShowModal(false)
    loadClasses()
  }

  const handleDelete = async (cls) => {
    if (!window.confirm(`¿Eliminar la clase "${cls.nombre}"?`)) return
    await supabase.from('classes').delete().eq('id', cls.id)
    toast.success('Clase eliminada')
    loadClasses()
  }

  const saveClassType = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('class_types').insert(typeForm)
    if (error) { toast.error('Error al crear tipo'); return }
    toast.success('Tipo de clase creado')
    setShowTypeModal(false)
    setTypeForm({ nombre: '', tipo: 'otro', color: '#2563EB', descripcion: '' })
    loadClassTypes()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clases</h1>
          <p className="page-subtitle">Próximas {classes.length} clases programadas</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary" onClick={() => setShowTypeModal(true)}>
            <Plus size={18} /> Tipo de clase
          </button>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <Plus size={18} /> Nueva clase
          </button>
        </div>
      </div>

      {/* Class types */}
      {classTypes.length > 0 && (
        <div className="class-types-row">
          {classTypes.map(ct => (
            <div key={ct.id} className="class-type-chip" style={{ borderColor: ct.color, color: ct.color }}>
              <div className="class-type-dot" style={{ background: ct.color }} />
              {ct.nombre}
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : classes.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Zap size={28} /></div>
            <h3>No hay clases programadas</h3>
            <p>Creá la primera clase del gimnasio</p>
            <button className="btn btn-primary" onClick={() => openModal()}><Plus size={16} /> Nueva clase</button>
          </div>
        </div>
      ) : (
        <div className="classes-grid">
          {classes.map(cls => (
            <div key={cls.id} className={`class-card ${!cls.activa ? 'inactive' : ''}`}>
              <div className="class-card-header">
                <div className="class-type-badge" style={{ background: cls.class_types?.color + '20', color: cls.class_types?.color }}>
                  {cls.class_types?.nombre || 'Clase'}
                </div>
                <div className="flex gap-2">
                  <button className="btn-icon" onClick={() => openModal(cls)}><Edit size={15} /></button>
                  <button className="btn-icon" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(cls)}><Trash2 size={15} /></button>
                </div>
              </div>
              <h3 className="class-card-name">{cls.nombre}</h3>
              <div className="class-card-meta">
                <div className="class-meta-item">
                  <Clock size={14} />
                  {new Date(cls.fecha_hora).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })} — {formatTime(cls.fecha_hora)}
                </div>
                <div className="class-meta-item">
                  <Users size={14} />
                  {cls.cupo_disponible}/{cls.cupo_maximo} lugares
                </div>
                {cls.trainers && (
                  <div className="class-meta-item">
                    👤 {cls.trainers.nombre} {cls.trainers.apellido}
                  </div>
                )}
              </div>
              <div className="class-capacity-bar">
                <div
                  className="class-capacity-fill"
                  style={{
                    width: `${((cls.cupo_maximo - cls.cupo_disponible) / cls.cupo_maximo) * 100}%`,
                    background: cls.cupo_disponible === 0 ? 'var(--color-danger)' : 'var(--color-primary)'
                  }}
                />
              </div>
              {cls.cupo_disponible === 0 && <span className="badge badge-danger" style={{ marginTop: 4 }}>Llena</span>}
            </div>
          ))}
        </div>
      )}

      {/* Class modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editClass ? 'Editar clase' : 'Nueva clase'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input type="text" className="form-input" value={form.nombre} onChange={set('nombre')} required placeholder="Spinning Mañana" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Tipo de clase</label>
                  <select className="form-select" value={form.class_type_id} onChange={set('class_type_id')}>
                    <option value="">Sin tipo</option>
                    {classTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Entrenador</label>
                  <select className="form-select" value={form.trainer_id} onChange={set('trainer_id')}>
                    <option value="">Sin asignar</option>
                    {trainers.map(t => <option key={t.id} value={t.id}>{t.nombre} {t.apellido}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha y hora *</label>
                  <input type="datetime-local" className="form-input" value={form.fecha_hora} onChange={set('fecha_hora')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Duración (minutos)</label>
                  <input type="number" className="form-input" value={form.duracion_minutos} onChange={set('duracion_minutos')} min={15} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cupo máximo</label>
                  <input type="number" className="form-input" value={form.cupo_maximo} onChange={set('cupo_maximo')} min={1} />
                </div>
                <div className="form-group">
                  <label className="form-label">Ubicación</label>
                  <input type="text" className="form-input" value={form.ubicacion} onChange={set('ubicacion')} placeholder="Sala 1" />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.activa} onChange={set('activa')} />
                <span className="form-label" style={{ margin: 0 }}>Clase activa</span>
              </label>
              <div className="flex gap-3">
                <button type="button" className="btn btn-secondary w-full" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary w-full" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar clase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class type modal */}
      {showTypeModal && (
        <div className="modal-overlay" onClick={() => setShowTypeModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nuevo tipo de clase</h2>
              <button className="btn-icon" onClick={() => setShowTypeModal(false)}>✕</button>
            </div>
            <form onSubmit={saveClassType} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input type="text" className="form-input" value={typeForm.nombre} onChange={e => setTypeForm(p => ({ ...p, nombre: e.target.value }))} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select className="form-select" value={typeForm.tipo} onChange={e => setTypeForm(p => ({ ...p, tipo: e.target.value }))}>
                    {['musculacion','spinning','yoga','pilates','crossfit','natacion','funcional','otro'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <input type="color" className="form-input" value={typeForm.color} onChange={e => setTypeForm(p => ({ ...p, color: e.target.value }))} style={{ height: 42, padding: 4 }} />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" className="btn btn-secondary w-full" onClick={() => setShowTypeModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary w-full">Crear tipo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
