import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { getInitials, getAvatarColor, formatDateTime } from '../../utils/helpers'
import { Plus, Edit, Trash2, Shield, UserCheck, Key, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import './StaffUsersPage.css'

const ROLES = [
  { value: 'super_admin', label: 'Super Admin', desc: 'Acceso total al sistema', color: '#7c3aed' },
  { value: 'admin',       label: 'Admin',        desc: 'Panel admin completo',   color: '#2563EB' },
  { value: 'recepcionista', label: 'Recepcionista', desc: 'Check-in, pagos, miembros', color: '#0891b2' },
  { value: 'entrenador',  label: 'Entrenador',   desc: 'Portal trainer (sus clases)', color: '#16a34a' },
]

const EMPTY_FORM = { email: '', password: '', nombre: '', apellido: '', rol: 'recepcionista', telefono: '' }

export default function StaffUsersPage() {
  const { staffUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editForm, setEditForm] = useState({ nombre: '', apellido: '', rol: '', telefono: '' })
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const isSuperAdmin = staffUser?.rol === 'super_admin'

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('staff_users')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))
  const setEdit = (f) => (e) => setEditForm(p => ({ ...p, [f]: e.target.value }))

  // ── CREATE ──────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password || !form.nombre) {
      toast.error('Completá los campos obligatorios')
      return
    }
    if (form.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setSaving(true)
    try {
      // 1. Create auth user via Admin API (requires service_role) — fallback: use signUp
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: form.email,
        password: form.password,
        email_confirm: true,
      })

      let userId
      if (authError) {
        // Fallback: use regular signUp (works with anon key but requires email confirmation)
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { nombre: form.nombre, apellido: form.apellido } }
        })
        if (signUpError) throw signUpError
        userId = signUpData.user?.id
        if (!userId) throw new Error('No se obtuvo el ID del usuario')
        toast('📧 Usuario creado. Puede que necesite confirmar su email.', { icon: 'ℹ️' })
      } else {
        userId = authData.user?.id
      }

      // 2. Insert into staff_users
      const { error: staffError } = await supabase.from('staff_users').insert({
        id: userId,
        email: form.email,
        nombre: form.nombre,
        apellido: form.apellido,
        rol: form.rol,
        telefono: form.telefono || null,
        activo: true
      })
      if (staffError) throw staffError

      toast.success(`✅ Usuario ${form.nombre} ${form.apellido} creado`)
      setShowModal(false)
      setForm(EMPTY_FORM)
      loadUsers()
    } catch (err) {
      toast.error(err.message || 'Error al crear usuario')
    } finally {
      setSaving(false)
    }
  }

  // ── EDIT ────────────────────────────────────────────────
  const openEdit = (u) => {
    setEditUser(u)
    setEditForm({ nombre: u.nombre, apellido: u.apellido || '', rol: u.rol, telefono: u.telefono || '' })
    setShowEditModal(true)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('staff_users').update({
      nombre: editForm.nombre,
      apellido: editForm.apellido,
      rol: editForm.rol,
      telefono: editForm.telefono || null,
    }).eq('id', editUser.id)
    setSaving(false)
    if (error) { toast.error('Error al actualizar'); return }
    toast.success('Usuario actualizado')
    setShowEditModal(false)
    loadUsers()
  }

  // ── TOGGLE ACTIVE ────────────────────────────────────────
  const toggleActive = async (u) => {
    if (u.id === staffUser?.id) { toast.error('No podés desactivar tu propia cuenta'); return }
    const { error } = await supabase.from('staff_users').update({ activo: !u.activo }).eq('id', u.id)
    if (error) { toast.error('Error'); return }
    toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado')
    loadUsers()
  }

  // ── CHANGE PASSWORD ──────────────────────────────────────
  const openPwd = (u) => { setEditUser(u); setNewPassword(''); setShowPwdModal(true) }

  const handleChangePwd = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) { toast.error('Mínimo 6 caracteres'); return }
    setSaving(true)
    const { error } = await supabase.auth.admin.updateUserById(editUser.id, { password: newPassword })
    setSaving(false)
    if (error) {
      toast.error('Error al cambiar contraseña. Necesitás service_role key.')
      return
    }
    toast.success('Contraseña actualizada')
    setShowPwdModal(false)
  }

  // ── DELETE ───────────────────────────────────────────────
  const handleDelete = async (u) => {
    if (u.id === staffUser?.id) { toast.error('No podés eliminar tu propia cuenta'); return }
    if (!window.confirm(`¿Eliminar a ${u.nombre} ${u.apellido}? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('staff_users').delete().eq('id', u.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Usuario eliminado')
    loadUsers()
  }

  const getRoleInfo = (rol) => ROLES.find(r => r.value === rol) || ROLES[1]

  return (
    <div className="staff-users-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuarios del sistema</h1>
          <p className="page-subtitle">{users.filter(u => u.activo).length} usuarios activos</p>
        </div>
        {isSuperAdmin && (
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setShowModal(true) }}>
            <Plus size={18} /> Nuevo usuario
          </button>
        )}
      </div>

      {!isSuperAdmin && (
        <div className="staff-notice">
          <Shield size={16} />
          Solo los <strong>super admin</strong> pueden crear, editar y eliminar usuarios.
        </div>
      )}

      {/* Roles legend */}
      <div className="roles-legend">
        {ROLES.map(r => (
          <div key={r.value} className="role-chip" style={{ borderColor: r.color + '40', background: r.color + '10' }}>
            <div className="role-dot" style={{ background: r.color }} />
            <div>
              <div className="role-name" style={{ color: r.color }}>{r.label}</div>
              <div className="role-desc">{r.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : users.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={28} /></div>
            <h3>No hay usuarios creados</h3>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Crear primer usuario</button>
          </div>
        </div>
      ) : (
        <div className="staff-grid">
          {users.map(u => {
            const roleInfo = getRoleInfo(u.rol)
            const isMe = u.id === staffUser?.id
            return (
              <div key={u.id} className={`staff-card ${!u.activo ? 'inactive' : ''}`}>
                <div className="staff-card-header">
                  <div className="staff-avatar" style={{ background: getAvatarColor(u.email) }}>
                    {getInitials(u.nombre, u.apellido)}
                  </div>
                  <div className="staff-info">
                    <div className="staff-name">
                      {u.nombre} {u.apellido}
                      {isMe && <span className="badge-me">Vos</span>}
                    </div>
                    <div className="staff-email">{u.email}</div>
                  </div>
                </div>

                <div className="staff-meta">
                  <span className="staff-role-badge" style={{ background: roleInfo.color + '15', color: roleInfo.color, border: `1px solid ${roleInfo.color}30` }}>
                    <Shield size={12} /> {roleInfo.label}
                  </span>
                  <span className={`badge ${u.activo ? 'badge-success' : 'badge-neutral'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {u.telefono && (
                  <div className="staff-phone">📞 {u.telefono}</div>
                )}

                <div className="staff-created">
                  Alta: {u.created_at ? new Date(u.created_at).toLocaleDateString('es-AR') : '—'}
                </div>

                {isSuperAdmin && (
                  <div className="staff-actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(u)}>
                      <Edit size={14} /> Editar
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => openPwd(u)} title="Cambiar contraseña">
                      <Key size={14} />
                    </button>
                    <button
                      className={`btn btn-sm ${u.activo ? 'btn-warning' : 'btn-success'}`}
                      onClick={() => toggleActive(u)}
                      disabled={isMe}
                    >
                      <UserCheck size={14} /> {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    {!isMe && (
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── CREATE MODAL ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nuevo usuario staff</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input type="text" className="form-input" value={form.nombre} onChange={set('nombre')} required autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido</label>
                  <input type="text" className="form-input" value={form.apellido} onChange={set('apellido')} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input type="email" className="form-input" value={form.email} onChange={set('email')} required placeholder="usuario@tugym.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña *</label>
                <input type="password" className="form-input" value={form.password} onChange={set('password')} required minLength={6} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="form-group">
                <label className="form-label">Rol *</label>
                <div className="role-selector">
                  {ROLES.map(r => (
                    <label key={r.value} className={`role-option ${form.rol === r.value ? 'selected' : ''}`} style={form.rol === r.value ? { borderColor: r.color, background: r.color + '10' } : {}}>
                      <input type="radio" name="rol" value={r.value} checked={form.rol === r.value} onChange={set('rol')} style={{ display: 'none' }} />
                      <div className="role-dot" style={{ background: r.color }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: form.rol === r.value ? r.color : 'var(--color-text)' }}>{r.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{r.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input type="text" className="form-input" value={form.telefono} onChange={set('telefono')} placeholder="Opcional" />
              </div>
              <div className="flex gap-3">
                <button type="button" className="btn btn-secondary w-full" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary w-full" disabled={saving}>
                  {saving ? 'Creando...' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {showEditModal && editUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Editar usuario</h2>
              <button className="btn-icon" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <form onSubmit={handleEdit} className="flex flex-col gap-4">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input type="text" className="form-input" value={editForm.nombre} onChange={setEdit('nombre')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido</label>
                  <input type="text" className="form-input" value={editForm.apellido} onChange={setEdit('apellido')} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Rol</label>
                <div className="role-selector">
                  {ROLES.map(r => (
                    <label key={r.value} className={`role-option ${editForm.rol === r.value ? 'selected' : ''}`} style={editForm.rol === r.value ? { borderColor: r.color, background: r.color + '10' } : {}}>
                      <input type="radio" name="edit_rol" value={r.value} checked={editForm.rol === r.value} onChange={setEdit('rol')} style={{ display: 'none' }} />
                      <div className="role-dot" style={{ background: r.color }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: editForm.rol === r.value ? r.color : 'var(--color-text)' }}>{r.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{r.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input type="text" className="form-input" value={editForm.telefono} onChange={setEdit('telefono')} />
              </div>
              <div className="flex gap-3">
                <button type="button" className="btn btn-secondary w-full" onClick={() => setShowEditModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary w-full" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PASSWORD MODAL ── */}
      {showPwdModal && editUser && (
        <div className="modal-overlay" onClick={() => setShowPwdModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Cambiar contraseña</h2>
              <button className="btn-icon" onClick={() => setShowPwdModal(false)}>✕</button>
            </div>
            <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-4)' }}>
              Cambiando contraseña de <strong>{editUser.nombre} {editUser.apellido}</strong>
            </p>
            <form onSubmit={handleChangePwd} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Nueva contraseña *</label>
                <input type="password" className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" autoFocus />
              </div>
              <div className="flex gap-3">
                <button type="button" className="btn btn-secondary w-full" onClick={() => setShowPwdModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary w-full" disabled={saving}>{saving ? 'Guardando...' : 'Cambiar contraseña'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
