import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../utils/helpers'
import { Package, Plus, Edit, Trash2, AlertTriangle, Wrench } from 'lucide-react'
import toast from 'react-hot-toast'

export default function InventoryPage() {
  const [tab, setTab] = useState('equipment')
  const [equipment, setEquipment] = useState([])
  const [supplies, setSupplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [eqForm, setEqForm] = useState({ nombre: '', marca: '', modelo: '', area: '', estado: 'operativo', fecha_compra: '', ultima_revision: '', proxima_revision: '', notas: '' })
  const [supForm, setSupForm] = useState({ nombre: '', categoria: '', stock_actual: '', stock_minimo: '', unidad: 'unidad', precio_unitario: '' })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [eqRes, supRes] = await Promise.all([
      supabase.from('equipment').select('*').order('nombre'),
      supabase.from('supplies').select('*').order('nombre')
    ])
    setEquipment(eqRes.data || [])
    setSupplies(supRes.data || [])
    setLoading(false)
  }

  const openModal = (item = null) => {
    setEditItem(item)
    if (tab === 'equipment') {
      setEqForm(item ? { nombre: item.nombre, marca: item.marca || '', modelo: item.modelo || '', area: item.area || '', estado: item.estado, fecha_compra: item.fecha_compra || '', ultima_revision: item.ultima_revision || '', proxima_revision: item.proxima_revision || '', notas: item.notas || '' } : { nombre: '', marca: '', modelo: '', area: '', estado: 'operativo', fecha_compra: '', ultima_revision: '', proxima_revision: '', notas: '' })
    } else {
      setSupForm(item ? { nombre: item.nombre, categoria: item.categoria || '', stock_actual: item.stock_actual || '', stock_minimo: item.stock_minimo || '', unidad: item.unidad, precio_unitario: item.precio_unitario || '' } : { nombre: '', categoria: '', stock_actual: '', stock_minimo: '', unidad: 'unidad', precio_unitario: '' })
    }
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    if (tab === 'equipment') {
      const data = { ...eqForm, fecha_compra: eqForm.fecha_compra || null, ultima_revision: eqForm.ultima_revision || null, proxima_revision: eqForm.proxima_revision || null }
      const { error } = editItem ? await supabase.from('equipment').update(data).eq('id', editItem.id) : await supabase.from('equipment').insert(data)
      if (error) { toast.error('Error al guardar'); setSaving(false); return }
    } else {
      const data = { ...supForm, stock_actual: parseInt(supForm.stock_actual) || 0, stock_minimo: parseInt(supForm.stock_minimo) || 0, precio_unitario: supForm.precio_unitario ? parseFloat(supForm.precio_unitario) : null }
      const { error } = editItem ? await supabase.from('supplies').update(data).eq('id', editItem.id) : await supabase.from('supplies').insert(data)
      if (error) { toast.error('Error al guardar'); setSaving(false); return }
    }
    setSaving(false)
    toast.success('Guardado correctamente')
    setShowModal(false)
    loadData()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este registro?')) return
    await supabase.from(tab === 'equipment' ? 'equipment' : 'supplies').delete().eq('id', id)
    toast.success('Eliminado')
    loadData()
  }

  const setEq = (f) => (e) => setEqForm(p => ({ ...p, [f]: e.target.value }))
  const setSup = (f) => (e) => setSupForm(p => ({ ...p, [f]: e.target.value }))

  const statusBadge = { operativo: 'badge-success', mantenimiento: 'badge-warning', baja: 'badge-neutral' }
  const statusLabel = { operativo: 'Operativo', mantenimiento: 'En mantenimiento', baja: 'Dado de baja' }

  const lowStockSupplies = supplies.filter(s => s.stock_actual <= s.stock_minimo)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventario</h1>
          <p className="page-subtitle">Equipos e insumos del gimnasio</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> {tab === 'equipment' ? 'Nuevo equipo' : 'Nuevo insumo'}
        </button>
      </div>

      {lowStockSupplies.length > 0 && (
        <div style={{ background: 'var(--color-warning-light)', border: '1px solid #fcd34d', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-warning)' }}>
          <AlertTriangle size={18} />
          <strong>{lowStockSupplies.length} insumo{lowStockSupplies.length > 1 ? 's' : ''} bajo stock mínimo:</strong>
          {lowStockSupplies.map(s => s.nombre).join(', ')}
        </div>
      )}

      <div style={{ display: 'flex', gap: 2, background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: 4, width: 'fit-content', marginBottom: 'var(--space-4)' }}>
        {['equipment', 'supplies'].map(t => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t)}>
            {t === 'equipment' ? '🏋️ Equipos' : '📦 Insumos'}
          </button>
        ))}
      </div>

      {loading ? <div className="loading-spinner"><div className="spinner" /></div> : (
        <div className="table-container">
          {tab === 'equipment' ? (
            equipment.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon"><Package size={28} /></div><h3>Sin equipos registrados</h3></div>
            ) : (
              <table className="table">
                <thead><tr><th>Equipo</th><th>Marca/Modelo</th><th>Área</th><th>Estado</th><th>Últ. revisión</th><th>Próx. revisión</th><th></th></tr></thead>
                <tbody>
                  {equipment.map(eq => (
                    <tr key={eq.id}>
                      <td style={{ fontWeight: 500 }}>{eq.nombre}</td>
                      <td className="text-sm text-muted">{[eq.marca, eq.modelo].filter(Boolean).join(' ')|| '—'}</td>
                      <td>{eq.area || '—'}</td>
                      <td><span className={`badge ${statusBadge[eq.estado]}`}>{statusLabel[eq.estado]}</span></td>
                      <td>{eq.ultima_revision ? formatDate(eq.ultima_revision) : '—'}</td>
                      <td>{eq.proxima_revision ? formatDate(eq.proxima_revision) : '—'}</td>
                      <td><div className="flex gap-2">
                        <button className="btn-icon" onClick={() => openModal(eq)}><Edit size={15} /></button>
                        <button className="btn-icon" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(eq.id)}><Trash2 size={15} /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            supplies.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon"><Package size={28} /></div><h3>Sin insumos registrados</h3></div>
            ) : (
              <table className="table">
                <thead><tr><th>Insumo</th><th>Categoría</th><th>Stock actual</th><th>Stock mínimo</th><th>Unidad</th><th></th></tr></thead>
                <tbody>
                  {supplies.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 500 }}>{s.nombre}</td>
                      <td>{s.categoria || '—'}</td>
                      <td>
                        <span className={`font-mono ${s.stock_actual <= s.stock_minimo ? 'status-vencido' : 'status-activo'}`} style={{ fontWeight: 600 }}>
                          {s.stock_actual}
                        </span>
                        {s.stock_actual <= s.stock_minimo && <AlertTriangle size={14} color="var(--color-warning)" style={{ marginLeft: 4, verticalAlign: 'middle' }} />}
                      </td>
                      <td className="font-mono">{s.stock_minimo}</td>
                      <td>{s.unidad}</td>
                      <td><div className="flex gap-2">
                        <button className="btn-icon" onClick={() => openModal(s)}><Edit size={15} /></button>
                        <button className="btn-icon" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(s.id)}><Trash2 size={15} /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editItem ? 'Editar' : 'Nuevo'} {tab === 'equipment' ? 'equipo' : 'insumo'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              {tab === 'equipment' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Nombre *</label>
                    <input type="text" className="form-input" value={eqForm.nombre} onChange={setEq('nombre')} required />
                  </div>
                  <div className="form-group"><label className="form-label">Marca</label><input type="text" className="form-input" value={eqForm.marca} onChange={setEq('marca')} /></div>
                  <div className="form-group"><label className="form-label">Modelo</label><input type="text" className="form-input" value={eqForm.modelo} onChange={setEq('modelo')} /></div>
                  <div className="form-group"><label className="form-label">Área</label><input type="text" className="form-input" value={eqForm.area} onChange={setEq('area')} placeholder="musculacion, spinning..." /></div>
                  <div className="form-group"><label className="form-label">Estado</label>
                    <select className="form-select" value={eqForm.estado} onChange={setEq('estado')}>
                      <option value="operativo">Operativo</option><option value="mantenimiento">En mantenimiento</option><option value="baja">Baja</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Fecha compra</label><input type="date" className="form-input" value={eqForm.fecha_compra} onChange={setEq('fecha_compra')} /></div>
                  <div className="form-group"><label className="form-label">Última revisión</label><input type="date" className="form-input" value={eqForm.ultima_revision} onChange={setEq('ultima_revision')} /></div>
                  <div className="form-group"><label className="form-label">Próxima revisión</label><input type="date" className="form-input" value={eqForm.proxima_revision} onChange={setEq('proxima_revision')} /></div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Notas</label><textarea className="form-textarea" value={eqForm.notas} onChange={setEq('notas')} rows={2} /></div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Nombre *</label><input type="text" className="form-input" value={supForm.nombre} onChange={setSup('nombre')} required /></div>
                  <div className="form-group"><label className="form-label">Categoría</label><input type="text" className="form-input" value={supForm.categoria} onChange={setSup('categoria')} placeholder="limpieza, accesorios..." /></div>
                  <div className="form-group"><label className="form-label">Unidad</label><input type="text" className="form-input" value={supForm.unidad} onChange={setSup('unidad')} placeholder="unidad, litro, kg..." /></div>
                  <div className="form-group"><label className="form-label">Stock actual</label><input type="number" className="form-input font-mono" value={supForm.stock_actual} onChange={setSup('stock_actual')} min="0" /></div>
                  <div className="form-group"><label className="form-label">Stock mínimo</label><input type="number" className="form-input font-mono" value={supForm.stock_minimo} onChange={setSup('stock_minimo')} min="0" /></div>
                  <div className="form-group"><label className="form-label">Precio unitario</label><input type="number" className="form-input font-mono" value={supForm.precio_unitario} onChange={setSup('precio_unitario')} min="0" /></div>
                </div>
              )}
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
