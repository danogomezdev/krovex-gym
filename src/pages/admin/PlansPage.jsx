import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../utils/helpers'
import { Plus, Edit, Trash2, Tag, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY_PLAN = {
  nombre: '', descripcion: '', duracion_dias: '', cantidad_clases: '', precio: '',
  areas: [], activo: true, es_familiar: false, descuento_familiar: ''
}

const AREAS = ['musculacion', 'pilates', 'spinning', 'crossfit', 'yoga', 'natacion', 'funcional']

export default function PlansPage() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editPlan, setEditPlan] = useState(null)
  const [form, setForm] = useState(EMPTY_PLAN)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadPlans() }, [])

  const loadPlans = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('membership_plans').select('*').order('precio')
    if (error) toast.error('Error al cargar planes')
    else setPlans(data || [])
    setLoading(false)
  }

  const openModal = (plan = null) => {
    setEditPlan(plan)
    setForm(plan ? { ...plan, areas: plan.areas || [] } : EMPTY_PLAN)
    setShowModal(true)
  }

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const toggleArea = (area) => {
    setForm(prev => ({
      ...prev,
      areas: prev.areas.includes(area) ? prev.areas.filter(a => a !== area) : [...prev.areas, area]
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const data = {
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      duracion_dias: form.duracion_dias ? parseInt(form.duracion_dias) : null,
      cantidad_clases: form.cantidad_clases ? parseInt(form.cantidad_clases) : null,
      precio: parseFloat(form.precio),
      areas: form.areas,
      activo: form.activo,
      es_familiar: form.es_familiar,
      descuento_familiar: form.descuento_familiar ? parseFloat(form.descuento_familiar) : 0
    }

    const { error } = editPlan
      ? await supabase.from('membership_plans').update(data).eq('id', editPlan.id)
      : await supabase.from('membership_plans').insert(data)

    setSaving(false)
    if (error) { toast.error('Error al guardar plan'); return }
    toast.success(editPlan ? 'Plan actualizado' : 'Plan creado')
    setShowModal(false)
    loadPlans()
  }

  const handleDelete = async (plan) => {
    if (!window.confirm(`¿Eliminar el plan "${plan.nombre}"?`)) return
    const { error } = await supabase.from('membership_plans').delete().eq('id', plan.id)
    if (error) { toast.error('Error al eliminar. Puede tener membresías asociadas.'); return }
    toast.success('Plan eliminado')
    loadPlans()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Planes de membresía</h1>
          <p className="page-subtitle">{plans.length} planes configurados</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> Nuevo plan
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /><p>Cargando...</p></div>
      ) : plans.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Tag size={28} /></div>
            <h3>No hay planes</h3>
            <p>Creá el primer plan de membresía</p>
            <button className="btn btn-primary" onClick={() => openModal()}>
              <Plus size={16} /> Crear plan
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
          {plans.map(plan => (
            <div key={plan.id} className="card plan-card" style={{ opacity: plan.activo ? 1 : 0.6 }}>
              <div className="card-header">
                <div>
                  <h3 className="card-title" style={{ fontSize: '1.1rem' }}>{plan.nombre}</h3>
                  {!plan.activo && <span className="badge badge-neutral">Inactivo</span>}
                </div>
                <div className="flex gap-2">
                  <button className="btn-icon" onClick={() => openModal(plan)}><Edit size={16} /></button>
                  <button className="btn-icon" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(plan)}><Trash2 size={16} /></button>
                </div>
              </div>

              <div className="plan-price">
                <span>{formatCurrency(plan.precio)}</span>
                {plan.duracion_dias && <span className="plan-period">/ {plan.duracion_dias} días</span>}
                {plan.cantidad_clases && <span className="plan-period">— {plan.cantidad_clases} clases</span>}
              </div>

              {plan.descripcion && <p className="text-sm text-muted">{plan.descripcion}</p>}

              {plan.areas?.length > 0 && (
                <div className="plan-areas">
                  {plan.areas.map(a => (
                    <span key={a} className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{a}</span>
                  ))}
                </div>
              )}

              {plan.es_familiar && (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-success)', marginTop: 'var(--space-2)' }}>
                  <CheckCircle size={14} />
                  Plan familiar — {plan.descuento_familiar}% descuento
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editPlan ? 'Editar plan' : 'Nuevo plan'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="grid-2 gap-4">
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Nombre del plan *</label>
                  <input type="text" className="form-input" value={form.nombre} onChange={set('nombre')} required placeholder="Mensual Musculación" />
                </div>
                <div className="form-group">
                  <label className="form-label">Precio *</label>
                  <input type="number" className="form-input font-mono" value={form.precio} onChange={set('precio')} required placeholder="15000" min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Duración (días)</label>
                  <input type="number" className="form-input" value={form.duracion_dias} onChange={set('duracion_dias')} placeholder="30" min="1" />
                </div>
                <div className="form-group">
                  <label className="form-label">Cantidad de clases</label>
                  <input type="number" className="form-input" value={form.cantidad_clases} onChange={set('cantidad_clases')} placeholder="10" min="1" />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Descripción</label>
                  <textarea className="form-textarea" value={form.descripcion} onChange={set('descripcion')} rows={2} placeholder="Descripción del plan..." />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Áreas incluidas</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {AREAS.map(area => (
                    <button
                      key={area}
                      type="button"
                      className={`badge ${form.areas.includes(area) ? 'badge-primary' : 'badge-neutral'}`}
                      style={{ cursor: 'pointer', padding: '4px 12px' }}
                      onClick={() => toggleArea(area)}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.activo} onChange={set('activo')} />
                  <span className="form-label" style={{ margin: 0 }}>Plan activo</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.es_familiar} onChange={set('es_familiar')} />
                  <span className="form-label" style={{ margin: 0 }}>Plan familiar</span>
                </label>
              </div>

              {form.es_familiar && (
                <div className="form-group">
                  <label className="form-label">Descuento familiar (%)</label>
                  <input type="number" className="form-input" value={form.descuento_familiar} onChange={set('descuento_familiar')} placeholder="10" min="0" max="100" />
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" className="btn btn-secondary w-full" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary w-full" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .plan-card {}
        .plan-price { font-family: var(--font-display); font-size: 2rem; color: var(--color-primary); display: flex; align-items: baseline; gap: var(--space-2); margin: var(--space-3) 0; }
        .plan-period { font-family: var(--font-body); font-size: 0.875rem; color: var(--color-text-muted); }
        .plan-areas { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-2); }
      `}</style>
    </div>
  )
}
