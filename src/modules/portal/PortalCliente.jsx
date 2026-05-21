import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { fmtFecha } from '../../lib/utils'
import { Check, ChevronRight, Clock, MapPin, User, Send, Camera, FileText, ClipboardList } from 'lucide-react'

const CAT_COLOR = {
  'Preparativos novia': 'bg-pink-100 border-pink-200 text-pink-800',
  'Preparativos novio': 'bg-blue-100 border-blue-200 text-blue-800',
  'Traslado':           'bg-gray-100 border-gray-200 text-gray-700',
  'Ceremonia':          'bg-indigo-100 border-indigo-200 text-indigo-800',
  'Cóctel':             'bg-amber-100 border-amber-200 text-amber-800',
  'Banquete':           'bg-orange-100 border-orange-200 text-orange-800',
  'Baile':              'bg-purple-100 border-purple-200 text-purple-800',
  'Detalles':           'bg-teal-100 border-teal-200 text-teal-800',
  'Familia':            'bg-emerald-100 border-emerald-200 text-emerald-800',
  'Pareja':             'bg-rose-100 border-rose-200 text-rose-800',
  'Fin de fiesta':      'bg-violet-100 border-violet-200 text-violet-800',
  'Otro':               'bg-gray-100 border-gray-200 text-gray-600',
}

