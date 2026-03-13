import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDate, formatCurrency, paymentMethodLabel, exportToCSV } from '../../utils/helpers'
import { DollarSign, Search, Download, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import './PaymentsPage.css'

export default function PaymentsPage() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [total, setTotal] = useState(0)

  useEffect(() => { loadPayments() }, [dateFrom, dateTo, methodFilter])

  const loadPayments = async () => {
    setLoading(true)
    let q = supabase
      .from('payments')
      .select('*, members(nombre, apellido, dni, numero_socio)')
      .gte('created_at', dateFrom + 'T00:00:00')
      .lte('created_at', dateTo + 'T23:59:59')
      .order('created_at', { ascending: false })
      .limit(100)

    if (methodFilter !== 'all') q = q.eq('metodo', methodFilter)

    const { data, error } = await q
    if (error) { toast.error('Error al cargar pagos'); setLoading(false); return }
    const filtered = search
      ? (data || []).filter(p =>
          `${p.members?.nombre} ${p.members?.apellido} ${p.members?.dni}`.toLowerCase().includes(search.toLowerCase())
        )
      : (data || [])
    setPayments(filtered)
    setTotal(filtered.filter(p => p.estado === 'pagado').reduce((s, p) => s + Number(p.monto), 0))
    setLoading(false)
  }

  const handleExport = () => {
    exportToCSV(
      payments.map(p => ({
        Fecha: formatDate(p.created_at),
        Socio: `${p.members?.nombre} ${p.members?.apellido}`,
        DNI: p.members?.dni,
        Concepto: p.concepto,
        Método: paymentMethodLabel[p.metodo],
        Monto: p.monto,
        Estado: p.estado
      })),
      `pagos-${dateFrom}-${dateTo}.csv`
    )
  }

  const methods = ['all', 'efectivo', 'transferencia', 'tarjeta', 'mercadopago', 'otro']

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pagos</h1>
          <p className="page-subtitle">{payments.length} registros</p>
        </div>
        <button className="btn btn-secondary" onClick={handleExport}>
          <Download size={18} /> Exportar CSV
        </button>
      </div>

      {/* Summary */}
      <div className="payments-summary">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            <DollarSign size={22} />
          </div>
          <div className="stat-value">{formatCurrency(total)}</div>
          <div className="stat-label">Total cobrado (período)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{payments.filter(p => p.estado === 'pagado').length}</div>
          <div className="stat-label">Pagos confirmados</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatCurrency(payments.filter(p => p.metodo === 'efectivo').reduce((s, p) => s + Number(p.monto), 0))}</div>
          <div className="stat-label">En efectivo</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatCurrency(payments.filter(p => p.metodo === 'transferencia').reduce((s, p) => s + Number(p.monto), 0))}</div>
          <div className="stat-label">Transferencias</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-input-wrapper" style={{ flex: 1, maxWidth: 280 }}>
          <Search size={16} className="search-icon" />
          <input
            type="text" className="form-input" placeholder="Buscar por nombre..."
            value={search} onChange={e => { setSearch(e.target.value); loadPayments() }}
          />
        </div>
        <input type="date" className="form-input" style={{ width: 160 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input type="date" className="form-input" style={{ width: 160 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
        <select className="form-select" style={{ width: 160 }} value={methodFilter} onChange={e => setMethodFilter(e.target.value)}>
          <option value="all">Todos los métodos</option>
          {methods.slice(1).map(m => <option key={m} value={m}>{paymentMethodLabel[m]}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : payments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><DollarSign size={28} /></div>
            <h3>Sin pagos en este período</h3>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Fecha</th><th>Socio</th><th>Concepto</th><th>Método</th><th>Monto</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td className="text-sm">{formatDate(p.created_at)}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.members?.nombre} {p.members?.apellido}</div>
                    <div className="text-xs text-muted font-mono">{p.members?.numero_socio}</div>
                  </td>
                  <td>{p.concepto || '—'}</td>
                  <td>
                    <span className="badge badge-neutral">{paymentMethodLabel[p.metodo]}</span>
                  </td>
                  <td className="font-mono" style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                    {formatCurrency(p.monto)}
                  </td>
                  <td>
                    <span className={`badge badge-${p.estado === 'pagado' ? 'success' : p.estado === 'pendiente' ? 'warning' : 'neutral'}`}>
                      {p.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
