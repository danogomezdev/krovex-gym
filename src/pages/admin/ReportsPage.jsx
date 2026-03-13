import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDate, exportToCSV } from '../../utils/helpers'
import { BarChart2, Download, TrendingUp, Users, Calendar } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'
import './ReportsPage.css'

const COLORS = ['#2563EB', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})
  const [monthlyData, setMonthlyData] = useState([])
  const [membersByStatus, setMembersByStatus] = useState([])
  const [topMembers, setTopMembers] = useState([])
  const [hourlyAttendance, setHourlyAttendance] = useState([])
  const [popularClasses, setPopularClasses] = useState([])

  useEffect(() => { loadReports() }, [])

  const loadReports = async () => {
    setLoading(true)
    await Promise.all([
      loadStats(), loadMonthly(), loadMembersByStatus(),
      loadTopMembers(), loadHourlyAttendance(), loadPopularClasses()
    ])
    setLoading(false)
  }

  const loadStats = async () => {
    const { data } = await supabase.rpc('get_gym_stats')
    if (data) setStats(data)
  }

  const loadMonthly = async () => {
    const months = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const y = d.getFullYear(), m = d.getMonth() + 1
      const from = `${y}-${String(m).padStart(2,'0')}-01`
      const to = m < 12 ? `${y}-${String(m+1).padStart(2,'0')}-01` : `${y+1}-01-01`
      const [payRes, membRes] = await Promise.all([
        supabase.from('payments').select('monto').eq('estado','pagado').gte('created_at', from).lt('created_at', to),
        supabase.from('members').select('id', { count: 'exact' }).gte('created_at', from).lt('created_at', to)
      ])
      months.push({
        mes: new Date(y, m-1).toLocaleString('es-AR', { month: 'short' }),
        ingresos: (payRes.data||[]).reduce((s,p) => s + Number(p.monto), 0),
        nuevos: membRes.count || 0
      })
    }
    setMonthlyData(months)
  }

  const loadMembersByStatus = async () => {
    const statuses = ['activo','vencido','suspendido','baja']
    const results = await Promise.all(
      statuses.map(s => supabase.from('members').select('id', { count: 'exact' }).eq('estado', s))
    )
    setMembersByStatus([
      { name: 'Activos', value: results[0].count || 0, color: '#16a34a' },
      { name: 'Vencidos', value: results[1].count || 0, color: '#dc2626' },
      { name: 'Suspendidos', value: results[2].count || 0, color: '#d97706' },
      { name: 'Baja', value: results[3].count || 0, color: '#64748b' }
    ])
  }

  const loadTopMembers = async () => {
    const { data } = await supabase
      .from('attendance')
      .select('member_id, members(nombre, apellido, numero_socio)')
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
    if (!data) return
    const counts = {}
    data.forEach(a => {
      if (!a.member_id) return
      if (!counts[a.member_id]) counts[a.member_id] = { member: a.members, count: 0 }
      counts[a.member_id].count++
    })
    const sorted = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 10)
    setTopMembers(sorted)
  }

  const loadHourlyAttendance = async () => {
    const { data } = await supabase.from('attendance').select('created_at').gte('created_at', new Date(Date.now() - 30*24*60*60*1000).toISOString())
    if (!data) return
    const hours = Array.from({ length: 18 }, (_, i) => ({ hora: `${i+6}:00`, visitas: 0 }))
    data.forEach(a => {
      const h = new Date(a.created_at).getHours()
      const idx = h - 6
      if (idx >= 0 && idx < 18) hours[idx].visitas++
    })
    setHourlyAttendance(hours)
  }

  const loadPopularClasses = async () => {
    const { data } = await supabase
      .from('class_bookings')
      .select('class_id, classes(nombre)')
      .eq('estado', 'confirmada')
    if (!data) return
    const counts = {}
    data.forEach(b => {
      const key = b.class_id
      if (!counts[key]) counts[key] = { nombre: b.classes?.nombre, count: 0 }
      counts[key].count++
    })
    setPopularClasses(Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5))
  }

  const exportReport = () => {
    exportToCSV(
      monthlyData.map(m => ({ Mes: m.mes, Ingresos: m.ingresos, 'Nuevos miembros': m.nuevos })),
      'reporte-mensual-krovex.csv'
    )
  }

  if (loading) return <div className="loading-spinner"><div className="spinner" /><p>Cargando reportes...</p></div>

  return (
    <div className="reports-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Estadísticas y métricas del gimnasio</p>
        </div>
        <button className="btn btn-secondary" onClick={exportReport}>
          <Download size={18} /> Exportar CSV
        </button>
      </div>

      {/* Key metrics */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}><Users size={22} /></div>
          <div className="stat-value">{stats.miembros_activos || 0}</div>
          <div className="stat-label">Miembros activos</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}><TrendingUp size={22} /></div>
          <div className="stat-value">{formatCurrency(stats.ingresos || 0)}</div>
          <div className="stat-label">Ingresos del mes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.nuevos_mes || 0}</div>
          <div className="stat-label">Altas este mes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.asistencias_hoy || 0}</div>
          <div className="stat-label">Check-ins hoy</div>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="reports-charts-row" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Ingresos y nuevos miembros (12 meses)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v, n) => n === 'ingresos' ? [formatCurrency(v), 'Ingresos'] : [v, 'Nuevos']} />
              <Legend />
              <Bar yAxisId="left" dataKey="ingresos" fill="#2563EB" name="Ingresos" radius={[4,4,0,0]} />
              <Bar yAxisId="right" dataKey="nuevos" fill="#10b981" name="Nuevos" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Estado de miembros</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={membersByStatus.filter(m => m.value > 0)} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {membersByStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="reports-charts-row">
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Horas pico (últimos 30 días)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyAttendance}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="hora" tick={{ fontSize: 11 }} interval={1} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="visitas" fill="#2563EB" radius={[3,3,0,0]} name="Visitas" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Top miembros del mes</h3>
          {topMembers.length === 0 ? (
            <p className="text-sm text-muted">Sin datos suficientes</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {topMembers.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--color-text-muted)', width: 20 }}>#{i+1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{m.member?.nombre} {m.member?.apellido}</div>
                  </div>
                  <span className="badge badge-primary">{m.count} visitas</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
