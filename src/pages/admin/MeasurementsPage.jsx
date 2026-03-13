import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDate, calcIMC, imcCategory } from '../../utils/helpers'
import { Plus, Ruler, Search } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import toast from 'react-hot-toast'

export default function MeasurementsPage() {
  const [members, setMembers] = useState([])
  const [selectedMember, setSelectedMember] = useState('')
  const [measurements, setMeasurements] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    peso: '', altura: '', porcentaje_grasa: '', porcentaje_musculo: '',
    cintura: '', cadera: '', pecho: '', brazo_der: '', brazo_izq: '',
    muslo_der: '', muslo_izq: '', notas: ''
  })

  useEffect(() => {
    loadMembers()
  }, [])

  useEffect(() => {
    if (selectedMember) loadMeasurements()
  }, [selectedMember])

  const loadMembers = async () => {
    const { data } = await supabase.from('members').select('id, nombre, apellido, numero_socio').eq('estado', 'activo').order('apellido')
    setMembers(data || [])
  }

  const loadMeasurements = async () => {
    setLoading(true)
    const { data } = await supabase.from('measurements').select('*').eq('member_id', selectedMember).order('fecha')
    setMeasurements(data || [])
    setLoading(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!selectedMember) { toast.error('Seleccioná un miembro'); return }
    setSaving(true)
    const imc = calcIMC(parseFloat(form.peso), parseFloat(form.altura))
    const { error } = await supabase.from('measurements').insert({
      member_id: selectedMember,
      ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])),
      imc
    })
    setSaving(false)
    if (error) { toast.error('Error al guardar medición'); return }
    toast.success('Medición registrada')
    setShowModal(false)
    setForm({ fecha: new Date().toISOString().split('T')[0], peso: '', altura: '', porcentaje_grasa: '', porcentaje_musculo: '', cintura: '', cadera: '', pecho: '', brazo_der: '', brazo_izq: '', muslo_der: '', muslo_izq: '', notas: '' })
    loadMeasurements()
  }

  const chartData = measurements.map(m => ({
    fecha: formatDate(m.fecha),
    peso: m.peso, cintura: m.cintura, imc: m.imc,
    grasa: m.porcentaje_grasa, musculo: m.porcentaje_musculo
  }))

  const lastMeasurement = measurements[measurements.length - 1]
  const firstMeasurement = measurements[0]

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Medidas corporales</h1>
          <p className="page-subtitle">Seguimiento de evolución física</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} disabled={!selectedMember}>
          <Plus size={18} /> Nueva medición
        </button>
      </div>

      {/* Member selector */}
      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="form-group">
          <label className="form-label">Seleccioná un miembro para ver su evolución</label>
          <select className="form-select" style={{ maxWidth: 400 }} value={selectedMember} onChange={e => setSelectedMember(e.target.value)}>
            <option value="">-- Elegir miembro --</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.nombre} {m.apellido} — {m.numero_socio}</option>)}
          </select>
        </div>
      </div>

      {!selectedMember ? (
        <div className="card"><div className="empty-state"><div className="empty-state-icon"><Ruler size={28} /></div><h3>Seleccioná un miembro</h3></div></div>
      ) : loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : measurements.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Ruler size={28} /></div>
            <h3>Sin mediciones</h3>
            <p>Registrá la primera medición del miembro</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Nueva medición</button>
          </div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          {lastMeasurement && (
            <div className="stats-grid" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="stat-card">
                <div className="stat-value">{lastMeasurement.peso ? `${lastMeasurement.peso} kg` : '—'}</div>
                <div className="stat-label">Peso actual</div>
                {firstMeasurement && firstMeasurement.id !== lastMeasurement.id && firstMeasurement.peso && (
                  <div className={`stat-change ${lastMeasurement.peso < firstMeasurement.peso ? 'positive' : 'negative'}`}>
                    {lastMeasurement.peso < firstMeasurement.peso ? '▼' : '▲'} {Math.abs(lastMeasurement.peso - firstMeasurement.peso).toFixed(1)} kg
                  </div>
                )}
              </div>
              <div className="stat-card">
                <div className="stat-value">{lastMeasurement.imc || '—'}</div>
                <div className="stat-label">IMC</div>
                {lastMeasurement.imc && <span className={`badge ${imcCategory(lastMeasurement.imc)?.color}`} style={{ alignSelf: 'flex-start' }}>{imcCategory(lastMeasurement.imc)?.label}</span>}
              </div>
              <div className="stat-card">
                <div className="stat-value">{lastMeasurement.porcentaje_grasa ? `${lastMeasurement.porcentaje_grasa}%` : '—'}</div>
                <div className="stat-label">% Grasa corporal</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{lastMeasurement.cintura ? `${lastMeasurement.cintura} cm` : '—'}</div>
                <div className="stat-label">Cintura</div>
              </div>
            </div>
          )}

          {/* Charts */}
          {chartData.length > 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: 'var(--space-3)' }}>Evolución de peso</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                    <Tooltip />
                    <Line type="monotone" dataKey="peso" stroke="#2563EB" strokeWidth={2} dot={{ r: 4 }} name="Peso (kg)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: 'var(--space-3)' }}>Composición corporal</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="grasa" stroke="#ef4444" strokeWidth={2} name="% Grasa" />
                    <Line type="monotone" dataKey="musculo" stroke="#16a34a" strokeWidth={2} name="% Músculo" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Fecha</th><th>Peso</th><th>Altura</th><th>IMC</th><th>% Grasa</th><th>% Músculo</th><th>Cintura</th><th>Cadera</th></tr>
              </thead>
              <tbody>
                {[...measurements].reverse().map(m => (
                  <tr key={m.id}>
                    <td>{formatDate(m.fecha)}</td>
                    <td>{m.peso ? `${m.peso} kg` : '—'}</td>
                    <td>{m.altura ? `${m.altura} cm` : '—'}</td>
                    <td className="font-mono">{m.imc || '—'}</td>
                    <td>{m.porcentaje_grasa ? `${m.porcentaje_grasa}%` : '—'}</td>
                    <td>{m.porcentaje_musculo ? `${m.porcentaje_musculo}%` : '—'}</td>
                    <td>{m.cintura ? `${m.cintura} cm` : '—'}</td>
                    <td>{m.cadera ? `${m.cadera} cm` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nueva medición</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input type="date" className="form-input" value={form.fecha} onChange={set('fecha')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
                {[['peso','Peso (kg)'],['altura','Altura (cm)'],['porcentaje_grasa','% Grasa'],['porcentaje_musculo','% Músculo'],['cintura','Cintura (cm)'],['cadera','Cadera (cm)'],['pecho','Pecho (cm)'],['brazo_der','Brazo Der (cm)'],['brazo_izq','Brazo Izq (cm)'],['muslo_der','Muslo Der (cm)'],['muslo_izq','Muslo Izq (cm)']].map(([field, label]) => (
                  <div key={field} className="form-group">
                    <label className="form-label">{label}</label>
                    <input type="number" step="0.1" className="form-input font-mono" value={form[field]} onChange={set(field)} placeholder="—" />
                  </div>
                ))}
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="form-textarea" value={form.notas} onChange={set('notas')} rows={2} />
              </div>
              <div className="flex gap-3">
                <button type="button" className="btn btn-secondary w-full" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary w-full" disabled={saving}>{saving ? 'Guardando...' : 'Registrar medición'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
