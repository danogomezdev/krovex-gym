import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { muscleGroupLabel } from '../../utils/helpers'
import { Plus, Edit, Trash2, Dumbbell, Search } from 'lucide-react'
import toast from 'react-hot-toast'

const MUSCLE_GROUPS = Object.keys(muscleGroupLabel)
const EMPTY = { nombre: '', grupo_muscular: 'pecho', descripcion: '', gif_url: '', activo: true }

export default function ExercisesPage() {
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editEx, setEditEx] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadExercises() }, [])

  const loadExercises = async () => {
    setLoading(true)
    const { data } = await supabase.from('exercises').select('*').order('grupo_muscular').order('nombre')
    setExercises(data || [])
    setLoading(false)
  }

  const filtered = exercises.filter(e => {
    const matchSearch = !search || e.nombre.toLowerCase().includes(search.toLowerCase())
    const matchGroup = groupFilter === 'all' || e.grupo_muscular === groupFilter
    return matchSearch && matchGroup
  })

  const grouped = MUSCLE_GROUPS.reduce((acc, g) => {
    const items = filtered.filter(e => e.grupo_muscular === g)
    if (items.length) acc[g] = items
    return acc
  }, {})

  const openModal = (ex = null) => {
    setEditEx(ex)
    setForm(ex ? { ...ex } : EMPTY)
    setShowModal(true)
  }

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const handleSave = async (ev) => {
    ev.preventDefault()
    setSaving(true)
    const data = { nombre: form.nombre, grupo_muscular: form.grupo_muscular, descripcion: form.descripcion || null, gif_url: form.gif_url || null, activo: form.activo }
    const { error } = editEx
      ? await supabase.from('exercises').update(data).eq('id', editEx.id)
      : await supabase.from('exercises').insert(data)
    setSaving(false)
    if (error) { toast.error('Error al guardar'); return }
    toast.success(editEx ? 'Ejercicio actualizado' : 'Ejercicio creado')
    setShowModal(false)
    loadExercises()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este ejercicio?')) return
    const { error } = await supabase.from('exercises').delete().eq('id', id)
    if (error) { toast.error('No se puede eliminar. Puede estar en uso en rutinas.'); return }
    toast.success('Ejercicio eliminado')
    loadExercises()
  }

  const groupColors = {
    pecho: '#3b82f6', espalda: '#8b5cf6', hombros: '#06b6d4',
    brazos: '#f59e0b', piernas: '#ef4444', core: '#10b981',
    gluteos: '#ec4899', full_body: '#6366f1'
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ejercicios</h1>
          <p className="page-subtitle">{exercises.length} ejercicios en la base de datos</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> Nuevo ejercicio
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrapper" style={{ flex: 1, maxWidth: 320 }}>
          <Search size={16} className="search-icon" />
          <input type="text" className="form-input" placeholder="Buscar ejercicio..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 180 }} value={groupFilter} onChange={e => setGroupFilter(e.target.value)}>
          <option value="all">Todos los grupos</option>
          {MUSCLE_GROUPS.map(g => <option key={g} value={g}>{muscleGroupLabel[g]}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-state-icon"><Dumbbell size={28} /></div><h3>Sin ejercicios</h3></div></div>
      ) : (
        Object.entries(grouped).map(([group, exs]) => (
          <div key={group} style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: groupColors[group] }} />
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>{muscleGroupLabel[group]}</h3>
              <span className="badge badge-neutral">{exs.length}</span>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr><th>Nombre</th><th>Descripción</th><th>Estado</th><th></th></tr>
                </thead>
                <tbody>
                  {exs.map(ex => (
                    <tr key={ex.id}>
                      <td style={{ fontWeight: 500 }}>
                        {ex.gif_url && <img src={ex.gif_url} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, marginRight: 8, verticalAlign: 'middle' }} />}
                        {ex.nombre}
                      </td>
                      <td className="text-sm text-muted">{ex.descripcion || '—'}</td>
                      <td><span className={`badge ${ex.activo ? 'badge-success' : 'badge-neutral'}`}>{ex.activo ? 'Activo' : 'Inactivo'}</span></td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn-icon" onClick={() => openModal(ex)}><Edit size={15} /></button>
                          <button className="btn-icon" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(ex.id)}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editEx ? 'Editar ejercicio' : 'Nuevo ejercicio'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input type="text" className="form-input" value={form.nombre} onChange={set('nombre')} required placeholder="Press de banca" />
              </div>
              <div className="form-group">
                <label className="form-label">Grupo muscular *</label>
                <select className="form-select" value={form.grupo_muscular} onChange={set('grupo_muscular')}>
                  {MUSCLE_GROUPS.map(g => <option key={g} value={g}>{muscleGroupLabel[g]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea className="form-textarea" value={form.descripcion} onChange={set('descripcion')} rows={2} />
              </div>
              <div className="form-group">
                <label className="form-label">URL de GIF / imagen referencia</label>
                <input type="url" className="form-input" value={form.gif_url} onChange={set('gif_url')} placeholder="https://..." />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.activo} onChange={set('activo')} />
                <span className="form-label" style={{ margin: 0 }}>Activo</span>
              </label>
              <div className="flex gap-3">
                <button type="button" className="btn btn-secondary w-full" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary w-full" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
