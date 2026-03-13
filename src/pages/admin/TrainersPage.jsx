import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { getInitials, getAvatarColor, formatCurrency } from '../../utils/helpers'
import { Plus, Edit, Trash2, User } from 'lucide-react'
import toast from 'react-hot-toast'

const SPECIALTIES = ['musculacion', 'funcional', 'yoga', 'pilates', 'spinning', 'crossfit', 'natacion', 'rehabilitacion']
const EMPTY_FORM = { nombre: '', apellido: '', email: '', telefono: '', especialidades: [], bio: '', activo: true, comision_por_clase: '' }

export default function TrainersPage() {
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTrainer, setEditTrainer] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadTrainers() }, [])

  const loadTrainers = async () => {
    setLoading(true)
    const { data } = await supabase.from('trainers').select('*').order('nombre')
    setTrainers(data || [])
    setLoading(false)
  }

  const openModal = (trainer = null) => {
    setEditTrainer(trainer)
    setForm(trainer ? { ...trainer, especialidades: trainer.especialidades || [], comision_por_clase: trainer.comision_por_clase || '' } : EMPTY_FORM)
    setShowModal(true)
  }

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const toggleSpec = (s) => setForm(p => ({
    ...p,
    especialidades: p.especialidades.includes(s) ? p.especialidades.filter(x => x !== s) : [...p.especialidades, s]
  }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const data = {
      nombre: form.nombre, apellido: form.apellido,
      email: form.email || null, telefono: form.telefono || null,
      especialidades: form.especialidades, bio: form.bio || null,
      activo: form.activo,
      comision_por_clase: form.comision_por_clase ? parseFloat(form.comision_por_clase) : 0
    }
    const { error } = editTrainer
      ? await supabase.from('trainers').update(data).eq('id', editTrainer.id)
      : await supabase.from('trainers').insert(data)
    setSaving(false)
    if (error) { toast.error('Error al guardar entrenador'); return }
    toast.success(editTrainer ? 'Entrenador actualizado' : 'Entrenador creado')
    setShowModal(false)
    loadTrainers()
  }

  const handleDelete = async (t) => {
    if (!window.confirm(`¿Eliminar a ${t.nombre} ${t.apellido}?`)) return
    const { error } = await supabase.from('trainers').delete().eq('id', t.id)
    if (error) { toast.error('No se puede eliminar. Puede tener clases asignadas.'); return }
    toast.success('Entrenador eliminado')
    loadTrainers()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Entrenadores</h1>
          <p className="page-subtitle">{trainers.filter(t => t.activo).length} activos</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> Nuevo entrenador
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : trainers.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><User size={28} /></div>
            <h3>No hay entrenadores</h3>
            <button className="btn btn-primary" onClick={() => openModal()}><Plus size={16} /> Agregar</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          {trainers.map(t => (
            <div key={t.id} className="card" style={{ opacity: t.activo ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: getAvatarColor(t.email || t.nombre),
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '1rem', flexShrink: 0
                }}>
                  {getInitials(t.nombre, t.apellido)}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>{t.nombre} {t.apellido}</h3>
                  <p className="text-sm text-muted">{t.email || 'Sin email'}</p>
                </div>
                <div className="flex gap-1">
                  <button className="btn-icon" onClick={() => openModal(t)}><Edit size={15} /></button>
                  <button className="btn-icon" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(t)}><Trash2 size={15} /></button>
                </div>
              </div>
              {t.especialidades?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 'var(--space-2)' }}>
                  {t.especialidades.map(s => (
                    <span key={s} className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{s}</span>
                  ))}
                </div>
              )}
              {t.bio && <p className="text-sm text-muted">{t.bio}</p>}
              <div style={{ marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border)' }}>
                <span className="text-xs text-muted">Comisión por clase: </span>
                <span className="font-mono" style={{ fontSize: '0.875rem', fontWeight: 600 }}>{formatCurrency(t.comision_por_clase)}</span>
              </div>
              {!t.activo && <span className="badge badge-neutral" style={{ marginTop: 'var(--space-2)' }}>Inactivo</span>}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editTrainer ? 'Editar entrenador' : 'Nuevo entrenador'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input type="text" className="form-input" value={form.nombre} onChange={set('nombre')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido *</label>
                  <input type="text" className="form-input" value={form.apellido} onChange={set('apellido')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={form.email} onChange={set('email')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input type="text" className="form-input" value={form.telefono} onChange={set('telefono')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Comisión por clase</label>
                  <input type="number" className="form-input font-mono" value={form.comision_por_clase} onChange={set('comision_por_clase')} placeholder="1500" min="0" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Especialidades</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {SPECIALTIES.map(s => (
                    <button key={s} type="button"
                      className={`badge ${form.especialidades.includes(s) ? 'badge-primary' : 'badge-neutral'}`}
                      style={{ cursor: 'pointer', padding: '4px 12px' }}
                      onClick={() => toggleSpec(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Biografía / Descripción</label>
                <textarea className="form-textarea" value={form.bio} onChange={set('bio')} rows={3} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.activo} onChange={set('activo')} />
                <span className="form-label" style={{ margin: 0 }}>Activo</span>
              </label>
              <div className="flex gap-3">
                <button type="button" className="btn btn-secondary w-full" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary w-full" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
