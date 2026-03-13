import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../utils/helpers'
import { Bell, Plus, Send, FileText, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CommunicationsPage() {
  const [notifications, setNotifications] = useState([])
  const [templates, setTemplates] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('send')
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [form, setForm] = useState({ member_id: '', titulo: '', mensaje: '', tipo: 'info' })
  const [templateForm, setTemplateForm] = useState({ nombre: '', tipo: 'info', titulo: '', mensaje: '' })
  const [sending, setSending] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [notifRes, templRes, membRes] = await Promise.all([
      supabase.from('notifications').select('*, members(nombre, apellido)').order('created_at', { ascending: false }).limit(50),
      supabase.from('notification_templates').select('*').eq('activa', true),
      supabase.from('members').select('id, nombre, apellido, numero_socio').in('estado', ['activo', 'vencido']).order('apellido')
    ])
    setNotifications(notifRes.data || [])
    setTemplates(templRes.data || [])
    setMembers(membRes.data || [])
    setLoading(false)
  }

  const applyTemplate = (template) => {
    setForm(p => ({ ...p, titulo: template.titulo, mensaje: template.mensaje, tipo: template.tipo }))
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!form.member_id && !window.confirm('¿Enviar a TODOS los miembros activos?')) return
    setSending(true)

    if (form.member_id) {
      const { error } = await supabase.from('notifications').insert({
        member_id: form.member_id, titulo: form.titulo, mensaje: form.mensaje, tipo: form.tipo
      })
      if (error) { toast.error('Error al enviar'); setSending(false); return }
      toast.success('Aviso enviado')
    } else {
      // Send to all active members
      const inserts = members.map(m => ({ member_id: m.id, titulo: form.titulo, mensaje: form.mensaje, tipo: form.tipo }))
      const { error } = await supabase.from('notifications').insert(inserts)
      if (error) { toast.error('Error al enviar masivo'); setSending(false); return }
      toast.success(`Aviso enviado a ${inserts.length} miembros`)
    }

    setSending(false)
    setForm({ member_id: '', titulo: '', mensaje: '', tipo: 'info' })
    loadData()
  }

  const handleSaveTemplate = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('notification_templates').insert(templateForm)
    if (error) { toast.error('Error'); return }
    toast.success('Plantilla guardada')
    setShowTemplateModal(false)
    setTemplateForm({ nombre: '', tipo: 'info', titulo: '', mensaje: '' })
    loadData()
  }

  const markAsRead = async (id) => {
    await supabase.from('notifications').update({ leida: true }).eq('id', id)
    loadData()
  }

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))
  const setTpl = (f) => (e) => setTemplateForm(p => ({ ...p, [f]: e.target.value }))

  const typeBadge = { info: 'badge-info', alerta: 'badge-warning', bienvenida: 'badge-success', deuda: 'badge-danger' }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Comunicaciones</h1>
          <p className="page-subtitle">Avisos y notificaciones a miembros</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: 4, width: 'fit-content', marginBottom: 'var(--space-4)' }}>
        {[['send','📤 Enviar aviso'],['history','📋 Historial'],['templates','📝 Plantillas']].map(([t,l]) => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {tab === 'send' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 'var(--space-4)' }}>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Nuevo aviso</h3>
            <form onSubmit={handleSend} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Destinatario</label>
                <select className="form-select" value={form.member_id} onChange={set('member_id')}>
                  <option value="">Todos los miembros</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.nombre} {m.apellido} — {m.numero_socio}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-select" value={form.tipo} onChange={set('tipo')}>
                  <option value="info">Información</option>
                  <option value="alerta">Alerta</option>
                  <option value="bienvenida">Bienvenida</option>
                  <option value="deuda">Deuda</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Título *</label>
                <input type="text" className="form-input" value={form.titulo} onChange={set('titulo')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Mensaje *</label>
                <textarea className="form-textarea" value={form.mensaje} onChange={set('mensaje')} required rows={5} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={sending}>
                <Send size={18} /> {sending ? 'Enviando...' : 'Enviar aviso'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-3)' }}>Plantillas rápidas</h3>
            {templates.length === 0 ? (
              <p className="text-sm text-muted">Sin plantillas. Creá una en la pestaña Plantillas.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {templates.map(t => (
                  <button key={t.id} className="btn btn-secondary" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => applyTemplate(t)}>
                    <span className={`badge ${typeBadge[t.tipo]}`} style={{ flexShrink: 0 }}>{t.tipo}</span>
                    {t.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="table-container">
          {loading ? <div className="loading-spinner"><div className="spinner" /></div> : notifications.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><Bell size={28} /></div><h3>Sin notificaciones enviadas</h3></div>
          ) : (
            <table className="table">
              <thead><tr><th>Fecha</th><th>Miembro</th><th>Título</th><th>Tipo</th><th>Leída</th><th></th></tr></thead>
              <tbody>
                {notifications.map(n => (
                  <tr key={n.id}>
                    <td className="text-sm">{formatDate(n.created_at)}</td>
                    <td>{n.members?.nombre} {n.members?.apellido}</td>
                    <td style={{ fontWeight: 500 }}>{n.titulo}</td>
                    <td><span className={`badge ${typeBadge[n.tipo]}`}>{n.tipo}</span></td>
                    <td>{n.leida ? <CheckCircle size={16} color="var(--color-success)" /> : <span className="badge badge-warning">No leída</span>}</td>
                    <td>{!n.leida && <button className="btn btn-sm btn-ghost" onClick={() => markAsRead(n.id)}>Marcar leída</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'templates' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-3)' }}>
            <button className="btn btn-primary" onClick={() => setShowTemplateModal(true)}><Plus size={16} /> Nueva plantilla</button>
          </div>
          {templates.length === 0 ? (
            <div className="card"><div className="empty-state"><div className="empty-state-icon"><FileText size={28} /></div><h3>Sin plantillas</h3></div></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
              {templates.map(t => (
                <div key={t.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{t.nombre}</h3>
                      <span className={`badge ${typeBadge[t.tipo]}`} style={{ marginTop: 4 }}>{t.tipo}</span>
                    </div>
                    <button className="btn btn-sm btn-secondary" onClick={() => { applyTemplate(t); setTab('send') }}>Usar</button>
                  </div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: 'var(--space-3)' }}>{t.titulo}</p>
                  <p className="text-sm text-muted">{t.mensaje}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showTemplateModal && (
        <div className="modal-overlay" onClick={() => setShowTemplateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nueva plantilla</h2>
              <button className="btn-icon" onClick={() => setShowTemplateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveTemplate} className="flex flex-col gap-4">
              <div className="form-group"><label className="form-label">Nombre de la plantilla *</label><input type="text" className="form-input" value={templateForm.nombre} onChange={setTpl('nombre')} required /></div>
              <div className="form-group"><label className="form-label">Tipo</label>
                <select className="form-select" value={templateForm.tipo} onChange={setTpl('tipo')}>
                  <option value="info">Información</option><option value="alerta">Alerta</option><option value="bienvenida">Bienvenida</option><option value="deuda">Deuda</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Título *</label><input type="text" className="form-input" value={templateForm.titulo} onChange={setTpl('titulo')} required /></div>
              <div className="form-group"><label className="form-label">Mensaje *</label><textarea className="form-textarea" value={templateForm.mensaje} onChange={setTpl('mensaje')} required rows={4} /><p className="text-xs text-muted">Podés usar {'{nombre}'}, {'{fecha_vencimiento}'}, {'{monto}'}</p></div>
              <div className="flex gap-3">
                <button type="button" className="btn btn-secondary w-full" onClick={() => setShowTemplateModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary w-full">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
