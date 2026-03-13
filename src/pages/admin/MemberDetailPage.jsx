import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  formatDate, formatDateTime, formatCurrency,
  membershipStatusBadge, membershipStatusLabel,
  paymentMethodLabel, daysUntil, getInitials, getAvatarColor, calcIMC
} from '../../utils/helpers'
import {
  ArrowLeft, Edit, Trash2, QrCode, Plus, Phone,
  Mail, Calendar, MapPin, AlertTriangle, CheckCircle,
  Activity, DollarSign, Dumbbell, Ruler, CreditCard
} from 'lucide-react'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'
import './MemberDetailPage.css'

const TABS = ['resumen', 'pagos', 'asistencias', 'rutina', 'medidas', 'notas']

export default function MemberDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [member, setMember] = useState(null)
  const [membership, setMembership] = useState(null)
  const [payments, setPayments] = useState([])
  const [attendance, setAttendance] = useState([])
  const [measurements, setMeasurements] = useState([])
  const [memberRoutine, setMemberRoutine] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('resumen')
  const [qrUrl, setQrUrl] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ monto: '', metodo: 'efectivo', concepto: '' })
  const [savingPayment, setSavingPayment] = useState(false)

  useEffect(() => { loadMember() }, [id])
  useEffect(() => {
    if (member) generateQR()
  }, [member])

  const loadMember = async () => {
    setLoading(true)
    try {
      const [memberRes, paymentsRes, attendanceRes, measurementsRes, routineRes] = await Promise.all([
        supabase.from('members').select('*').eq('id', id).single(),
        supabase.from('payments').select('*, membership_plans(nombre)').eq('member_id', id).order('created_at', { ascending: false }).limit(20),
        supabase.from('attendance').select('*').eq('member_id', id).order('created_at', { ascending: false }).limit(30),
        supabase.from('measurements').select('*').eq('member_id', id).order('fecha', { ascending: false }),
        supabase.from('member_routines').select('*, routines(*, routine_days(*, routine_exercises(*, exercises(*))))').eq('member_id', id).eq('activa', true).single()
      ])

      if (memberRes.error) throw memberRes.error
      setMember(memberRes.data)
      setPayments(paymentsRes.data || [])
      setAttendance(attendanceRes.data || [])
      setMeasurements(measurementsRes.data || [])
      setMemberRoutine(routineRes.data || null)

      // Load active membership
      const { data: memberships } = await supabase
        .from('memberships')
        .select('*, membership_plans(*)')
        .eq('member_id', id)
        .order('fecha_vencimiento', { ascending: false })
        .limit(1)
      if (memberships?.length) setMembership(memberships[0])
    } catch (err) {
      toast.error('No se pudo cargar el miembro')
      navigate('/admin/members')
    } finally {
      setLoading(false)
    }
  }

  const generateQR = async () => {
    try {
      const data = JSON.stringify({ type: 'krovex', id: member.id, dni: member.dni })
      const url = await QRCode.toDataURL(data, { width: 200, margin: 1, color: { dark: '#0A0D18', light: '#ffffff' } })
      setQrUrl(url)
    } catch {}
  }

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar a ${member.nombre} ${member.apellido}? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('members').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Miembro eliminado')
    navigate('/admin/members')
  }

  const handleChangeStatus = async (newStatus) => {
    const { error } = await supabase.from('members').update({ estado: newStatus }).eq('id', id)
    if (error) { toast.error('Error al actualizar estado'); return }
    setMember(prev => ({ ...prev, estado: newStatus }))
    toast.success('Estado actualizado')
  }

  const handleAddPayment = async (e) => {
    e.preventDefault()
    setSavingPayment(true)
    const { error } = await supabase.from('payments').insert({
      member_id: id,
      monto: parseFloat(paymentForm.monto),
      metodo: paymentForm.metodo,
      concepto: paymentForm.concepto,
      estado: 'pagado'
    })
    setSavingPayment(false)
    if (error) { toast.error('Error al registrar pago'); return }
    toast.success('Pago registrado')
    setShowPaymentModal(false)
    setPaymentForm({ monto: '', metodo: 'efectivo', concepto: '' })
    loadMember()
  }

  const daysLeft = membership ? daysUntil(membership.fecha_vencimiento) : null
  const initials = member ? getInitials(member.nombre, member.apellido) : ''
  const avatarColor = member ? getAvatarColor(member.dni) : ''

  if (loading) return <div className="loading-spinner"><div className="spinner" /><p>Cargando...</p></div>
  if (!member) return null

  return (
    <div className="member-detail-page">
      {/* Header */}
      <div className="member-detail-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/members')}>
          <ArrowLeft size={18} /> Volver
        </button>
        <div className="member-detail-actions">
          <Link to={`/admin/members/${id}/edit`} className="btn btn-secondary btn-sm">
            <Edit size={16} /> Editar
          </Link>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Profile card */}
      <div className="member-profile-card">
        <div className="member-profile-left">
          <div className="member-detail-avatar" style={{ background: avatarColor }}>
            {member.foto_url ? <img src={member.foto_url} alt="" /> : initials}
          </div>
          <div className="member-profile-info">
            <h1>{member.nombre} {member.apellido}</h1>
            <div className="member-profile-meta">
              <span className="font-mono text-muted">{member.numero_socio}</span>
              <span>·</span>
              <span className="font-mono">DNI {member.dni}</span>
            </div>
            <div className="flex gap-3 items-center" style={{ marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
              <span className={`badge ${membershipStatusBadge(member.estado)}`}>
                {membershipStatusLabel[member.estado]}
              </span>
              {daysLeft !== null && (
                <span className={`badge ${daysLeft < 0 ? 'badge-danger' : daysLeft <= 7 ? 'badge-warning' : 'badge-success'}`}>
                  {daysLeft < 0 ? `Vencida hace ${Math.abs(daysLeft)}d` : daysLeft === 0 ? 'Vence hoy' : `Vence en ${daysLeft}d`}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="member-profile-right">
          {qrUrl && <img src={qrUrl} alt="QR" className="member-qr" />}
        </div>
      </div>

      {/* Quick info */}
      <div className="member-quick-info">
        {member.telefono && (
          <a href={`tel:${member.telefono}`} className="quick-info-item">
            <Phone size={16} /> {member.telefono}
          </a>
        )}
        {member.email && (
          <a href={`mailto:${member.email}`} className="quick-info-item">
            <Mail size={16} /> {member.email}
          </a>
        )}
        {member.fecha_nacimiento && (
          <div className="quick-info-item">
            <Calendar size={16} /> {formatDate(member.fecha_nacimiento)}
          </div>
        )}
        {member.direccion && (
          <div className="quick-info-item">
            <MapPin size={16} /> {member.direccion}
          </div>
        )}
      </div>

      {/* Membership card */}
      {membership && (
        <div className={`membership-banner ${membership.estado}`}>
          <CreditCard size={20} />
          <div className="membership-banner-info">
            <strong>{membership.membership_plans?.nombre}</strong>
            <span>Válida hasta {formatDate(membership.fecha_vencimiento)}</span>
          </div>
          {membership.clases_restantes !== null && (
            <div className="membership-banner-classes">
              <strong>{membership.clases_restantes}</strong>
              <span>clases</span>
            </div>
          )}
        </div>
      )}

      {/* Status actions */}
      <div className="member-status-actions">
        {member.estado !== 'activo' && (
          <button className="btn btn-success btn-sm" onClick={() => handleChangeStatus('activo')}>
            <CheckCircle size={16} /> Activar
          </button>
        )}
        {member.estado !== 'suspendido' && (
          <button className="btn btn-secondary btn-sm" onClick={() => handleChangeStatus('suspendido')}>
            <AlertTriangle size={16} /> Suspender
          </button>
        )}
        {member.estado !== 'baja' && (
          <button className="btn btn-danger btn-sm" onClick={() => handleChangeStatus('baja')}>
            <Trash2 size={16} /> Dar de baja
          </button>
        )}
        <button className="btn btn-primary btn-sm" onClick={() => setShowPaymentModal(true)} style={{ marginLeft: 'auto' }}>
          <Plus size={16} /> Registrar pago
        </button>
      </div>

      {/* Tabs */}
      <div className="detail-tabs">
        {TABS.map(t => (
          <button
            key={t}
            className={`detail-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="detail-tab-content">
        {/* RESUMEN */}
        {tab === 'resumen' && (
          <div className="grid-2 gap-4">
            <div className="card">
              <h4 style={{ marginBottom: 'var(--space-3)' }}>Estadísticas</h4>
              <div className="detail-stats">
                <div className="detail-stat">
                  <Activity size={18} color="var(--color-primary)" />
                  <div>
                    <div className="stat-value" style={{ fontSize: '1.5rem' }}>{attendance.length}</div>
                    <div className="stat-label">Visitas totales</div>
                  </div>
                </div>
                <div className="detail-stat">
                  <DollarSign size={18} color="var(--color-success)" />
                  <div>
                    <div className="stat-value" style={{ fontSize: '1.5rem' }}>
                      {formatCurrency(payments.reduce((s, p) => s + Number(p.monto), 0))}
                    </div>
                    <div className="stat-label">Total pagado</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h4 style={{ marginBottom: 'var(--space-3)' }}>Datos personales</h4>
              <div className="detail-fields">
                {member.contacto_emergencia_nombre && (
                  <>
                    <div className="detail-field-label">Contacto emergencia</div>
                    <div className="detail-field-value">{member.contacto_emergencia_nombre}</div>
                    <div className="detail-field-label">Teléfono emergencia</div>
                    <div className="detail-field-value">{member.contacto_emergencia_telefono}</div>
                  </>
                )}
                <div className="detail-field-label">Fecha de alta</div>
                <div className="detail-field-value">{formatDate(member.created_at)}</div>
              </div>
            </div>
          </div>
        )}

        {/* PAGOS */}
        {tab === 'pagos' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-3)' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowPaymentModal(true)}>
                <Plus size={16} /> Registrar pago
              </button>
            </div>
            {payments.length === 0 ? (
              <div className="empty-state"><p>No hay pagos registrados</p></div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr><th>Fecha</th><th>Concepto</th><th>Método</th><th>Monto</th><th>Estado</th></tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id}>
                        <td>{formatDate(p.created_at)}</td>
                        <td>{p.concepto || 'Membresía'}</td>
                        <td>{paymentMethodLabel[p.metodo]}</td>
                        <td className="font-mono">{formatCurrency(p.monto)}</td>
                        <td><span className={`badge badge-${p.estado === 'pagado' ? 'success' : 'warning'}`}>{p.estado}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ASISTENCIAS */}
        {tab === 'asistencias' && (
          <div>
            <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-3)' }}>
              {attendance.length} visitas registradas
            </p>
            {attendance.length === 0 ? (
              <div className="empty-state"><p>Sin asistencias registradas</p></div>
            ) : (
              <div className="attendance-list">
                {attendance.map(a => (
                  <div key={a.id} className="attendance-item">
                    <Activity size={16} color="var(--color-primary)" />
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{formatDateTime(a.created_at)}</div>
                      <div className="text-xs text-muted">via {a.metodo} — {a.tipo}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RUTINA */}
        {tab === 'rutina' && (
          <div>
            {!memberRoutine ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Dumbbell size={28} /></div>
                <h3>Sin rutina asignada</h3>
                <p>Asigná una rutina al miembro desde la sección de Rutinas</p>
              </div>
            ) : (
              <div>
                <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                  <div className="card-header">
                    <h3 className="card-title">{memberRoutine.routines?.nombre}</h3>
                    <span className="badge badge-primary">{memberRoutine.routines?.nivel}</span>
                  </div>
                  <p className="text-muted text-sm">{memberRoutine.routines?.descripcion}</p>
                </div>
                {memberRoutine.routines?.routine_days?.sort((a, b) => a.orden - b.orden).map(day => (
                  <div key={day.id} className="card" style={{ marginBottom: 'var(--space-3)' }}>
                    <h4 style={{ marginBottom: 'var(--space-3)' }}>{day.nombre}</h4>
                    {day.routine_exercises?.sort((a, b) => a.orden - b.orden).map(ex => (
                      <div key={ex.id} className="exercise-item">
                        <div className="exercise-name">{ex.exercises?.nombre}</div>
                        <div className="exercise-detail">
                          {ex.series} series × {ex.repeticiones} reps
                          {ex.peso && ` — ${ex.peso}`}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MEDIDAS */}
        {tab === 'medidas' && (
          <div>
            {measurements.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Ruler size={28} /></div>
                <h3>Sin medidas registradas</h3>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr><th>Fecha</th><th>Peso</th><th>Altura</th><th>IMC</th><th>% Grasa</th><th>Cintura</th></tr>
                  </thead>
                  <tbody>
                    {measurements.map(m => (
                      <tr key={m.id}>
                        <td>{formatDate(m.fecha)}</td>
                        <td>{m.peso ? `${m.peso} kg` : '—'}</td>
                        <td>{m.altura ? `${m.altura} cm` : '—'}</td>
                        <td className="font-mono">{m.imc || '—'}</td>
                        <td>{m.porcentaje_grasa ? `${m.porcentaje_grasa}%` : '—'}</td>
                        <td>{m.cintura ? `${m.cintura} cm` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* NOTAS */}
        {tab === 'notas' && (
          <NoteTab member={member} onUpdate={loadMember} />
        )}
      </div>

      {/* Payment modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Registrar pago</h2>
              <button className="btn-icon" onClick={() => setShowPaymentModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddPayment} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Monto</label>
                <input type="number" className="form-input font-mono" placeholder="15000" value={paymentForm.monto}
                  onChange={e => setPaymentForm(p => ({ ...p, monto: e.target.value }))} required min="1" />
              </div>
              <div className="form-group">
                <label className="form-label">Método de pago</label>
                <select className="form-select" value={paymentForm.metodo} onChange={e => setPaymentForm(p => ({ ...p, metodo: e.target.value }))}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="mercadopago">MercadoPago</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Concepto</label>
                <input type="text" className="form-input" placeholder="Mensual Musculación" value={paymentForm.concepto}
                  onChange={e => setPaymentForm(p => ({ ...p, concepto: e.target.value }))} />
              </div>
              <div className="flex gap-3">
                <button type="button" className="btn btn-secondary w-full" onClick={() => setShowPaymentModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary w-full" disabled={savingPayment}>
                  {savingPayment ? 'Guardando...' : 'Registrar pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .member-detail-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); }
        .member-detail-actions { display: flex; gap: var(--space-2); }
        .member-profile-card { background: var(--color-surface); border-radius: var(--radius-lg); border: 1px solid var(--color-border); padding: var(--space-6); display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); gap: var(--space-4); }
        .member-profile-left { display: flex; align-items: center; gap: var(--space-4); }
        .member-detail-avatar { width: 72px; height: 72px; border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 1.5rem; font-weight: 700; flex-shrink: 0; overflow: hidden; }
        .member-detail-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .member-profile-info h1 { font-size: 1.75rem; font-family: var(--font-display); }
        .member-profile-meta { display: flex; gap: var(--space-2); align-items: center; color: var(--color-text-muted); font-size: 0.875rem; margin: var(--space-1) 0; }
        .member-qr { width: 80px; height: 80px; border-radius: var(--radius-md); border: 1px solid var(--color-border); }
        .member-quick-info { display: flex; gap: var(--space-4); flex-wrap: wrap; margin-bottom: var(--space-4); }
        .quick-info-item { display: flex; align-items: center; gap: var(--space-2); font-size: 0.875rem; color: var(--color-text-secondary); text-decoration: none; }
        .quick-info-item:hover { color: var(--color-primary); }
        .membership-banner { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-4); border-radius: var(--radius-lg); margin-bottom: var(--space-4); border: 1px solid; }
        .membership-banner.activo { background: var(--color-success-light); border-color: #bbf7d0; color: var(--color-success); }
        .membership-banner.vencido { background: var(--color-danger-light); border-color: #fecaca; color: var(--color-danger); }
        .membership-banner-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .membership-banner-info strong { font-weight: 600; }
        .membership-banner-info span { font-size: 0.8rem; opacity: 0.8; }
        .membership-banner-classes { text-align: center; }
        .membership-banner-classes strong { font-family: var(--font-display); font-size: 2rem; display: block; line-height: 1; }
        .membership-banner-classes span { font-size: 0.75rem; opacity: 0.8; }
        .member-status-actions { display: flex; gap: var(--space-2); margin-bottom: var(--space-4); flex-wrap: wrap; }
        .detail-tabs { display: flex; gap: 2px; background: var(--color-bg); border-radius: var(--radius-md); padding: 4px; margin-bottom: var(--space-4); }
        .detail-tab { flex: 1; padding: var(--space-2) var(--space-3); background: none; border: none; font-family: var(--font-body); font-size: 0.8125rem; font-weight: 500; color: var(--color-text-muted); cursor: pointer; border-radius: var(--radius-sm); transition: all var(--transition-fast); white-space: nowrap; }
        .detail-tab.active { background: var(--color-surface); color: var(--color-primary); font-weight: 600; box-shadow: var(--shadow-sm); }
        .detail-tab-content {}
        .detail-stats { display: flex; flex-direction: column; gap: var(--space-4); }
        .detail-stat { display: flex; align-items: center; gap: var(--space-3); }
        .detail-fields { display: flex; flex-direction: column; gap: var(--space-1); }
        .detail-field-label { font-size: 0.75rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: var(--space-2); }
        .detail-field-value { font-size: 0.9375rem; color: var(--color-text-secondary); }
        .attendance-list { display: flex; flex-direction: column; gap: var(--space-2); }
        .attendance-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); background: var(--color-surface); border-radius: var(--radius-md); border: 1px solid var(--color-border); }
        .exercise-item { display: flex; justify-content: space-between; padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border-light); }
        .exercise-item:last-child { border-bottom: none; }
        .exercise-name { font-weight: 500; font-size: 0.9rem; }
        .exercise-detail { font-size: 0.8125rem; color: var(--color-text-muted); font-family: var(--font-mono); }
        @media (max-width: 768px) { .member-profile-card { flex-direction: column; } .member-profile-left { flex-direction: column; text-align: center; } .member-qr { display: none; } .detail-tabs { overflow-x: auto; } .detail-tab { flex: none; } }
      `}</style>
    </div>
  )
}

function NoteTab({ member, onUpdate }) {
  const [notes, setNotes] = useState(member.notas || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('members').update({ notas: notes }).eq('id', member.id)
    setSaving(false)
    if (error) { toast.error('Error al guardar notas'); return }
    toast.success('Notas guardadas')
    onUpdate()
  }

  return (
    <div>
      <div className="form-group">
        <label className="form-label">Notas internas del staff</label>
        <textarea
          className="form-textarea"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={8}
          placeholder="Notas sobre el miembro (solo visible para el staff)..."
        />
      </div>
      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Guardando...' : 'Guardar notas'}
      </button>
    </div>
  )
}
