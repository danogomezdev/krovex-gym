import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatDate, calcIMC, imcCategory } from '../../utils/helpers'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function MemberProgressPage() {
  const { member } = useAuth()
  const [measurements, setMeasurements] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [member?.id])

  const loadData = async () => {
    if (!member?.id) return
    setLoading(true)
    const [measRes, attRes] = await Promise.all([
      supabase.from('measurements').select('*').eq('member_id', member.id).order('fecha'),
      supabase.from('attendance').select('created_at')
        .eq('member_id', member.id)
        .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at')
    ])
    setMeasurements(measRes.data || [])
    setAttendance(attRes.data || [])
    setLoading(false)
  }

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>

  const last = measurements[measurements.length - 1]
  const first = measurements[0]
  const chartData = measurements.map(m => ({
    fecha: new Date(m.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
    peso: m.peso, imc: m.imc,
    grasa: m.porcentaje_grasa, musculo: m.porcentaje_musculo
  }))

  const diff = (field) => {
    if (!first || !last || first.id === last.id) return null
    const d = parseFloat(last[field]) - parseFloat(first[field])
    if (isNaN(d)) return null
    return d
  }

  const DiffBadge = ({ field, unit = '', lowerIsBetter = false }) => {
    const d = diff(field)
    if (d === null) return null
    const positive = lowerIsBetter ? d < 0 : d > 0
    const neutral = d === 0
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        color: neutral ? 'var(--color-text-muted)' : positive ? 'var(--color-success)' : 'var(--color-danger)',
        fontSize: '0.75rem', fontWeight: 600
      }}>
        {neutral ? <Minus size={12} /> : positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {d > 0 ? '+' : ''}{d.toFixed(1)}{unit}
      </span>
    )
  }

  // Monthly attendance heatmap (last 8 weeks)
  const weeksData = []
  for (let w = 7; w >= 0; w--) {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - w * 7 - weekStart.getDay() + 1)
    const days = Array.from({ length: 7 }, (_, d) => {
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + d)
      const dayStr = day.toISOString().split('T')[0]
      const count = attendance.filter(a => a.created_at.startsWith(dayStr)).length
      return { date: day, count }
    })
    weeksData.push(days)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem' }}>Mi progreso</h2>

      {measurements.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><TrendingUp size={32} /></div>
          <h3>Sin mediciones</h3>
          <p>Tu entrenador registrará tus mediciones para hacer seguimiento de tu progreso.</p>
        </div>
      ) : (
        <>
          {/* Current stats */}
          {last && (
            <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-3)' }}>
                Última medición — {formatDate(last.fecha)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
                {[
                  { label: 'Peso', value: last.peso, unit: 'kg', field: 'peso', lowerIsBetter: false },
                  { label: 'IMC', value: last.imc, unit: '', field: 'imc', lowerIsBetter: false },
                  { label: '% Grasa', value: last.porcentaje_grasa, unit: '%', field: 'porcentaje_grasa', lowerIsBetter: true },
                  { label: '% Músculo', value: last.porcentaje_musculo, unit: '%', field: 'porcentaje_musculo', lowerIsBetter: false },
                  { label: 'Cintura', value: last.cintura, unit: 'cm', field: 'cintura', lowerIsBetter: true },
                  { label: 'Cadera', value: last.cadera, unit: 'cm', field: 'cadera', lowerIsBetter: false },
                ].map(({ label, value, unit, field, lowerIsBetter }) => value && (
                  <div key={field} style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--color-text)' }}>{value}{unit}</div>
                    <DiffBadge field={field} unit={unit} lowerIsBetter={lowerIsBetter} />
                  </div>
                ))}
              </div>
              {last.imc && (
                <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', background: 'var(--color-primary-light)', color: 'var(--color-primary)', fontSize: '0.875rem', fontWeight: 600 }}>
                  IMC: {last.imc} — {imcCategory(last.imc)?.label}
                </div>
              )}
            </div>
          )}

          {/* Weight chart */}
          {chartData.length > 1 && (
            <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: 'var(--space-3)' }}>Evolución de peso</div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} width={40} />
                  <Tooltip />
                  <Line type="monotone" dataKey="peso" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 4 }} name="Peso (kg)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Composition chart */}
          {chartData.filter(d => d.grasa || d.musculo).length > 1 && (
            <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: 'var(--space-3)' }}>Composición corporal</div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={35} />
                  <Tooltip />
                  <Line type="monotone" dataKey="grasa" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="% Grasa" />
                  <Line type="monotone" dataKey="musculo" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} name="% Músculo" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* History table */}
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: 'var(--space-3)' }}>Historial de mediciones</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {['Fecha', 'Peso', 'IMC', '% Grasa', '% Músculo', 'Cintura'].map(h => (
                      <th key={h} style={{ padding: '8px', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...measurements].reverse().map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                      <td style={{ padding: '8px', fontWeight: 500 }}>{formatDate(m.fecha)}</td>
                      <td style={{ padding: '8px', fontFamily: 'var(--font-mono)' }}>{m.peso ? `${m.peso}kg` : '—'}</td>
                      <td style={{ padding: '8px', fontFamily: 'var(--font-mono)' }}>{m.imc || '—'}</td>
                      <td style={{ padding: '8px', fontFamily: 'var(--font-mono)' }}>{m.porcentaje_grasa ? `${m.porcentaje_grasa}%` : '—'}</td>
                      <td style={{ padding: '8px', fontFamily: 'var(--font-mono)' }}>{m.porcentaje_musculo ? `${m.porcentaje_musculo}%` : '—'}</td>
                      <td style={{ padding: '8px', fontFamily: 'var(--font-mono)' }}>{m.cintura ? `${m.cintura}cm` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Attendance heatmap */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)', border: '1px solid var(--color-border)' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: 'var(--space-3)' }}>
          Asistencia (últimas 8 semanas) — {attendance.length} visitas
        </div>
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
          {weeksData.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {week.map((day, di) => (
                <div key={di} title={`${day.date.toLocaleDateString('es-AR')}: ${day.count} visita(s)`} style={{
                  width: 20, height: 20, borderRadius: 3,
                  background: day.count > 0
                    ? `rgba(37, 99, 235, ${Math.min(day.count * 0.5 + 0.4, 1)})`
                    : day.date > new Date() ? 'transparent' : 'var(--color-border)',
                  cursor: 'default',
                  border: day.date.toDateString() === new Date().toDateString() ? '2px solid var(--color-primary)' : 'none'
                }} />
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'var(--space-2)', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--color-border)' }} /> Sin visita
          <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(37,99,235,0.6)' }} /> Con visita
        </div>
      </div>
    </div>
  )
}
