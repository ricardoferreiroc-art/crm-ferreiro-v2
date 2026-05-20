// Formatear fecha española
export const fmtFecha = (d) => {
  if (!d) return '—'
  const dt = typeof d === 'string' ? new Date(d + 'T00:00:00') : d
  return dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Días hasta una fecha
export const diasHasta = (fecha) => {
  if (!fecha) return null
  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const d = new Date(fecha + 'T00:00:00')
  return Math.round((d - hoy) / 86400000)
}

// Formatear importe €
export const fmtEur = (n) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)

// Iniciales de un nombre
export const iniciales = (nombre) => {
  if (!nombre) return '?'
  const partes = nombre.replace(/[&+]/g, ' ').trim().split(/\s+/)
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

// Color de avatar por tipo
export const avatarColor = (tipo) => {
  const m = {
    'Boda':          'bg-brand/10 text-brand',
    'Elopement':     'bg-brand/10 text-brand',
    'Proposal':      'bg-emerald-100 text-emerald-800',
    'Sesión Pareja': 'bg-emerald-100 text-emerald-800',
    'Embarazo':      'bg-pink-100 text-pink-700',
    'Bautizo':       'bg-purple-100 text-purple-700',
    'Evento Social': 'bg-teal-100 text-teal-700',
    'Preboda':       'bg-emerald-100 text-emerald-800',
    'Postboda':      'bg-emerald-100 text-emerald-800',
  }
  return m[tipo] || 'bg-gray-100 text-gray-600'
}

// Badge de tipo de trabajo
export const tipoBadge = (tipo) => {
  const m = {
    'Boda':          'badge-boda',
    'Elopement':     'badge-boda',
    'Proposal':      'badge-sesion',
    'Sesión Pareja': 'badge-sesion',
    'Embarazo':      'badge-sesion',
    'Bautizo':       'badge-sesion',
    'Evento Social': 'badge-sesion',
    'Preboda':       'badge-sesion',
    'Postboda':      'badge-sesion',
  }
  return m[tipo] || 'badge-segundo'
}

// Estados del lead en orden
export const ESTADOS_LEAD = [
  'Nuevo',
  'Contactado',
  'Presupuestado',
  'Cuestionario enviado',
  'Contrato enviado',
  'Firmado',
  'Confirmado',
]

export const TIPOS_TRABAJO = [
  'Boda', 'Elopement', 'Proposal', 'Sesión Pareja',
  'Embarazo', 'Bautizo', 'Evento Social', 'Preboda', 'Postboda', 'Otros',
]

export const FUENTES_LEAD = [
  'Instagram', 'Web', 'Referido', 'Google', 'Feria', 'Otro',
]

export const ADDONS = [
  'Preboda', 'Postboda', 'Álbum', '2º fotógrafo', 'Hora extra', 'Express',
]

// Comprobar si un trabajo es boda completa
export const esBoda = (tipo) => ['Boda', 'Elopement'].includes(tipo)
export const esSesion = (tipo) => !esBoda(tipo)
