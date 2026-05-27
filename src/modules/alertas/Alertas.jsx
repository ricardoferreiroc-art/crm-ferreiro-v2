import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { fmtFecha, diasHasta } from '../../lib/utils'
import {
  AlertTriangle, Coins, FileText, Image, Bell,
  Check, X, Plus, ChevronRight, Calendar
} from 'lucide-react'

const TIPOS_ALERTA = ['recordatorio', 'cobro', 'entrega', 'contrato', 'reunion', 'sistema']
const PRIORIDADES = ['baja', 'normal', 'alta', 'critica']

const ICONO = {
  recordatorio: <Bell size={13} />,
  cobro:        <Coins size={13} />,
  entrega:      <Image size={13} />,
  contrato:     <FileText size={13} />,
  reunion:      <Calendar size={13} />,
  sistema:      <AlertTriangle size={13} />,
}

const COLOR_PRIO = {
  critica: 'bg-red-100 text-red-700 border-red-200',
  alta:    'bg-amber-100 text-amber-700 border-amber-200',
  normal:  'bg-brand/10 text-brand border-brand/20',
  baja:    'bg-cream-dark text-ink-3 border-cream-dark',
}

const COLOR_ICONO = {
  critica: 'bg-red-100 text-red-700',
  alta:    'bg-amber-100 text-amber-700',
  normal:  'bg-brand/10 text-brand',
  baja:    'bg-cream-dark text-ink-3',
}

