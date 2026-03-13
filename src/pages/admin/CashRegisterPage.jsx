import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDate, formatDateTime, paymentMethodLabel } from '../../utils/helpers'
import { useAuth } from '../../context/AuthContext'
import { DollarSign, Lock, Unlock, Plus, Minus, Receipt } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CashRegisterPage() {
  const { staffUser } = useAuth()
  const [session, setSession] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showOpenModal, setShowOpenModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [openAmount, setOpenAmount] = useState('0')
  const [expenseForm, setExpenseForm] = useState({ concepto: '', monto: '', categoria: 'servicios' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadSession() }, [])

  const loadSession = async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const { data: sessions } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('fecha', today)
      .order('created_at', { ascending: false })
      .limit(1)

    const currentSession = sessions?.[0] || null
    setSession(currentSession)

    if (currentSession) {
      const [expensesRes, paymentsRes] = await Promise.all([
        supabase.from('expenses').select('*').eq('cash_session_id', currentSession.id).order('created_at', { ascending: false }),
        supabase.from('payments').select('*, members(nombre, apellido)').gte('created_at', today + 'T00:00:00').order('created_at', { ascending: false })
      ])
      setExpenses(expensesRes.data || [])
      setPayments(paymentsRes.data || [])
    }
    setLoading(false)
  }

  const openCashSession = async () => {
    setSaving(true)
    const { error } = await supabase.from('cash_sessions').insert({
      staff_id: staffUser?.id !== 'demo' ? staffUser?.id : null,
      fecha: new Date().toISOString().split('T')[0],
      monto_apertura: parseFloat(openAmount) || 0
    })
    setSaving(false)
    if (error) { toast.error('Error al abrir caja'); return }
    toast.success('Caja abierta')
    setShowOpenModal(false)
    loadSession()
  }

  const closeCashSession = async () => {
    if (!session) return
    if (!window.confirm('¿Cerrar la caja del día?')) return
    const totalEfectivo = payments.filter(p => p.metodo === 'efectivo' && p.estado === 'pagado').reduce((s, p) => s + Number(p.monto), 0)
    const totalTransf = payments.filter(p => p.metodo === 'transferencia' && p.estado === 'pagado').reduce((s, p) => s + Number(p.monto), 0)
    const totalTarjeta = payments.filter(p => p.metodo === 'tarjeta' && p.estado === 'pagado').reduce((s, p) => s + Number(p.monto), 0)
    const totalMP = payments.filter(p => p.metodo === 'mercadopago' && p.estado === 'pagado').reduce((s, p) => s + Number(p.monto), 0)
    const totalIngresos = totalEfectivo + totalTransf + totalTarjeta + totalMP
    const totalEgresos = expenses.reduce((s, e) => s + Number(e.monto), 0)

    const { error } = await supabase.from('cash_sessions').update({
      cerrada: true,
      monto_cierre: totalIngresos - totalEgresos + (session.monto_apertura || 0),
      total_efectivo: totalEfectivo,
      total_transferencia: totalTransf,
      total_tarjeta: totalTarjeta,
      total_mercadopago: totalMP
    }).eq('id', session.id)

    if (error) { toast.error('Error al cerrar caja'); return }
    toast.success('Caja cerrada correctamente')
    loadSession()
  }

  const addExpense = async (e) => {
    e.preventDefault()
    if (!session) return
    setSaving(true)
    const { error } = await supabase.from('expenses').insert({
      concepto: expenseForm.concepto,
      monto: parseFloat(expenseForm.monto),
      categoria: expenseForm.categoria,
      cash_session_id: session.id,
      staff_id: staffUser?.id !== 'demo' ? staffUser?.id : null
    })
    setSaving(false)
    if (error) { toast.error('Error al registrar egreso'); return }
    toast.success('Egreso registrado')
    setShowExpenseModal(false)
    setExpenseForm({ concepto: '', monto: '', categoria: 'servicios' })
    loadSession()
  }

  const totalIngresos = payments.filter(p => p.estado === 'pagado').reduce((s, p) => s + Number(p.monto), 0)
  const totalEgresos = expenses.reduce((s, e) => s + Number(e.monto), 0)
  const balance = totalIngresos - totalEgresos + (session?.monto_apertura || 0)

  if (loading) return <div className="loading-spinner"><div className="spinner" /><p>Cargando caja...</p></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Caja diaria</h1>
          <p className="page-subtitle">{new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        {!session ? (
          <button className="btn btn-primary" onClick={() => setShowOpenModal(true)}>
            <Unlock size={18} /> Abrir caja
          </button>
        ) : !session.cerrada ? (
          <div className="flex gap-3">
            <button className="btn btn-secondary" onClick={() => setShowExpenseModal(true)}>
              <Minus size={18} /> Registrar egreso
            </button>
            <button className="btn btn-danger" onClick={closeCashSession}>
              <Lock size={18} /> Cerrar caja
            </button>
          </div>
        ) : (
          <span className="badge badge-neutral" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
            <Lock size={14} /> Caja cerrada
          </span>
        )}
      </div>

      {!session ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><DollarSign size={28} /></div>
            <h3>Caja no iniciada</h3>
            <p>Abrí la caja para comenzar a registrar pagos del día</p>
            <button className="btn btn-primary" onClick={() => setShowOpenModal(true)}>
              <Unlock size={16} /> Abrir caja
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="stats-grid" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
                <DollarSign size={22} />
              </div>
              <div className="stat-value">{formatCurrency(totalIngresos)}</div>
              <div className="stat-label">Ingresos del día</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
                <Minus size={22} />
              </div>
              <div className="stat-value">{formatCurrency(totalEgresos)}</div>
              <div className="stat-label">Egresos del día</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                <Receipt size={22} />
              </div>
              <div className="stat-value" style={{ color: balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {formatCurrency(balance)}
              </div>
              <div className="stat-label">Balance neto</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{payments.length}</div>
              <div className="stat-label">Pagos registrados</div>
            </div>
          </div>

          {/* Method breakdown */}
          <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Desglose por método</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)' }}>
              {['efectivo', 'transferencia', 'tarjeta', 'mercadopago'].map(method => {
                const total = payments.filter(p => p.metodo === method && p.estado === 'pagado').reduce((s, p) => s + Number(p.monto), 0)
                return (
                  <div key={method} style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', color: 'var(--color-primary)' }}>{formatCurrency(total)}</div>
                    <div className="text-xs text-muted" style={{ marginTop: 4 }}>{paymentMethodLabel[method]}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Payments list */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Ingresos</h3>
                <span className="badge badge-success">{payments.length}</span>
              </div>
              {payments.length === 0 ? (
                <p className="text-muted text-sm">Sin ingresos hoy</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {payments.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)', borderBottom: '1px solid var(--color-border-light)' }}>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{p.members?.nombre} {p.members?.apellido}</div>
                        <div className="text-xs text-muted">{p.concepto || paymentMethodLabel[p.metodo]}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-success)' }}>
                        {formatCurrency(p.monto)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Egresos</h3>
                <div className="flex gap-2">
                  <span className="badge badge-danger">{expenses.length}</span>
                  {!session.cerrada && (
                    <button className="btn btn-sm btn-secondary" onClick={() => setShowExpenseModal(true)}>
                      <Plus size={14} /> Agregar
                    </button>
                  )}
                </div>
              </div>
              {expenses.length === 0 ? (
                <p className="text-muted text-sm">Sin egresos registrados</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {expenses.map(exp => (
                    <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)', borderBottom: '1px solid var(--color-border-light)' }}>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{exp.concepto}</div>
                        <div className="text-xs text-muted">{exp.categoria}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-danger)' }}>
                        -{formatCurrency(exp.monto)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Open cash modal */}
      {showOpenModal && (
        <div className="modal-overlay" onClick={() => setShowOpenModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Abrir caja</h2>
              <button className="btn-icon" onClick={() => setShowOpenModal(false)}>✕</button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Efectivo inicial en caja</label>
                <input type="number" className="form-input font-mono" value={openAmount}
                  onChange={e => setOpenAmount(e.target.value)} placeholder="0" min="0" autoFocus />
              </div>
              <div className="flex gap-3">
                <button className="btn btn-secondary w-full" onClick={() => setShowOpenModal(false)}>Cancelar</button>
                <button className="btn btn-primary w-full" onClick={openCashSession} disabled={saving}>
                  {saving ? 'Abriendo...' : 'Abrir caja'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense modal */}
      {showExpenseModal && (
        <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Registrar egreso</h2>
              <button className="btn-icon" onClick={() => setShowExpenseModal(false)}>✕</button>
            </div>
            <form onSubmit={addExpense} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Concepto *</label>
                <input type="text" className="form-input" value={expenseForm.concepto}
                  onChange={e => setExpenseForm(p => ({ ...p, concepto: e.target.value }))} required placeholder="Limpieza, electricidad..." />
              </div>
              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select className="form-select" value={expenseForm.categoria}
                  onChange={e => setExpenseForm(p => ({ ...p, categoria: e.target.value }))}>
                  <option value="servicios">Servicios</option>
                  <option value="sueldos">Sueldos</option>
                  <option value="mantenimiento">Mantenimiento</option>
                  <option value="insumos">Insumos</option>
                  <option value="alquiler">Alquiler</option>
                  <option value="otros">Otros</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Monto *</label>
                <input type="number" className="form-input font-mono" value={expenseForm.monto}
                  onChange={e => setExpenseForm(p => ({ ...p, monto: e.target.value }))} required placeholder="5000" min="1" />
              </div>
              <div className="flex gap-3">
                <button type="button" className="btn btn-secondary w-full" onClick={() => setShowExpenseModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-danger w-full" disabled={saving}>
                  {saving ? 'Guardando...' : 'Registrar egreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
