import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDateTime, membershipStatusBadge, getInitials, getAvatarColor } from '../../utils/helpers'
import { useAuth } from '../../context/AuthContext'
import { Search, QrCode, CheckCircle, XCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import './CheckInPage.css'

export default function CheckInPage() {
  const { staffUser } = useAuth()
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState([])
  const [searching, setSearching] = useState(false)
  const [lastCheckins, setLastCheckins] = useState([])
  const [result, setResult] = useState(null) // { success, member, membership }
  const searchRef = useRef()

  useEffect(() => {
    loadLastCheckins()
    if (searchRef.current) searchRef.current.focus()
  }, [])

  const loadLastCheckins = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('attendance')
      .select('*, members(nombre, apellido, numero_socio)')
      .gte('created_at', today + 'T00:00:00')
      .order('created_at', { ascending: false })
      .limit(15)
    setLastCheckins(data || [])
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!search.trim()) return
    setSearching(true)
    setResult(null)

    // Search by DNI, name or numero_socio
    const { data } = await supabase
      .from('members')
      .select('*')
      .or(`dni.ilike.%${search}%,nombre.ilike.%${search}%,apellido.ilike.%${search}%,numero_socio.ilike.%${search}%`)
      .limit(5)

    setSearching(false)
    setMembers(data || [])
    if (data?.length === 0) toast.error('No se encontró ningún miembro')
    if (data?.length === 1) handleCheckIn(data[0].id)
  }

  const handleCheckIn = async (memberId) => {
    setSearching(true)
    setMembers([])
    const { data, error } = await supabase.rpc('check_in_member', {
      p_member_id: memberId,
      p_staff_id: staffUser?.id !== 'demo' ? staffUser?.id : null,
      p_metodo: 'manual'
    })
    setSearching(false)

    if (error) { toast.error('Error de conexión'); return }

    setResult(data)
    setSearch('')

    if (data.success) {
      toast.success(`¡Check-in exitoso! ${data.member.nombre} ${data.member.apellido}`)
      loadLastCheckins()
    } else {
      toast.error(data.error || 'No se pudo registrar el check-in')
    }

    // Clear result after 5 seconds
    setTimeout(() => setResult(null), 5000)
  }

  return (
    <div className="checkin-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Check-in</h1>
          <p className="page-subtitle">Registrar ingreso de miembros</p>
        </div>
      </div>

      <div className="checkin-layout">
        {/* Search panel */}
        <div className="checkin-search-panel">
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>
              <Search size={20} /> Buscar miembro
            </h3>
            <form onSubmit={handleSearch}>
              <div className="search-input-wrapper" style={{ marginBottom: 'var(--space-3)' }}>
                <Search size={16} className="search-icon" />
                <input
                  ref={searchRef}
                  type="text"
                  className="form-input"
                  placeholder="DNI, nombre o número de socio..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setMembers([]); setResult(null) }}
                  autoComplete="off"
                />
              </div>
              <button type="submit" className="btn btn-primary w-full btn-lg" disabled={searching || !search}>
                {searching ? 'Buscando...' : 'Buscar y registrar ingreso'}
              </button>
            </form>

            {/* Multiple results */}
            {members.length > 1 && (
              <div className="checkin-members-list">
                <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-2)' }}>Seleccioná el miembro:</p>
                {members.map(m => (
                  <button key={m.id} className="checkin-member-btn" onClick={() => handleCheckIn(m.id)}>
                    <div className="checkin-avatar" style={{ background: getAvatarColor(m.dni) }}>
                      {getInitials(m.nombre, m.apellido)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{m.nombre} {m.apellido}</div>
                      <div className="text-xs text-muted">DNI: {m.dni} · {m.numero_socio}</div>
                    </div>
                    <span className={`badge ${membershipStatusBadge(m.estado)}`}>{m.estado}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Result display */}
            {result && (
              <div className={`checkin-result ${result.success ? 'success' : 'error'}`}>
                <div className="checkin-result-icon">
                  {result.success ? <CheckCircle size={40} /> : <XCircle size={40} />}
                </div>
                <div className="checkin-result-info">
                  <h2>{result.member?.nombre} {result.member?.apellido}</h2>
                  {result.success ? (
                    <>
                      <p>✅ Ingreso registrado</p>
                      <p className="text-sm text-muted">Membresía válida hasta: {result.membership?.fecha_vencimiento}</p>
                    </>
                  ) : (
                    <p>❌ {result.error}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* QR info */}
          <div className="card" style={{ marginTop: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <QrCode size={32} color="var(--color-primary)" />
              <div>
                <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Check-in por QR</h3>
                <p className="text-sm text-muted">Usá un lector QR conectado al equipo para check-in automático. El código QR de cada miembro está disponible en su perfil.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent check-ins */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><Clock size={18} /> Check-ins de hoy</h3>
            <span className="badge badge-primary">{lastCheckins.length}</span>
          </div>
          {lastCheckins.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
              <p>Sin registros hoy</p>
            </div>
          ) : (
            <div className="checkin-history">
              {lastCheckins.map(c => (
                <div key={c.id} className="checkin-history-item">
                  <div className="checkin-avatar" style={{ background: getAvatarColor(c.member_id), flexShrink: 0 }}>
                    {getInitials(c.members?.nombre, c.members?.apellido)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>
                      {c.members?.nombre} {c.members?.apellido}
                    </div>
                    <div className="text-xs text-muted">{c.members?.numero_socio}</div>
                  </div>
                  <div className="text-xs text-muted" style={{ textAlign: 'right' }}>
                    {new Date(c.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
