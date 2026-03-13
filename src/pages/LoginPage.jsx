import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, Dumbbell, Lock, Mail, Hash } from 'lucide-react'
import './LoginPage.css'

export default function LoginPage() {
  const { signIn, memberSignIn } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('admin') // 'admin' | 'member'
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Admin form
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Member form
  const [dni, setDni] = useState('')
  const [pin, setPin] = useState('')

  const handleAdminLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { success } = await signIn(email, password)
    setLoading(false)
    if (success) navigate('/admin')
  }

  const handleMemberLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { success } = await memberSignIn(dni, pin)
    setLoading(false)
    if (success) navigate('/member')
  }

  return (
    <div className="login-page">
      <div className="login-bg" />

      <div className="login-container">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <Dumbbell size={32} color="#fff" />
          </div>
          <div className="login-logo-text">
            <h1>KROVEX</h1>
            <span>GYM SYSTEM</span>
          </div>
        </div>

        {/* Card */}
        <div className="login-card">
          {/* Tabs */}
          <div className="login-tabs">
            <button
              className={`login-tab ${tab === 'admin' ? 'active' : ''}`}
              onClick={() => setTab('admin')}
            >
              Staff / Admin
            </button>
            <button
              className={`login-tab ${tab === 'member' ? 'active' : ''}`}
              onClick={() => setTab('member')}
            >
              Socio
            </button>
          </div>

          {/* Admin form */}
          {tab === 'admin' && (
            <form className="login-form" onSubmit={handleAdminLogin}>
              <h2 className="login-form-title">Iniciar sesión</h2>
              <p className="login-form-sub">Acceso para staff y administradores</p>

              <div className="form-group">
                <label className="form-label">Email</label>
                <div className="input-icon-wrapper">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    className="form-input"
                    placeholder="admin@gimnasio.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <div className="input-icon-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="input-icon-right btn-icon"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
          )}

          {/* Member form */}
          {tab === 'member' && (
            <form className="login-form" onSubmit={handleMemberLogin}>
              <h2 className="login-form-title">Portal del Socio</h2>
              <p className="login-form-sub">Ingresá con tu DNI y PIN de 4 dígitos</p>

              <div className="form-group">
                <label className="form-label">DNI</label>
                <div className="input-icon-wrapper">
                  <Hash size={18} className="input-icon" />
                  <input
                    type="text"
                    className="form-input font-mono"
                    placeholder="30111222"
                    value={dni}
                    onChange={e => setDni(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    required
                    autoFocus
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">PIN</label>
                <div className="pin-inputs">
                  {[0, 1, 2, 3].map(i => (
                    <input
                      key={i}
                      type="password"
                      className="pin-input"
                      maxLength={1}
                      value={pin[i] || ''}
                      inputMode="numeric"
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '')
                        const arr = pin.split('')
                        arr[i] = val
                        setPin(arr.join('').slice(0, 4))
                        if (val && i < 3) {
                          const next = document.querySelectorAll('.pin-input')[i + 1]
                          if (next) next.focus()
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Backspace' && !pin[i] && i > 0) {
                          const prev = document.querySelectorAll('.pin-input')[i - 1]
                          if (prev) prev.focus()
                        }
                      }}
                    />
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading || pin.length < 4}>
                {loading ? 'Verificando...' : 'Entrar al portal'}
              </button>

              <p className="login-hint">Datos de prueba: DNI 30111222 — PIN 1234</p>
            </form>
          )}
        </div>

        <p className="login-footer">
          Krovex Gym System © {new Date().getFullYear()} — Desarrollado por Krovex
        </p>
      </div>
    </div>
  )
}
