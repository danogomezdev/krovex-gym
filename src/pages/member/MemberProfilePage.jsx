import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { getMemberQRData, getInitials, getAvatarColor, formatDate } from '../../utils/helpers'
import { LogOut, QrCode, User, Shield } from 'lucide-react'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'

export default function MemberProfilePage() {
  const { member, logout } = useAuth()
  const [qrUrl, setQrUrl] = useState(null)
  const [showQR, setShowQR] = useState(false)
  const [memberData, setMemberData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadProfile() }, [member?.id])

  const loadProfile = async () => {
    if (!member?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('members')
      .select('*, memberships(*, membership_plans(nombre, tipo))')
      .eq('id', member.id)
      .single()
    setMemberData(data)

    // Generate QR
    try {
      const qrData = getMemberQRData(member.id, member.dni)
      const url = await QRCode.toDataURL(qrData, {
        width: 260, margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' }
      })
      setQrUrl(url)
    } catch { /* ignore */ }
    setLoading(false)
  }

  const handleLogout = () => {
    if (window.confirm('¿Cerrar sesión?')) logout()
  }

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>

  const activeMembership = memberData?.memberships?.find(m => m.estado === 'activo')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Profile card */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)',
        color: '#fff', textAlign: 'center'
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', margin: '0 auto var(--space-3)',
          background: getAvatarColor(member?.dni || ''),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '1.75rem', color: '#fff',
          border: '3px solid rgba(255,255,255,0.3)'
        }}>
          {getInitials(member?.nombre, member?.apellido)}
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem' }}>
          {member?.nombre} {member?.apellido}
        </h1>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', opacity: 0.8, marginTop: 4 }}>
          {memberData?.numero_socio}
        </div>
        <div style={{ marginTop: 'var(--space-3)', display: 'flex', justifyContent: 'center', gap: 'var(--space-3)' }}>
          <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 14px', borderRadius: 'var(--radius-full)', fontSize: '0.8rem' }}>
            DNI {member?.dni}
          </span>
          {activeMembership && (
            <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 14px', borderRadius: 'var(--radius-full)', fontSize: '0.8rem' }}>
              {activeMembership.membership_plans?.nombre}
            </span>
          )}
        </div>
      </div>

      {/* QR code */}
      <div style={{
        background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-4)', border: '1px solid var(--color-border)', textAlign: 'center'
      }}>
        <div style={{ fontWeight: 700, marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <QrCode size={18} /> Mi código QR
        </div>
        {showQR && qrUrl ? (
          <div>
            <img src={qrUrl} alt="QR Code" style={{ width: 200, height: 200, borderRadius: 'var(--radius-md)', margin: '0 auto', display: 'block' }} />
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
              Mostrá este código en la entrada del gimnasio
            </p>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--space-2)' }} onClick={() => setShowQR(false)}>
              Ocultar QR
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)' }}>
              Tu código QR personal para el check-in rápido
            </p>
            <button className="btn btn-primary" onClick={() => setShowQR(true)}>
              <QrCode size={16} /> Mostrar mi QR
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)', border: '1px solid var(--color-border)' }}>
        <div style={{ fontWeight: 700, marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={16} /> Mis datos
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {[
            ['DNI', member?.dni],
            ['Email', memberData?.email || '—'],
            ['Teléfono', memberData?.telefono || '—'],
            ['Número de socio', memberData?.numero_socio],
            ['Fecha de alta', memberData?.created_at ? formatDate(memberData.created_at) : '—'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-border-light)' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{label}</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Membership */}
      {activeMembership && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontWeight: 700, marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={16} /> Membresía activa
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {[
              ['Plan', activeMembership.membership_plans?.nombre],
              ['Inicio', formatDate(activeMembership.fecha_inicio)],
              ['Vencimiento', formatDate(activeMembership.fecha_vencimiento)],
              activeMembership.clases_restantes !== null && ['Clases restantes', activeMembership.clases_restantes],
            ].filter(Boolean).map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-border-light)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{label}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logout */}
      <button
        className="btn btn-danger"
        onClick={handleLogout}
        style={{ marginTop: 'var(--space-2)' }}
      >
        <LogOut size={18} /> Cerrar sesión
      </button>
    </div>
  )
}
