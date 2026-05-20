import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { avatarColor, tipoBadge, iniciales, fmtEur } from '../../lib/utils'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_SEMANA = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

const COLOR_TIPO = {
  'Boda':          'bg-brand/10 border-brand/30 text-brand',
  'Elopement':     'bg-brand/10 border-brand/30 text-brand',
  'Proposal':      'bg-emerald-100 border-emerald-300 text-emerald-800',
  'Sesión Pareja': 'bg-emerald-100 border-emerald-300 text-emerald-800',
  'Embarazo':      'bg-pink-100 border-pink-300 text-pink-800',
  'Bautizo':       'bg-purple-100 border-purple-300 text-purple-800',
  'Evento Social': 'bg-teal-100 border-teal-300 text-teal-800',
  'Preboda':       'bg-emerald-100 border-emerald-300 text-emerald-800',
  'Postboda':      'bg-emerald-100 border-emerald-300 text-emerald-800',
  '2º Fotógrafo':  'bg-amber-100 border-amber-300 text-amber-800',
  'Lead':          'bg-gray-100 border-gray-300 text-gray-600',
}

export default function Calendario() {
  const { user } = useAuth()
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth())
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [diaSeleccionado, setDiaSeleccionado] = useState(null)

  useEffect(() => { if (user) cargar() }, [user, mes, anio])

  async function cargar() {
    setLoading(true)
    const desde = `${anio}-${String(mes + 1).padStart(2,'0')}-01`
    const hasta = `${anio}-${String(mes + 1).padStart(2,'0')}-31`

    const [{ data: trabajos }, { data: segundo }, { data: leads }] = await Promise.all([
      supabase.from('v2_trabajos')
        .select('id, titulo, tipo, fecha, hora_inicio, lugar, estado, precio_total, cobrado, estado_entrega')
        .eq('user_id', user.id).is('deleted_at', null)
        .gte('fecha', desde).lte('fecha', hasta),
      supabase.from('v2_segundo_fotografo')
        .select('id, novios, fecha, hora, lugar, estado, honorarios')
        .eq('user_id', user.id).is('deleted_at', null)
        .gte('fecha', desde).lte('fecha', hasta),
      supabase.from('v2_leads')
        .select('id, nombre, tipo_trabajo, fecha_evento, estado')
        .eq('user_id', user.id).is('deleted_at', null)
        .not('estado', 'in', '(Confirmado,Descartado)')
        .gte('fecha_evento', desde).lte('fecha_evento', hasta),
    ])

    const evs = [
      ...(trabajos || []).map(t => ({
        id: t.id, fecha: t.fecha, titulo: t.titulo, tipo: t.tipo,
        subtitulo: [t.hora_inicio, t.lugar].filter(Boolean).join(' · '),
        estado: t.estado, precio: t.precio_total, cobrado: t.cobrado,
        estado_entrega: t.estado_entrega, _kind: 'trabajo',
      })),
      ...(segundo || []).map(s => ({
        id: s.id, fecha: s.fecha, titulo: s.novios || '—',
        tipo: '2º Fotógrafo',
        subtitulo: [s.hora, s.lugar].filter(Boolean).join(' · '),
        estado: s.estado, precio: s.honorarios, _kind: 'segundo',
      })),
      ...(leads || []).map(l => ({
        id: l.id, fecha: l.fecha_evento, titulo: l.nombre,
        tipo: 'Lead',
        subtitulo: `Lead · ${l.estado}`, _kind: 'lead',
      })),
    ].filter(e => e.fecha)

    setEventos(evs)
    setLoading(false)
  }

  // Construir grid del mes
  const primerDia = new Date(anio, mes, 1)
  const ultimoDia = new Date(anio, mes + 1, 0)
  const inicioGrid = new Date(primerDia)
  // Ajustar al lunes anterior
  const dow = primerDia.getDay()
  inicioGrid.setDate(primerDia.getDate() - (dow === 0 ? 6 : dow - 1))

  const semanas = []
  let cur = new Date(inicioGrid)
  while (cur <= ultimoDia || semanas.length < 5) {
    const semana = []
    for (let i = 0; i < 7; i++) {
      semana.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
    semanas.push(semana)
    if (cur > ultimoDia && semanas.length >= 5) break
  }

  const eventosDelDia = (fecha) => {
    const key = fecha.toISOString().split('T')[0]
    return eventos.filter(e => e.fecha === key)
  }

  const eventosSeleccionados = diaSeleccionado ? eventosDelDia(diaSeleccionado) : []

  const anterior = () => { if (mes === 0) { setMes(11); setAnio(a => a-1) } else setMes(m => m-1) }
  const siguiente = () => { if (mes === 11) { setMes(0); setAnio(a => a+1) } else setMes(m => m+1) }

  const esHoy = (d) => d.toDateString() === hoy.toDateString()
  const esMesActual = (d) => d.getMonth() === mes

  return (
    <div className="flex h-[calc(100vh-54px)]">

      {/* CALENDARIO */}
      <div className="flex-1 flex flex-col p-5">

        {/* Cabecera */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={anterior} className="btn-ghost p-1.5"><ChevronLeft size={16} /></button>
            <h2 className="text-[15px] font-medium text-ink min-w-[160px] text-center">
              {MESES[mes]} {anio}
            </h2>
            <button onClick={siguiente} className="btn-ghost p-1.5"><ChevronRight size={16} /></button>
            <button
              onClick={() => { setMes(hoy.getMonth()); setAnio(hoy.getFullYear()) }}
              className="text-xs text-brand hover:underline ml-2"
            >
              Hoy
            </button>
          </div>
          <div className="flex items-center gap-3">
            {/* Leyenda */}
            <div className="flex items-center gap-3 text-[10px] text-ink-3">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand inline-block"/> Boda</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/> Sesión</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/> 2º fotógrafo</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block"/> Lead</span>
            </div>
          </div>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 mb-1">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="text-center text-[11px] font-medium text-ink-3 py-1">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 grid grid-rows-5 gap-px bg-cream-dark rounded-xl overflow-hidden border border-cream-dark">
          {semanas.map((semana, si) => (
            <div key={si} className="grid grid-cols-7 gap-px">
              {semana.map((dia, di) => {
                const evs = eventosDelDia(dia)
                const seleccionado = diaSeleccionado?.toDateString() === dia.toDateString()
                return (
                  <button
                    key={di}
                    onClick={() => setDiaSeleccionado(seleccionado ? null : dia)}
                    className={`bg-white p-1.5 text-left min-h-[80px] transition-colors hover:bg-brand/[.03]
                      ${!esMesActual(dia) ? 'opacity-40' : ''}
                      ${seleccionado ? 'bg-brand/[.05]' : ''}`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mb-1 mx-auto
                      ${esHoy(dia) ? 'bg-brand text-white font-medium' : 'text-ink'}`}>
                      {dia.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {evs.slice(0,3).map((e, i) => (
                        <div key={i}
                          className={`text-[9px] px-1.5 py-0.5 rounded truncate border leading-tight
                            ${COLOR_TIPO[e.tipo] || 'bg-gray-100 border-gray-300 text-gray-600'}`}>
                          {e.titulo}
                        </div>
                      ))}
                      {evs.length > 3 && (
                        <div className="text-[9px] text-ink-3 pl-1">+{evs.length - 3} más</div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* PANEL LATERAL — eventos del día seleccionado */}
      <div className="w-72 border-l border-brand/[.08] flex flex-col">
        {diaSeleccionado ? (
          <>
            <div className="px-5 py-4 border-b border-cream-dark">
              <p className="text-sm font-medium text-ink">
                {diaSeleccionado.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' })}
              </p>
              <p className="text-xs text-ink-3 mt-0.5">{eventosSeleccionados.length} evento{eventosSeleccionados.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-2">
              {eventosSeleccionados.length === 0 ? (
                <p className="text-sm text-ink-3 text-center py-6">Sin eventos este día</p>
              ) : eventosSeleccionados.map(e => (
                <div key={e.id}
                  className={`rounded-xl border p-3 ${COLOR_TIPO[e.tipo] || 'bg-gray-100 border-gray-300'}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium leading-snug">{e.titulo}</p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/60 whitespace-nowrap">
                      {e.tipo}
                    </span>
                  </div>
                  {e.subtitulo && <p className="text-[11px] opacity-70 mb-2">{e.subtitulo}</p>}
                  {e.precio && (
                    <p className="text-[11px] font-medium">
                      {fmtEur(e.precio)}
                      {e.cobrado < e.precio && (
                        <span className="opacity-60 font-normal"> · {fmtEur(e.precio - e.cobrado)} pendiente</span>
                      )}
                    </p>
                  )}
                  {e.estado_entrega && e.estado_entrega !== 'Entregado' && (
                    <p className="text-[10px] mt-1 opacity-70">Entrega: {e.estado_entrega}</p>
                  )}
                  {e._kind === 'trabajo' && (
                    <Link to={`/trabajos/${e.id}`}
                      className="mt-2 text-[10px] underline opacity-70 hover:opacity-100 block">
                      Ver trabajo →
                    </Link>
                  )}
                  {e._kind === 'lead' && (
                    <Link to={`/leads`}
                      className="mt-2 text-[10px] underline opacity-70 hover:opacity-100 block">
                      Ver lead →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Resumen del mes */}
            <div className="px-5 py-4 border-b border-cream-dark">
              <p className="text-sm font-medium text-ink mb-3">Resumen del mes</p>
              <div className="space-y-2">
                {[
                  { label: 'Bodas', color: 'bg-brand', count: eventos.filter(e => ['Boda','Elopement'].includes(e.tipo)).length },
                  { label: 'Sesiones', color: 'bg-emerald-500', count: eventos.filter(e => !['Boda','Elopement','2º Fotógrafo','Lead'].includes(e.tipo)).length },
                  { label: '2º fotógrafo', color: 'bg-amber-400', count: eventos.filter(e => e.tipo === '2º Fotógrafo').length },
                  { label: 'Leads con fecha', color: 'bg-gray-400', count: eventos.filter(e => e._kind === 'lead').length },
                ].filter(r => r.count > 0).map(r => (
                  <div key={r.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${r.color}`} />
                      <span className="text-ink-2">{r.label}</span>
                    </div>
                    <span className="font-medium text-ink">{r.count}</span>
                  </div>
                ))}
                {eventos.length === 0 && <p className="text-xs text-ink-3">Sin eventos este mes</p>}
              </div>
            </div>

            {/* Próximos eventos del mes */}
            <div className="flex-1 overflow-auto p-4">
              <p className="text-xs font-medium text-ink-3 uppercase tracking-wide mb-3">Todos los eventos</p>
              <div className="space-y-1.5">
                {eventos
                  .sort((a,b) => a.fecha.localeCompare(b.fecha))
                  .map(e => (
                    <button key={e.id + e._kind}
                      onClick={() => setDiaSeleccionado(new Date(e.fecha + 'T00:00:00'))}
                      className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-brand/[.04] transition-colors">
                      <div className="text-center min-w-[28px]">
                        <p className="text-[10px] text-ink-3 capitalize leading-none">
                          {new Date(e.fecha + 'T00:00:00').toLocaleDateString('es-ES',{weekday:'short'})}
                        </p>
                        <p className="text-sm font-medium text-ink leading-none mt-0.5">
                          {new Date(e.fecha + 'T00:00:00').getDate()}
                        </p>
                      </div>
                      <div className={`w-1.5 h-8 rounded-full flex-shrink-0
                        ${e.tipo === 'Boda' || e.tipo === 'Elopement' ? 'bg-brand' :
                          e.tipo === '2º Fotógrafo' ? 'bg-amber-400' :
                          e._kind === 'lead' ? 'bg-gray-300' : 'bg-emerald-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-ink truncate">{e.titulo}</p>
                        <p className="text-[10px] text-ink-3">{e.tipo}</p>
                      </div>
                    </button>
                  ))
                }
                {eventos.length === 0 && <p className="text-xs text-ink-3 text-center py-4">Sin eventos</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
