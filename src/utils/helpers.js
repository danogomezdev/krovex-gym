import { format, formatDistanceToNow, differenceInDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// ============================================================
// DATE FORMATTERS
// ============================================================

export const formatDate = (date) => {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, 'dd/MM/yyyy', { locale: es })
  } catch { return '—' }
}

export const formatDateTime = (date) => {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, "dd/MM/yyyy HH:mm", { locale: es })
  } catch { return '—' }
}

export const formatTime = (date) => {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, 'HH:mm', { locale: es })
  } catch { return '—' }
}

export const formatRelative = (date) => {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return formatDistanceToNow(d, { locale: es, addSuffix: true })
  } catch { return '—' }
}

export const daysUntil = (date) => {
  if (!date) return null
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return differenceInDays(d, new Date())
  } catch { return null }
}

export const dayName = (dayNumber) => {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  return days[dayNumber] || ''
}

// ============================================================
// CURRENCY FORMATTERS
// ============================================================

export const formatCurrency = (amount, currency = 'ARS') => {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export const formatNumber = (num) => {
  if (num === null || num === undefined) return '—'
  return new Intl.NumberFormat('es-AR').format(num)
}

// ============================================================
// MEMBERSHIP STATUS
// ============================================================

export const membershipStatusLabel = {
  activo: 'Activo',
  vencido: 'Vencido',
  suspendido: 'Suspendido',
  baja: 'Baja',
  congelado: 'Congelado'
}

export const membershipStatusBadge = (status) => {
  const map = {
    activo: 'badge-success',
    vencido: 'badge-danger',
    suspendido: 'badge-warning',
    baja: 'badge-neutral',
    congelado: 'badge-info'
  }
  return map[status] || 'badge-neutral'
}

export const paymentMethodLabel = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  mercadopago: 'MercadoPago',
  otro: 'Otro'
}

export const paymentStatusBadge = (status) => {
  const map = {
    pagado: 'badge-success',
    pendiente: 'badge-warning',
    vencido: 'badge-danger',
    anulado: 'badge-neutral'
  }
  return map[status] || 'badge-neutral'
}

export const bookingStatusLabel = {
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  lista_espera: 'Lista de espera',
  asistio: 'Asistió'
}

// ============================================================
// IMC CALCULATOR
// ============================================================

export const calcIMC = (peso, altura) => {
  if (!peso || !altura || altura === 0) return null
  const alturaM = altura > 10 ? altura / 100 : altura
  return Math.round((peso / (alturaM * alturaM)) * 100) / 100
}

export const imcCategory = (imc) => {
  if (!imc) return null
  if (imc < 18.5) return { label: 'Bajo peso', color: 'badge-info' }
  if (imc < 25) return { label: 'Normal', color: 'badge-success' }
  if (imc < 30) return { label: 'Sobrepeso', color: 'badge-warning' }
  return { label: 'Obesidad', color: 'badge-danger' }
}

// ============================================================
// EXPORT TO CSV
// ============================================================

export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) return

  const keys = Object.keys(data[0])
  const csvContent = [
    keys.join(','),
    ...data.map(row =>
      keys.map(key => {
        const val = row[key]
        if (val === null || val === undefined) return ''
        const str = String(val).replace(/"/g, '""')
        return str.includes(',') || str.includes('\n') ? `"${str}"` : str
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// ============================================================
// GENERATE QR DATA
// ============================================================

export const getMemberQRData = (memberId, dni) => {
  return JSON.stringify({ type: 'krovex-gym', member_id: memberId, dni })
}

// ============================================================
// NORMALIZE DNI
// ============================================================

export const normalizeDNI = (dni) => {
  if (!dni) return ''
  return dni.replace(/[^0-9]/g, '')
}

// ============================================================
// AVATAR INITIALS
// ============================================================

export const getInitials = (nombre, apellido) => {
  const n = (nombre || '').charAt(0).toUpperCase()
  const a = (apellido || '').charAt(0).toUpperCase()
  return n + a
}

export const getAvatarColor = (str) => {
  const colors = [
    '#2563EB', '#7c3aed', '#db2777', '#059669',
    '#d97706', '#dc2626', '#0284c7', '#16a34a'
  ]
  let hash = 0
  for (let i = 0; i < (str || '').length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// ============================================================
// VALIDATIONS
// ============================================================

export const validateDNI = (dni) => {
  const normalized = normalizeDNI(dni)
  return normalized.length >= 7 && normalized.length <= 9
}

export const validatePIN = (pin) => {
  return /^\d{4}$/.test(pin)
}

export const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ============================================================
// MUSCLE GROUP LABELS
// ============================================================

export const muscleGroupLabel = {
  pecho: 'Pecho',
  espalda: 'Espalda',
  hombros: 'Hombros',
  brazos: 'Brazos',
  piernas: 'Piernas',
  core: 'Core',
  gluteos: 'Glúteos',
  full_body: 'Full Body'
}

// ============================================================
// CLASS TYPE LABELS
// ============================================================

export const classTypeLabel = {
  musculacion: 'Musculación',
  spinning: 'Spinning',
  yoga: 'Yoga',
  pilates: 'Pilates',
  crossfit: 'Crossfit',
  natacion: 'Natación',
  funcional: 'Funcional',
  otro: 'Otro'
}

// ============================================================
// TRUNCATE TEXT
// ============================================================

export const truncate = (text, maxLength = 40) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

// ============================================================
// DEBOUNCE
// ============================================================

export const debounce = (fn, delay) => {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}