export default function PortalCliente() {
  const { token } = useParams()
  const [portal, setPortal] = useState(null)
  const [trabajo, setTrabajo] = useState(null)
  const [timing, setTiming] = useState(null)
  const [contrato, setContrato] = useState(null)
  const [respuestas, setRespuestas] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [seccion, setSeccion] = useState('bienvenida') // bienvenida | timing | contrato | cuestionario
  const [firmando, setFirmando] = useState(false)
  const [firmaNombre, setFirmaNombre] = useState('')
  const [firmado, setFirmado] = useState(false)
  const [enviandoCuest, setEnviandoCuest] = useState(false)
  const [cuestionarioEnviado, setCuestionarioEnviado] = useState(false)
  const [cuest, setCuest] = useState({
    nombre1:'', nombre2:'', apellidos1:'', apellidos2:'',
    dni1:'', dni2:'', telefono1:'', telefono2:'', email1:'', email2:'',
    direccion:'', ciudad:'', cp:'',
    lugar_ceremonia:'', hora_ceremonia:'', tipo_ceremonia:'', direccion_ceremonia:'',
    lugar_celebracion:'', hora_celebracion:'', n_invitados:'',
    hotel_novios:'', hora_salida_hotel:'', traslados:'',
    musica_entrada:'', musica_salida:'', canciones:'', ramo:'',
    nombre_videografo:'', nombre_dj:'', nombre_wp:'', nombre_floristeria:'',
    estilo_preferido:'', fotos_imprescindibles:'', personas_clave:'', algo_evitar:'',
    notas_adicionales:'',
  })

  useEffect(() => { if (token) cargar() }, [token])

  async function cargar() {
    setLoading(true)
    // Buscar el portal por token (sin autenticación)
    const { data: p, error: err } = await supabase
      .from('v2_portales')
      .select('*, trabajo:trabajo_id(*)')
      .eq('token', token)
      .eq('activo', true)
      .single()

    if (err || !p) { setError('Este enlace no es válido o ha expirado.'); setLoading(false); return }

    setPortal(p)
    setTrabajo(p.trabajo)

    // Cargar timing
    const { data: tim } = await supabase
      .from('v2_timings')
      .select('eventos, notas')
      .eq('trabajo_id', p.trabajo_id)
      .single()
    setTiming(tim)

    // Verificar si ya firmó
    const { data: firma } = await supabase
      .from('v2_firmas')
      .select('id, nombre, firmado_at')
      .eq('portal_id', p.id)
      .single()
    if (firma) { setFirmado(true); setFirmaNombre(firma.nombre) }

    // Verificar si ya envió cuestionario
    const { data: resp } = await supabase
      .from('v2_cuestionario_respuestas')
      .select('id, enviado_at')
      .eq('portal_id', p.id)
      .single()
    if (resp) { setCuestionarioEnviado(true); setRespuestas(resp) }

    // Registrar visita
    await supabase.from('v2_portales')
      .update({ visto_at: new Date().toISOString(), veces_visto: (p.veces_visto || 0) + 1 })
      .eq('id', p.id)

    setLoading(false)
  }

  async function firmar() {
    if (!firmaNombre.trim()) return
    setFirmando(true)
    await supabase.from('v2_firmas').insert({
      portal_id: portal.id,
      trabajo_id: portal.trabajo_id,
      nombre: firmaNombre,
      confirmacion: 'He leído y acepto el contrato',
      firmado_at: new Date().toISOString(),
    })
    // Actualizar trabajo
    await supabase.from('v2_trabajos')
      .update({ contrato_firmado_at: new Date().toISOString() })
      .eq('id', portal.trabajo_id)
    setFirmado(true)
    setFirmando(false)
  }

  async function enviarCuestionario() {
    if (!cuest.nombre1.trim()) return
    setEnviandoCuest(true)
    await supabase.from('v2_cuestionario_respuestas').insert({
      portal_id: portal.id,
      trabajo_id: portal.trabajo_id,
      ...cuest,
      n_invitados: cuest.n_invitados ? parseInt(cuest.n_invitados) : null,
    })
    setCuestionarioEnviado(true)
    setEnviandoCuest(false)
  }

  const eventosOrdenados = timing?.eventos
    ? [...timing.eventos].sort((a,b) => (a.hora||'').localeCompare(b.hora||''))
    : []

  if (loading) return (
    <div className="min-h-screen bg-[#f4f5f0] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#000499] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-[#f4f5f0] flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-lg font-medium text-gray-800 mb-2">Enlace no válido</p>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    </div>
  )

  const t = trabajo

  return (
    <div className="min-h-screen bg-[#f4f5f0]" style={{fontFamily:"'DM Sans',system-ui,sans-serif"}}>

      {/* Header */}
      <header style={{background:'#000499'}} className="px-6 py-4 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span style={{fontFamily:'Rexton,sans-serif',letterSpacing:'.26em',fontSize:'13px',textTransform:'uppercase',color:'#fff'}}>Ferreiro</span>
          <span style={{fontFamily:'BaskervilleMT,Georgia,serif',fontStyle:'italic',fontSize:'9.5px',color:'rgba(255,255,255,.55)',letterSpacing:'.04em'}}>capturing moments</span>
        </div>
        <div className="text-right">
          <p className="text-white text-sm font-medium">{t?.titulo}</p>
          <p className="text-white/60 text-xs">{fmtFecha(t?.fecha)}</p>
        </div>
      </header>

      {/* Nav secciones */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex overflow-x-auto">
          {[
            { id:'bienvenida', label:'Tu boda', icon:<Camera size={14}/> },
            portal?.mostrar_contrato && { id:'contrato', label:'Contrato', icon:<FileText size={14}/> },
            { id:'cuestionario', label:'Cuestionario', icon:<ClipboardList size={14}/> },
            portal?.mostrar_timing && eventosOrdenados.length > 0 && { id:'timing', label:'Timing', icon:<Clock size={14}/> },
          ].filter(Boolean).map(s => (
            <button key={s.id} onClick={() => setSeccion(s.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm border-b-2 whitespace-nowrap transition-all
                ${seccion===s.id ? 'border-[#000499] text-[#000499] font-medium' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {s.icon}{s.label}
              {s.id==='contrato' && firmado && <Check size={12} className="text-emerald-500"/>}
              {s.id==='cuestionario' && cuestionarioEnviado && <Check size={12} className="text-emerald-500"/>}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* ── BIENVENIDA ── */}
        {seccion === 'bienvenida' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <p className="text-2xl font-light text-[#000499] mb-1" style={{fontFamily:'DM Serif Display,Georgia,serif',fontStyle:'italic'}}>
                Hola, {t?.titulo?.split('&')[0]?.trim()} ✨
              </p>
              <p className="text-sm text-gray-500">Este es vuestro portal privado para preparar vuestro día especial.</p>
            </div>

            {/* Datos clave */}
            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Datos de vuestra boda</p>
              {[
                { icon:<Clock size={15}/>, label:'Fecha', val: fmtFecha(t?.fecha) },
                t?.hora_inicio && { icon:<Clock size={15}/>, label:'Hora inicio', val: t.hora_inicio },
                t?.lugar && { icon:<MapPin size={15}/>, label:'Celebración', val: t.lugar },
                t?.lugar_ceremonia && { icon:<MapPin size={15}/>, label:'Ceremonia', val: t.lugar_ceremonia },
                t?.hora_ceremonia && { icon:<Clock size={15}/>, label:'Hora ceremonia', val: t.hora_ceremonia },
                t?.tipo_ceremonia && { icon:<User size={15}/>, label:'Tipo ceremonia', val: t.tipo_ceremonia },
                t?.n_invitados && { icon:<User size={15}/>, label:'Invitados', val: t.n_invitados },
                t?.segundo_nombre && { icon:<Camera size={15}/>, label:'2º fotógrafo', val: t.segundo_nombre },
              ].filter(Boolean).map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-gray-400 flex-shrink-0">{item.icon}</span>
                  <span className="text-xs text-gray-400 w-28 flex-shrink-0">{item.label}</span>
                  <span className="text-sm text-gray-800">{item.val}</span>
                </div>
              ))}
            </div>

            {/* Estado de pasos */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Estado de vuestros documentos</p>
              <div className="space-y-3">
                {[
                  { label:'Contrato', done: firmado, pendiente:'Pendiente de firma', ok:'Firmado ✓' },
                  { label:'Cuestionario', done: cuestionarioEnviado, pendiente:'Pendiente de enviar', ok:'Enviado ✓' },
                  { label:'Timing', done: eventosOrdenados.length > 0, pendiente:'En preparación', ok:'Disponible' },
                ].map(step => (
                  <div key={step.label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{step.label}</span>
                    <span className={`text-xs px-3 py-1 rounded-full ${step.done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {step.done ? step.ok : step.pendiente}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CONTRATO ── */}
        {seccion === 'contrato' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-800 mb-3">Contrato de servicios fotográficos</p>
              <div className="bg-gray-50 rounded-xl p-5 text-sm text-gray-600 leading-relaxed space-y-3 max-h-80 overflow-auto border border-gray-100">
                <p><strong>PARTES:</strong> Ricardo Ferreiro Photography (fotógrafo) y {t?.titulo} (clientes).</p>
                <p><strong>SERVICIO:</strong> Reportaje fotográfico completo el día {fmtFecha(t?.fecha)} en {t?.lugar || 'el lugar indicado'}.</p>
                <p><strong>ENTREGA:</strong> Las fotografías serán entregadas en un plazo máximo de 120 días desde la celebración, a través de galería digital privada en alta resolución.</p>
                <p><strong>PRECIO:</strong> El precio acordado es de {t?.precio_total ? new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(t.precio_total) : '—'} IVA incluido.</p>
                <p><strong>RESERVA:</strong> Se abona una reserva para confirmar la fecha. El resto del importe se abona el día de la celebración.</p>
                <p><strong>CANCELACIÓN:</strong> En caso de cancelación por parte del cliente, la reserva no es reembolsable. En caso de cancelación por causas de fuerza mayor debidamente justificadas, se estudia cada caso individualmente.</p>
                <p><strong>DERECHOS:</strong> El fotógrafo se reserva el derecho de uso de las imágenes para su portfolio y redes sociales, pudiendo el cliente solicitar la exclusividad de las imágenes.</p>
                <p><strong>DATOS PERSONALES:</strong> Los datos facilitados se tratarán conforme al RGPD y no serán cedidos a terceros.</p>
              </div>
            </div>

            {firmado ? (
              <div className="bg-emerald-50 rounded-2xl p-6 text-center">
                <Check size={32} className="text-emerald-500 mx-auto mb-2"/>
                <p className="font-medium text-emerald-800">Contrato firmado</p>
                <p className="text-sm text-emerald-600 mt-1">Firmado por {firmaNombre}</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                <p className="text-sm font-medium text-gray-800">Firmar el contrato</p>
                <p className="text-xs text-gray-500">Al introducir vuestro nombre y hacer clic en "Firmar", confirmáis que habéis leído y aceptáis todas las condiciones del contrato.</p>
                <input value={firmaNombre} onChange={e=>setFirmaNombre(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#000499]"
                  placeholder="Vuestro nombre completo"/>
                <button onClick={firmar} disabled={firmando||!firmaNombre.trim()}
                  style={{background:'#000499'}}
                  className="w-full text-white py-3 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {firmando ? 'Firmando…' : <><Check size={15}/> Firmar contrato</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── CUESTIONARIO ── */}
        {seccion === 'cuestionario' && (
          <div>
            {cuestionarioEnviado ? (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                <Check size={40} className="text-emerald-500 mx-auto mb-3"/>
                <p className="font-medium text-gray-800 text-lg mb-1">¡Cuestionario enviado!</p>
                <p className="text-sm text-gray-500">Ricardo ya tiene todos vuestros datos para preparar el timing perfecto.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-sm text-gray-500">Completad este cuestionario para que Ricardo pueda preparar el timing de vuestro día. Cuanta más información, mejor resultado.</p>
                </div>

                {/* Secciones del cuestionario */}
                {[
                  { titulo:'Datos de los novios', campos:[
                    {k:'nombre1',l:'Nombre novia/novio 1'},{k:'apellidos1',l:'Apellidos'},{k:'dni1',l:'DNI'},
                    {k:'telefono1',l:'Teléfono'},{k:'email1',l:'Email'},
                    {k:'nombre2',l:'Nombre novia/novio 2'},{k:'apellidos2',l:'Apellidos'},{k:'dni2',l:'DNI'},
                    {k:'telefono2',l:'Teléfono'},{k:'email2',l:'Email'},
                    {k:'direccion',l:'Dirección'},{k:'ciudad',l:'Ciudad'},{k:'cp',l:'Código postal'},
                  ]},
                  { titulo:'Ceremonia y celebración', campos:[
                    {k:'tipo_ceremonia',l:'Tipo de ceremonia (civil/religiosa/simbólica)'},{k:'lugar_ceremonia',l:'Lugar ceremonia'},{k:'direccion_ceremonia',l:'Dirección ceremonia'},{k:'hora_ceremonia',l:'Hora ceremonia',type:'time'},
                    {k:'lugar_celebracion',l:'Lugar celebración'},{k:'direccion_celebracion',l:'Dirección celebración'},{k:'hora_celebracion',l:'Hora inicio banquete',type:'time'},
                    {k:'n_invitados',l:'Número de invitados',type:'number'},
                    {k:'hotel_novios',l:'Hotel donde os alojáis'},{k:'hora_salida_hotel',l:'Hora salida del hotel',type:'time'},
                    {k:'traslados',l:'¿Hay traslados previstos? (limusina, coche clásico…)'},
                  ]},
                  { titulo:'Música', campos:[
                    {k:'musica_entrada',l:'Música entrada ceremonia'},{k:'musica_salida',l:'Música salida ceremonia'},
                    {k:'canciones',l:'Canciones importantes (primer baile, vals…)',type:'textarea'},
                  ]},
                  { titulo:'Proveedores', campos:[
                    {k:'nombre_videografo',l:'Videógrafo (nombre / empresa)'},{k:'nombre_dj',l:'DJ / Música'},
                    {k:'nombre_wp',l:'Wedding Planner'},{k:'nombre_floristeria',l:'Florería'},
                  ]},
                  { titulo:'Preferencias fotográficas', campos:[
                    {k:'estilo_preferido',l:'Estilo de fotos preferido',type:'textarea'},
                    {k:'fotos_imprescindibles',l:'Fotos imprescindibles que no pueden faltar',type:'textarea'},
                    {k:'personas_clave',l:'Personas clave para fotos de grupo (familiares, amigos…)',type:'textarea'},
                    {k:'algo_evitar',l:'¿Hay algo que prefiráis evitar?',type:'textarea'},
                    {k:'notas_adicionales',l:'Notas adicionales para Ricardo',type:'textarea'},
                  ]},
                ].map(sec => (
                  <div key={sec.titulo} className="bg-white rounded-2xl p-5 shadow-sm">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">{sec.titulo}</p>
                    <div className="grid grid-cols-2 gap-3">
                      {sec.campos.map(c => (
                        <div key={c.k} className={c.type==='textarea' ? 'col-span-2' : ''}>
                          <label className="text-xs text-gray-500 mb-1 block">{c.l}</label>
                          {c.type==='textarea' ? (
                            <textarea value={cuest[c.k]||''} onChange={e=>setCuest(q=>({...q,[c.k]:e.target.value}))}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#000499] resize-none" rows={3}/>
                          ) : (
                            <input type={c.type||'text'} value={cuest[c.k]||''} onChange={e=>setCuest(q=>({...q,[c.k]:e.target.value}))}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#000499]"/>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <button onClick={enviarCuestionario} disabled={enviandoCuest||!cuest.nombre1.trim()}
                  style={{background:'#000499'}}
                  className="w-full text-white py-3.5 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {enviandoCuest ? 'Enviando…' : <><Send size={15}/> Enviar cuestionario</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TIMING ── */}
        {seccion === 'timing' && (
          <div className="space-y-3">
            {eventosOrdenados.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
                <Clock size={32} className="text-gray-300 mx-auto mb-3"/>
                <p className="text-gray-500 text-sm">El timing está en preparación. Ricardo lo compartirá pronto.</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                  <p className="text-sm text-gray-500">Este es el timing provisional de vuestro día. Puede actualizarse hasta la semana anterior a la boda.</p>
                </div>
                {eventosOrdenados.map((ev, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <span className="text-xs font-mono font-medium text-gray-500 w-12 text-right pt-1">{ev.hora||'—'}</span>
                    </div>
                    <div className="flex flex-col items-center flex-shrink-0 mx-1">
                      <div className={`w-3 h-3 rounded-full mt-1.5 border-2 flex-shrink-0 ${CAT_COLOR[ev.categoria]||CAT_COLOR['Otro']}`}/>
                      {i < eventosOrdenados.length-1 && <div className="w-px flex-1 bg-gray-200 mt-1"/>}
                    </div>
                    <div className={`flex-1 rounded-xl px-4 py-3 mb-2 border text-sm ${CAT_COLOR[ev.categoria]||CAT_COLOR['Otro']}`}>
                      <p className="font-medium">{ev.titulo}</p>
                      {ev.lugar && <p className="text-xs opacity-70 mt-0.5 flex items-center gap-1"><MapPin size={10}/>{ev.lugar}</p>}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