export default function Alertas() {
  const { user } = useAuth()
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('pendientes') // pendientes | todas | completadas
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ titulo: '', tipo: 'recordatorio', prioridad: 'normal', fecha_alerta: '', descripcion: '' })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { if (user) cargar() }, [user])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('v2_alertas')
      .select(`*, trabajo:trabajo_id(titulo, fecha), lead:lead_id(nombre, fecha_evento), segundo:segundo_id(novios, fecha)`)
      .eq('user_id', user.id)
      .order('fecha_alerta', { ascending: true })
    setAlertas(data || [])
    setLoading(false)
  }

  async function completar(id) {
    await supabase.from('v2_alertas')
      .update({ completada: true, completada_at: new Date().toISOString() })
      .eq('id', id).eq('user_id', user.id)
    setAlertas(a => a.map(x => x.id === id ? { ...x, completada: true } : x))
  }

  async function eliminar(id) {
    await supabase.from('v2_alertas').delete().eq('id', id).eq('user_id', user.id)
    setAlertas(a => a.filter(x => x.id !== id))
  }

  async function crearAlerta(e) {
    e.preventDefault()
    setGuardando(true)
    await supabase.from('v2_alertas').insert({
      user_id: user.id,
      titulo: form.titulo,
      descripcion: form.descripcion || null,
      fecha_alerta: form.fecha_alerta,
      tipo: form.tipo,
      prioridad: form.prioridad,
      completada: false,
    })
    setModal(false)
    setForm({ titulo: '', tipo: 'recordatorio', prioridad: 'normal', fecha_alerta: '', descripcion: '' })
    setGuardando(false)
    cargar()
  }

  // Generar alertas automáticas de bodas próximas
  async function generarAlertas() {
    const { data: trabajos } = await supabase
      .from('v2_trabajos')
      .select('id, titulo, fecha, cobrado, precio_total, resumen_enviado, estado_entrega')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .gte('fecha', new Date().toISOString().split('T')[0])
      .lte('fecha', new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0])

    const alertasNuevas = []
    for (const t of trabajos || []) {
      const dias = diasHasta(t.fecha)
      // Alerta resumen 24h
      if (dias <= 2 && dias >= 0 && !t.resumen_enviado) {
        alertasNuevas.push({
          user_id: user.id, titulo: `Resumen 24h sin enviar`, descripcion: t.titulo,
          fecha_alerta: t.fecha, tipo: 'recordatorio', prioridad: 'critica',
          trabajo_id: t.id, auto: true, completada: false,
        })
      }
      // Alerta cobro pendiente
      if ((t.precio_total - t.cobrado) > 0 && dias <= 7) {
        alertasNuevas.push({
          user_id: user.id,
          titulo: `Cobro pendiente — ${new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(t.precio_total - t.cobrado)}`,
          descripcion: t.titulo,
          fecha_alerta: t.fecha, tipo: 'cobro', prioridad: 'alta',
          trabajo_id: t.id, auto: true, completada: false,
        })
      }
    }

    if (alertasNuevas.length > 0) {
      // Solo insertar las que no existen ya (por trabajo_id y tipo)
      for (const a of alertasNuevas) {
        const { data: existe } = await supabase.from('v2_alertas')
          .select('id').eq('trabajo_id', a.trabajo_id).eq('tipo', a.tipo)
          .eq('completada', false).eq('user_id', user.id).single()
        if (!existe) await supabase.from('v2_alertas').insert(a)
      }
      cargar()
    }
  }

  useEffect(() => { if (user) generarAlertas() }, [user])

  const filtradas = alertas.filter(a => {
    if (filtro === 'pendientes') return !a.completada
    if (filtro === 'completadas') return a.completada
    return true
  })

  const criticas = alertas.filter(a => !a.completada && a.prioridad === 'critica').length
  const pendientes = alertas.filter(a => !a.completada).length

  const refEntidad = (a) => {
    if (a.trabajo) return { label: a.trabajo.titulo, fecha: a.trabajo.fecha, to: `/trabajos/${a.trabajo_id}` }
    if (a.lead) return { label: a.lead.nombre, fecha: a.lead.fecha_evento, to: `/leads` }
    if (a.segundo) return { label: a.segundo.novios, fecha: a.segundo.fecha, to: null }
    return null
  }

  return (
    <div className="p-4 md:p-7 md:max-w-3xl md:mx-auto">

      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-[15px] font-medium text-ink">Alertas</h1>
          {criticas > 0 && (
            <span className="bg-red-600 text-white text-xs font-medium px-2.5 py-0.5 rounded-full">
              {criticas} crítica{criticas > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button onClick={() => setModal(true)} className="btn-primary">
          <Plus size={14} /> Nueva alerta
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { l: 'Pendientes', v: pendientes, color: 'text-ink' },
          { l: 'Críticas', v: criticas, color: 'text-red-600' },
          { l: 'Hoy', v: alertas.filter(a => !a.completada && a.fecha_alerta === new Date().toISOString().split('T')[0]).length, color: 'text-amber-600' },
          { l: 'Completadas', v: alertas.filter(a => a.completada).length, color: 'text-emerald-600' },
        ].map(k => (
          <div key={k.l} className="card px-4 py-3">
            <p className="text-[10px] text-ink-3 mb-1">{k.l}</p>
            <p className={`font-serif text-2xl ${k.color}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex border-b border-cream-dark mb-5">
        {[
          { id: 'pendientes', label: `Pendientes (${pendientes})` },
          { id: 'todas', label: 'Todas' },
          { id: 'completadas', label: 'Completadas' },
        ].map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)}
            className={`px-4 py-2 text-sm border-b-2 transition-all ${filtro === f.id
              ? 'border-brand text-brand font-medium'
              : 'border-transparent text-ink-3 hover:text-ink'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-ink-3 text-center py-10">Cargando…</p>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check size={20} className="text-emerald-600" />
          </div>
          <p className="text-sm text-ink-2 font-medium">Todo al día</p>
          <p className="text-xs text-ink-3 mt-1">No hay alertas pendientes</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map(a => {
            const ref = refEntidad(a)
            const dias = diasHasta(a.fecha_alerta)
            return (
              <div key={a.id}
                className={`flex items-start gap-3 p-4 rounded-xl border transition-all
                  ${a.completada ? 'opacity-50 bg-cream' : `${COLOR_PRIO[a.prioridad] || COLOR_PRIO.normal}`}`}>

                {/* Icono */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5
                  ${a.completada ? 'bg-cream-dark text-ink-3' : COLOR_ICONO[a.prioridad] || COLOR_ICONO.normal}`}>
                  {ICONO[a.tipo] || <Bell size={13} />}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${a.completada ? 'line-through text-ink-3' : 'text-ink'}`}>
                    {a.titulo}
                  </p>
                  {a.descripcion && (
                    <p className="text-xs text-ink-3 mt-0.5">{a.descripcion}</p>
                  )}
                  {ref && (
                    <div className="flex items-center gap-1 mt-1">
                      {ref.to ? (
                        <Link to={ref.to} className="text-xs text-brand hover:underline flex items-center gap-1">
                          {ref.label} <ChevronRight size={10} />
                        </Link>
                      ) : (
                        <span className="text-xs text-ink-3">{ref.label}</span>
                      )}
                      {ref.fecha && <span className="text-xs text-ink-3">· {fmtFecha(ref.fecha)}</span>}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-ink-3">{fmtFecha(a.fecha_alerta)}</span>
                    {!a.completada && dias !== null && (
                      <span className={`text-[10px] font-medium ${
                        dias < 0 ? 'text-red-600' : dias === 0 ? 'text-amber-600' : 'text-ink-3'}`}>
                        {dias < 0 ? `Vencida hace ${Math.abs(dias)}d` : dias === 0 ? 'Hoy' : `En ${dias}d`}
                      </span>
                    )}
                    {a.auto && <span className="text-[9px] text-ink-3 bg-white/50 px-1.5 py-0.5 rounded-full">Auto</span>}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!a.completada && (
                    <button onClick={() => completar(a.id)}
                      className="w-7 h-7 rounded-lg bg-white/60 hover:bg-white flex items-center justify-center text-emerald-600 transition-all"
                      title="Marcar completada">
                      <Check size={14} />
                    </button>
                  )}
                  <button onClick={() => eliminar(a.id)}
                    className="w-7 h-7 rounded-lg bg-white/60 hover:bg-white flex items-center justify-center text-ink-3 hover:text-red-500 transition-all"
                    title="Eliminar">
                    <X size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal nueva alerta */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-cream-dark">
              <h2 className="font-medium text-ink">Nueva alerta</h2>
              <button onClick={() => setModal(false)} className="text-ink-3 hover:text-ink"><X size={18} /></button>
            </div>
            <form onSubmit={crearAlerta} className="px-6 py-5 space-y-3">
              <div>
                <label className="label">Título *</label>
                <input value={form.titulo} onChange={e => setForm(f => ({...f, titulo: e.target.value}))}
                  className="input text-sm" required placeholder="Ej: Llamar a la pareja" />
              </div>
              <div>
                <label className="label">Descripción</label>
                <input value={form.descripcion} onChange={e => setForm(f => ({...f, descripcion: e.target.value}))}
                  className="input text-sm" placeholder="Opcional" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({...f, tipo: e.target.value}))} className="select text-sm">
                    {TIPOS_ALERTA.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Prioridad</label>
                  <select value={form.prioridad} onChange={e => setForm(f => ({...f, prioridad: e.target.value}))} className="select text-sm">
                    {PRIORIDADES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Fecha *</label>
                <input type="date" value={form.fecha_alerta} onChange={e => setForm(f => ({...f, fecha_alerta: e.target.value}))}
                  className="input text-sm" required />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
                <button type="submit" disabled={guardando} className="btn-primary flex-1 justify-center">
                  {guardando ? 'Guardando…' : 'Crear alerta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
