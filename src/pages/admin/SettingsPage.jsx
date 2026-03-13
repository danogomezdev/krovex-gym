import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Settings, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState(null)
  const [form, setForm] = useState({
    nombre: '', logo_url: '', direccion: '', telefono: '', email: '',
    website: '', instagram: '', facebook: '',
    horario_apertura: '06:00', horario_cierre: '23:00',
    moneda: 'ARS', prefijo_socio: 'KRV', tiempo_cancelacion_hs: 2
  })

  useEffect(() => { loadConfig() }, [])

  const loadConfig = async () => {
    setLoading(true)
    const { data } = await supabase.from('gym_config').select('*').single()
    if (data) {
      setConfig(data)
      setForm({
        nombre: data.nombre || '',
        logo_url: data.logo_url || '',
        direccion: data.direccion || '',
        telefono: data.telefono || '',
        email: data.email || '',
        website: data.website || '',
        instagram: data.instagram || '',
        facebook: data.facebook || '',
        horario_apertura: data.horario_apertura || '06:00',
        horario_cierre: data.horario_cierre || '23:00',
        moneda: data.moneda || 'ARS',
        prefijo_socio: data.prefijo_socio || 'KRV',
        tiempo_cancelacion_hs: data.tiempo_cancelacion_hs || 2
      })
    }
    setLoading(false)
  }

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = config
      ? await supabase.from('gym_config').update(form).eq('id', config.id)
      : await supabase.from('gym_config').insert(form)
    setSaving(false)
    if (error) { toast.error('Error al guardar configuración'); return }
    toast.success('Configuración guardada')
    loadConfig()
  }

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-subtitle">Datos y configuración del gimnasio</p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Gym data */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Datos del gimnasio</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Nombre del gimnasio *</label>
                <input type="text" className="form-input" value={form.nombre} onChange={set('nombre')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input type="text" className="form-input" value={form.telefono} onChange={set('telefono')} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={form.email} onChange={set('email')} />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Dirección</label>
                <input type="text" className="form-input" value={form.direccion} onChange={set('direccion')} />
              </div>
              <div className="form-group">
                <label className="form-label">Website</label>
                <input type="url" className="form-input" value={form.website} onChange={set('website')} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label className="form-label">Instagram</label>
                <input type="text" className="form-input" value={form.instagram} onChange={set('instagram')} placeholder="@krovexgym" />
              </div>
              <div className="form-group">
                <label className="form-label">URL Logo</label>
                <input type="url" className="form-input" value={form.logo_url} onChange={set('logo_url')} placeholder="https://..." />
              </div>
            </div>
          </div>

          {/* Operating hours */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Horarios y operación</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Horario apertura</label>
                <input type="time" className="form-input" value={form.horario_apertura} onChange={set('horario_apertura')} />
              </div>
              <div className="form-group">
                <label className="form-label">Horario cierre</label>
                <input type="time" className="form-input" value={form.horario_cierre} onChange={set('horario_cierre')} />
              </div>
              <div className="form-group">
                <label className="form-label">Tiempo mínimo cancelación clase (hs)</label>
                <input type="number" className="form-input" value={form.tiempo_cancelacion_hs} onChange={set('tiempo_cancelacion_hs')} min={0} />
              </div>
            </div>
          </div>

          {/* System config */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Configuración del sistema</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Moneda</label>
                <select className="form-select" value={form.moneda} onChange={set('moneda')}>
                  <option value="ARS">ARS — Peso argentino</option>
                  <option value="USD">USD — Dólar</option>
                  <option value="UYU">UYU — Peso uruguayo</option>
                  <option value="CLP">CLP — Peso chileno</option>
                  <option value="COP">COP — Peso colombiano</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Prefijo número de socio</label>
                <input type="text" className="form-input font-mono" value={form.prefijo_socio} onChange={set('prefijo_socio')} maxLength={5} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
              <Save size={18} /> {saving ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
