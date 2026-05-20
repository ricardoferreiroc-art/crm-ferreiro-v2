import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { fmtFecha, fmtEur, ESTADOS_LEAD } from '../../lib/utils'
import {
  X, Send, FileText, CheckCircle2, RotateCcw,
  Clock, ChevronRight, Trash2, PlusCircle
} from 'lucide-react'

const PASOS = [
  { estado: 'Nuevo',                accion: 'Enviar dossier',       icon: Send },
  { estado: 'Contactado',           accion: 'Registrar precio',      icon: CheckCircle2 },
  { estado: 'Presupuestado',        accion: 'Enviar cuestionario',   icon: Send },
  { estado: 'Cuestionario enviado', accion: 'Generar contrato',      icon: FileText },
  { estado: 'Contrato enviado',     accion: 'Marcar como firmado',   icon: CheckCircle2 },
  { estado: 'Firmado',              accion: 'Confirmar trabajo',     icon: CheckCircle2 },
]

export default function LeadDetalle({ leadId, onClose, onUpdate, onConfirmar }) {
  const { user } = useAuth()
  const [lead, setLead] = useState(null)
  const [notas, setNotas] = useState([])
  const [nuevaNota, setNuevaNota] = useState('')
  const [loading, setLoading] = useState(true)
  const [accionando, setAccionando] = useState(false)
  const [modalDescarte, setModalDescarte] = useState(false)
  const [motivoDescarte, setMotivoDescarte] = useState('')
  const [editPrecio, setEditPrecio] = useState(false)
  const [precio, setPrecio] = useState('')

  useEffect(() => { cargar() }, [leadId])

  async function cargar() {
    setLoading(true)
    const [{ data: l }, { data: n }] = await Promise.all([
      supabase.from('v2_leads').select('*').eq('id', leadId).single(),
      supabase.from('v2_leads_notas').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(10),
    ])
    setLead(l)
    setNotas(n || [])
    setPrecio(l?.precio_acordado || '')
    setLoading(false)
  }

  const idxEstado = ESTADOS_LEAD.indexOf(lead?.estado)

  async function avanzarEstado() {
    if (!lead || idxEstado >= ESTADOS_LEAD.length - 1) return
    setAccionando(true)
    const nuevoEstado = ESTADOS_LEAD[idxEstado + 1]

    // Si es "Confirmado" redirigir a crear trabajo
    if (nuevoEstado === 'Confirmado') {
      await supabase.from('v2_leads').update({
        estado: 'Confirmado',
        confirmado_at: new Date().toISOString(),
      }).eq('id', lead.id).eq('user_id', user.id)
      setAccionando(false)
      onUpdate()
      onConfirmar(lead.id)
      return
    }

    // Timestamps específicos por estado
    const ts = {}
    if (nuevoEstado === 'Contactado') ts.dossier_enviado_at = new Date().toISOString()
    if (nuevoEstado === 'Cuestionario enviado') ts.cuestionario_enviado_at = new Date().toISOString()
    if (nuevoEstado === 'Contrato enviado') ts.contrato_enviado_at = new Date().toISOString()
    if (nuevoEstado === 'Firmado') ts.contrato_firmado_at = new Date().toISOString()

    await supabase.from('v2_leads').update({ estado: nuevoEstado, ...ts })
      .eq('id', lead.id).eq('user_id', user.id)

    // Historial
    await supabase.from('v2_leads_historial').insert({
      lead_id: lead.id, estado_de: lead.estado, estado_a: nuevoEstado,
    })

    setAccionando(false)
    cargar()
    onUpdate()
  }

  async function guardarPrecio() {
    const p = parseFloat(precio)
    if (isNaN(p)) return
    await supabase.from('v2_leads')
      .update({ precio_acordado: p, estado: 'Presupuestado' })
      .eq('id', lead.id).eq('user_id', user.id)
    setEditPrecio(false)
    cargar(); onUpdate()
  }

  async function descartar() {
    await supabase.from('v2_leads').update({
      estado: 'Descartado',
      descartado_at: new Date().toISOString(),
      motivo_descarte: motivoDescarte || null,
    }).eq('id', lead.id).eq('user_id', user.id)
    setModalDescarte(false)
    onUpdate(); onClose()
  }

  async function addNota() {
    if (!nuevaNota.trim()) return
    await supabase.from('v2_leads_notas').insert({
      lead_id: lead.id, user_id: user.id, texto: nuevaNota.trim(),
    })
    setNuevaNota('')
    cargar()
  }

  if (loading) return <div className="p-6 text-sm text-ink-3">Cargando…</div>
  if (!lead) return null

  const paso = PASOS[idxEstado]
  const esFirmado = lead.estado === 'Firmado'
  const esDescartado = lead.estado === 'Descartado'

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="bg-brand px-5 py-4 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-[15px] truncate">{lead.nombre}</p>
          <p className="text-white/60 text-[11px] mt-0.5">
            {lead.tipo_trabajo}
            {lead.fecha_evento ? ` · ${fmtFecha(lead.fecha_evento)}` : ''}
            {lead.lugar ? ` · ${lead.lugar}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <span className="bg-white/15 text-white text-[10px] px-2 py-0.5 rounded-full">
            {lead.estado}
          </span>
          <button onClick={onClose} className="text-white/50 hover:text-white ml-1 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">

        {/* Progress bar de pasos */}
        {!esDescartado && (
          <div className="px-5 py-4 border-b border-cream-dark">
            <div className="flex items-center gap-0">
              {ESTADOS_LEAD.map((e, i) => (
                <div key={e} className="flex items-center flex-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0
                    ${i < idxEstado ? 'bg-brand text-white' :
                      i === idxEstado ? 'bg-white border-2 border-brand text-brand' :
                      'bg-cream-dark text-ink-3'}`}>
                    {i < idxEstado ? <CheckCircle2 size={12} /> : i + 1}
                  </div>
                  {i < ESTADOS_LEAD.length - 1 && (
                    <div className={`flex-1 h-px ${i < idxEstado ? 'bg-brand' : 'bg-cream-dark'}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              {ESTADOS_LEAD.map((e, i) => (
                <span key={e} className={`text-[8.5px] ${i === idxEstado ? 'text-brand font-medium' : 'text-ink-3'}`}
                  style={{ flex: 1, textAlign: i === 0 ? 'left' : i === ESTADOS_LEAD.length - 1 ? 'right' : 'center' }}>
                  {e.split(' ')[0]}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Datos */}
        <div className="px-5 py-4 border-b border-cream-dark">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="label">Precio acordado</p>
              {editPrecio ? (
                <div className="flex gap-1.5">
                  <input type="number" value={precio} onChange={e => setPrecio(e.target.value)}
                    className="input text-sm py-1 flex-1" placeholder="0" />
                  <button onClick={guardarPrecio} className="btn-primary py-1 px-2 text-xs">OK</button>
                </div>
              ) : (
                <button onClick={() => setEditPrecio(true)}
                  className="font-serif text-[18px] text-brand hover:opacity-80 transition-opacity text-left">
                  {lead.precio_acordado ? fmtEur(lead.precio_acordado) : '—'}
                </button>
              )}
            </div>
            <div>
              <p className="label">Fuente</p>
              <p className="text-sm text-ink">{lead.fuente || '—'}</p>
            </div>
            {lead.email && (
              <div>
                <p className="label">Email</p>
                <a href={`mailto:${lead.email}`} className="text-sm text-brand hover:underline">{lead.email}</a>
              </div>
            )}
            {lead.telefono && (
              <div>
                <p className="label">Teléfono</p>
                <a href={`tel:${lead.telefono}`} className="text-sm text-ink hover:text-brand">{lead.telefono}</a>
              </div>
            )}
            {lead.n_invitados && (
              <div>
                <p className="label">Invitados</p>
                <p className="text-sm text-ink">{lead.n_invitados}</p>
              </div>
            )}
            {lead.idioma && lead.idioma !== 'es' && (
              <div>
                <p className="label">Idioma</p>
                <p className="text-sm text-ink uppercase">{lead.idioma}</p>
              </div>
            )}
          </div>
          {lead.notas && (
            <div className="mt-3 bg-cream rounded-lg px-3 py-2.5 text-sm text-ink-2">
              {lead.notas}
            </div>
          )}
        </div>

        {/* Acción principal */}
        {!esDescartado && paso && (
          <div className="px-5 py-4 border-b border-cream-dark">
            <p className="text-[11px] font-medium text-ink-2 mb-2.5">Acción siguiente</p>
            <div className="space-y-2">
              <button
                onClick={avanzarEstado}
                disabled={accionando}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-all
                  ${esFirmado
                    ? 'bg-brand text-white border-brand hover:bg-blue-900'
                    : 'bg-brand text-white border-brand hover:bg-blue-900'
                  } disabled:opacity-60`}
              >
                <paso.icon size={15} />
                {paso.accion}
                <ChevronRight size={14} className="ml-auto" />
              </button>

              {/* Acción secundaria según estado */}
              {lead.estado === 'Contrato enviado' && (
                <button className="btn-ghost w-full justify-start text-sm">
                  <RotateCcw size={13} /> Reenviar contrato
                </button>
              )}
              {lead.estado === 'Cuestionario enviado' && (
                <button className="btn-ghost w-full justify-start text-sm">
                  <RotateCcw size={13} /> Reenviar cuestionario
                </button>
              )}

              <button
                onClick={() => setModalDescarte(true)}
                className="btn-ghost w-full justify-start text-sm text-ink-3 hover:text-red-600 hover:bg-red-50"
              >
                <X size={13} /> Descartar lead
              </button>
            </div>
          </div>
        )}

        {/* Historial de notas */}
        <div className="px-5 py-4">
          <p className="text-[11px] font-medium text-ink-2 mb-2.5">Notas e historial</p>
          <div className="flex gap-2 mb-3">
            <input
              value={nuevaNota}
              onChange={e => setNuevaNota(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && addNota()}
              className="input text-sm flex-1"
              placeholder="Añadir nota…"
            />
            <button onClick={addNota} className="btn-primary py-1.5 px-3 text-xs">
              <PlusCircle size={13} />
            </button>
          </div>
          <div className="space-y-2">
            {notas.map(n => (
              <div key={n.id} className="text-sm text-ink bg-cream rounded-lg px-3 py-2">
                <p className="leading-snug">{n.texto}</p>
                <p className="text-[10px] text-ink-3 mt-1">{fmtFecha(n.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal descarte */}
      {modalDescarte && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-xl p-5 w-full max-w-xs shadow-xl">
            <p className="font-medium text-ink mb-3">Descartar lead</p>
            <input
              value={motivoDescarte}
              onChange={e => setMotivoDescarte(e.target.value)}
              className="input text-sm mb-4"
              placeholder="Motivo (opcional): precio, fecha, otro fotógrafo…"
            />
            <div className="flex gap-2">
              <button onClick={() => setModalDescarte(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={descartar} className="bg-red-600 text-white text-sm px-4 py-2 rounded-lg flex-1 hover:bg-red-700">
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
