import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDate, membershipStatusBadge, membershipStatusLabel, getInitials, getAvatarColor, debounce, exportToCSV } from '../../utils/helpers'
import { Search, Plus, Filter, Download, ChevronRight, User } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MembersPage() {
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [total, setTotal] = useState(0)

  const loadMembers = useCallback(async (q = '', status = 'all') => {
    setLoading(true)
    try {
      let query = supabase
        .from('members')
        .select(`
          *,
          memberships!member_id(
            estado, fecha_vencimiento, plan_id,
            membership_plans(nombre)
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

      if (q) {
        query = query.or(`nombre.ilike.%${q}%,apellido.ilike.%${q}%,dni.ilike.%${q}%,numero_socio.ilike.%${q}%`)
      }

      if (status !== 'all') {
        query = query.eq('estado', status)
      }

      const { data, error, count } = await query.limit(50)
      if (error) throw error
      setMembers(data || [])
      setTotal(count || 0)
    } catch (err) {
      toast.error('Error al cargar miembros')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMembers() }, [loadMembers])

  const debouncedSearch = useCallback(
    debounce((q) => loadMembers(q, statusFilter), 400),
    [statusFilter, loadMembers]
  )

  const handleSearch = (e) => {
    setSearch(e.target.value)
    debouncedSearch(e.target.value)
  }

  const handleStatusFilter = (status) => {
    setStatusFilter(status)
    loadMembers(search, status)
  }

  const handleExport = () => {
    exportToCSV(
      members.map(m => ({
        Número: m.numero_socio,
        Nombre: m.nombre,
        Apellido: m.apellido,
        DNI: m.dni,
        Email: m.email,
        Teléfono: m.telefono,
        Estado: m.estado,
        'Fecha alta': formatDate(m.created_at)
      })),
      'miembros-krovex.csv'
    )
  }

  const getActiveMembership = (member) => {
    if (!member.memberships?.length) return null
    return member.memberships.find(m => m.estado === 'activo') || member.memberships[0]
  }

  const statusOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'activo', label: 'Activos' },
    { value: 'vencido', label: 'Vencidos' },
    { value: 'suspendido', label: 'Suspendidos' },
    { value: 'baja', label: 'Baja' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Miembros</h1>
          <p className="page-subtitle">{total} socios registrados</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={18} />
            Exportar
          </button>
          <Link to="/admin/members/new" className="btn btn-primary">
            <Plus size={18} />
            Nuevo socio
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-input-wrapper" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por nombre, DNI, número de socio..."
            value={search}
            onChange={handleSearch}
          />
        </div>

        <div className="status-filters">
          {statusOptions.map(opt => (
            <button
              key={opt.value}
              className={`btn btn-sm ${statusFilter === opt.value ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleStatusFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner" />
            <p>Cargando...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><User size={28} /></div>
            <h3>No hay miembros</h3>
            <p>
              {search ? 'No encontramos miembros con esa búsqueda' : 'Agregá el primer socio del gimnasio'}
            </p>
            {!search && (
              <Link to="/admin/members/new" className="btn btn-primary" style={{ marginTop: 'var(--space-3)' }}>
                <Plus size={16} />
                Nuevo socio
              </Link>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Socio</th>
                <th>DNI</th>
                <th>Teléfono</th>
                <th>Plan</th>
                <th>Vencimiento</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => {
                const membership = getActiveMembership(member)
                return (
                  <tr key={member.id} onClick={() => navigate(`/admin/members/${member.id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className="member-avatar"
                          style={{ background: getAvatarColor(member.dni) }}
                        >
                          {member.foto_url
                            ? <img src={member.foto_url} alt="" />
                            : getInitials(member.nombre, member.apellido)
                          }
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{member.nombre} {member.apellido}</div>
                          <div className="text-xs text-muted">{member.numero_socio}</div>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono">{member.dni}</td>
                    <td>{member.telefono || '—'}</td>
                    <td>{membership?.membership_plans?.nombre || '—'}</td>
                    <td>{membership ? formatDate(membership.fecha_vencimiento) : '—'}</td>
                    <td>
                      <span className={`badge ${membershipStatusBadge(member.estado)}`}>
                        {membershipStatusLabel[member.estado]}
                      </span>
                    </td>
                    <td>
                      <ChevronRight size={16} color="var(--color-text-muted)" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        .status-filters { display: flex; gap: var(--space-2); flex-wrap: wrap; }
        .member-avatar {
          width: 38px; height: 38px; border-radius: var(--radius-full);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 0.8rem; font-weight: 700; flex-shrink: 0; overflow: hidden;
        }
        .member-avatar img { width: 100%; height: 100%; object-fit: cover; }
      `}</style>
    </div>
  )
}
