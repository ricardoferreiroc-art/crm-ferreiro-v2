import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { fmtFecha } from '../../lib/utils'
import { Link2, Eye, Check, Copy, RefreshCw, ExternalLink, ClipboardList, FileText, ToggleLeft, ToggleRight } from 'lucide-react'

const BASE_URL = window.location.origin

export default function PortalManager({ trabajoId, trabajoTitulo }) {
  const { user } = useAuth()
  const [portal, setPortal] = useState(null)
  const [firma, setFirma] = useState(null)
  const [cuestionario, setCuestionario] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [verCuest, setVerCuest] = useState(false)

  useEffect(() => { cargar() }, [trabajoId])

  async function cargar() {
    setLoading(true)
    const [{ data: p }, { data: f }, { data: c }] = await Promise.all([
      supabase.from('v2_portales').select('*').eq('trabajo_id', trabajoId).eq('user_id', user.id).single(),
      supabase.from('v2_firmas').select('nombre,firmado_at').eq('trabajo_id', trabajoId).single(),
      supabase.from('v2_cuestionario_respuestas').select('*').eq('trabajo_id', trabajoId).single(),
    ])
    setPortal(p)
    setFirma(f)
    setCuestionario(c)
    setLoading(false)
  }

  async function crearPortal() {
    setCreando(true)
    const { data } = await supabase.from('v2_portales').insert({
      user_id: user.id,
      trabajo_id: trabajoId,
      activo: true,
      mostrar_timing: true,
      mostrar_contrato: true,
    }).select().single()
    setPortal(data)
    setCreando(false)
  }

  async function toggleOpcion(campo) {
    const nuevo = !portal[campo]
    await supabase.from('v2_portales').update({ [campo]: nuevo }).eq('id', portal.id)
    setPortal(p => ({ ...p, [campo]: nuevo }))
  }

  async function regenerarToken() {
    const { data } = await supabase.rpc ? null :
      await supabase.from('v2_portales')
        .update({ token: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) })
        .eq('id', portal.id).select().single()
    if (data) setPortal(data)
  }

  function copiarEnlace() {
    const url = `${BASE_URL}/portal/${portal.token}`
    navigator.clipboard.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const enlace = portal ? `${BASE_URL}/portal/${portal.token}` : ''

  if (loading) return <div className="p-4 text-sm text-ink-3">Cargando portal…</div>

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-ink-2 uppercase tracking-wide">Portal del cliente</p>

      {!portal ? (
        <div className="text-center py-6 bg-cream rounded-xl border border-dashed border-brand/20">
          <Link2 size={24} className="text-ink-3 mx-auto mb-2"/>
          <p className="text-sm text-ink-2 mb-3">Crea un portal privado para {trabajoTitulo}</p>
          <button onClick={crearPortal} disabled={creando} className="btn-primary mx-auto">
            {creando ? 'Creando…' : 'Crear portal'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Enlace */}
          <div className="bg-cream rounded-xl p-4">
            <p className="text-xs text-ink-3 mb-2">Enlace privado del cliente</p>
            <div className="flex items-center gap-2">
              <input readOnly value={enlace} className="input text-xs flex-1 py-1.5 bg-white font-mono"/>
              <button onClick={copiarEnlace}
                className={`btn-ghost py-1.5 px-3 text-xs flex-shrink-0 ${copiado?'text-emerald-600':''}`}>
                {copiado ? <><Check size={12}/> Copiado</> : <><Copy size={12}/> Copiar</>}
              </button>
              <a href={enlace} target="_blank" rel="noreferrer" className="btn-ghost py-1.5 px-2 flex-shrink-0">
                <ExternalLink size={13}/>
              </a>
            </div>
          </div>

          {/* Opciones visibles */}
          <div className="bg-cream rounded-xl p-4 space-y-2.5">
            <p className="text-xs text-ink-3 mb-1">Qué ve el cliente</p>
            {[
              { campo:'mostrar_contrato', label:'Contrato + firma online' },
              { campo:'mostrar_timing', label:'Timing del día' },
              { campo:'mostrar_galeria', label:'Enlace a galería de fotos' },
            ].map(({ campo, label }) => (
              <div key={campo} className="flex items-center justify-between">
                <span className="text-sm text-ink-2">{label}</span>
                <button onClick={() => toggleOpcion(campo)} className="text-ink-3 hover:text-brand transition-colors">
                  {portal[campo]
                    ? <ToggleRight size={22} className="text-brand"/>
                    : <ToggleLeft size={22}/>}
                </button>
              </div>
            ))}
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-cream rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-ink-3 mb-1">
                <Eye size={13}/><span className="text-xs">Visitas</span>
              </div>
              <p className="font-serif text-xl text-ink">{portal.veces_visto || 0}</p>
              {portal.visto_at && <p className="text-[10px] text-ink-3 mt-0.5">Última: {fmtFecha(portal.visto_at)}</p>}
            </div>
            <div className={`rounded-xl p-3 text-center ${firma ? 'bg-emerald-50' : 'bg-cream'}`}>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <FileText size={13} className={firma?'text-emerald-600':'text-ink-3'}/>
                <span className="text-xs text-ink-3">Contrato</span>
              </div>
              {firma ? (
                <>
                  <p className="text-xs font-medium text-emerald-700">Firmado ✓</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">{firma.nombre}</p>
                </>
              ) : (
                <p className="text-xs text-ink-3">Pendiente</p>
              )}
            </div>
          </div>

          {/* Cuestionario */}
          <div className={`rounded-xl p-4 ${cuestionario ? 'bg-emerald-50 border border-emerald-200' : 'bg-cream'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ClipboardList size={14} className={cuestionario?'text-emerald-600':'text-ink-3'}/>
                <span className="text-sm font-medium text-ink">Cuestionario</span>
              </div>
              {cuestionario ? (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Recibido ✓</span>
              ) : (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pendiente</span>
              )}
            </div>

            {cuestionario && (
              <>
                <p className="text-xs text-emerald-600 mb-2">Enviado el {fmtFecha(cuestionario.enviado_at)}</p>
                <button onClick={() => setVerCuest(!verCuest)} className="btn-ghost text-xs w-full justify-center">
                  {verCuest ? 'Ocultar respuestas' : 'Ver respuestas'}
                </button>
                {verCuest && (
                  <div className="mt-3 space-y-1.5 text-xs">
                    {[
                      ['Novios', `${cuestionario.nombre1||''} ${cuestionario.apellidos1||''} & ${cuestionario.nombre2||''} ${cuestionario.apellidos2||''}`],
                      ['DNI', `${cuestionario.dni1||'—'} / ${cuestionario.dni2||'—'}`],
                      ['Teléfonos', `${cuestionario.telefono1||'—'} / ${cuestionario.telefono2||'—'}`],
                      ['Emails', `${cuestionario.email1||'—'} / ${cuestionario.email2||'—'}`],
                      ['Dirección', cuestionario.direccion],
                      ['Ceremonia', cuestionario.lugar_ceremonia],
                      ['Hora ceremonia', cuestionario.hora_ceremonia],
                      ['Hotel', cuestionario.hotel_novios],
                      ['Hora salida hotel', cuestionario.hora_salida_hotel],
                      ['Nº invitados', cuestionario.n_invitados],
                      ['Música entrada', cuestionario.musica_entrada],
                      ['Música salida', cuestionario.musica_salida],
                      ['Videógrafo', cuestionario.nombre_videografo],
                      ['DJ', cuestionario.nombre_dj],
                      ['Wedding Planner', cuestionario.nombre_wp],
                      ['Fotos imprescindibles', cuestionario.fotos_imprescindibles],
                      ['Personas clave', cuestionario.personas_clave],
                      ['Algo a evitar', cuestionario.algo_evitar],
                      ['Notas adicionales', cuestionario.notas_adicionales],
                    ].filter(([,v]) => v).map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="text-emerald-600 font-medium w-28 flex-shrink-0">{k}</span>
                        <span className="text-gray-700">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
