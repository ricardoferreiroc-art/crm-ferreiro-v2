import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  ArrowLeft, Plus, Trash2, Save, Check, ChevronDown, ChevronUp,
  GripVertical, MapPin, Phone, Link2, User, Camera, Video,
  Star, X, ChevronRight, Settings, Eye
} from 'lucide-react'

// ── SECCIONES BASE ────────────────────────────────────────────
const SECCIONES_BASE = [
  { id: 'prep_novia',  titulo: 'Preparativos novia',  tipo: 'momentos' },
  { id: 'prep_novio',  titulo: 'Preparativos novio',  tipo: 'momentos' },
  { id: 'ceremonia',   titulo: 'Ceremonia',            tipo: 'momentos' },
  { id: 'traslado',    titulo: 'Traslado',             tipo: 'momentos' },
  { id: 'coctel',      titulo: 'Cóctel',               tipo: 'momentos' },
  { id: 'recepcion',   titulo: 'Recepción / Banquete', tipo: 'momentos' },
  { id: 'barra_libre', titulo: 'Barra libre & fiesta', tipo: 'momentos' },
  { id: 'shot_list',   titulo: 'Shot list',            tipo: 'shotlist' },
  { id: 'proveedores', titulo: 'Proveedores',          tipo: 'proveedores' },
]

// ── BADGES ────────────────────────────────────────────────────
const BADGES = [
  { id: '',      label: 'Sin etiqueta',  color: 'bg-gray-100 text-gray-500' },
  { id: 'yo',    label: 'Yo',            color: 'bg-brand/15 text-brand' },
  { id: 'video', label: 'Vídeo',         color: 'bg-purple-100 text-purple-700' },
  { id: 'clave', label: '★ Clave',       color: 'bg-amber-100 text-amber-700' },
  { id: '2nd',   label: '2º foto',       color: 'bg-teal-100 text-teal-700' },
  { id: 'wp',    label: 'Wedding P.',    color: 'bg-pink-100 text-pink-700' },
]

const badgeStyle = (badge) => BADGES.find(b => b.id === badge)?.color || 'bg-gray-100 text-gray-500'
const badgeLabel = (badge) => BADGES.find(b => b.id === badge)?.label || badge

const ITEM_VACIO = () => ({
  tempId: Date.now() + Math.random(),
  hora: '', titulo: '', notas: '', contacto: '', ubicacion: '',
  notas_internas: '', badge: '',
})

const PROV_VACIO = () => ({
  tempId: Date.now() + Math.random(),
  nombre: '', tipo: '', contacto: '', telefono: '', instagram: '', notas: '',
})

const SHOT_VACIO = () => ({
  tempId: Date.now() + Math.random(),
  titulo: '', notas: '',
})

export default function Timing() {
  const { id } = useParams()
  const { user } = useAuth()
  const [trabajo, setTrabajo] = useState(null)
  const [proveedoresCRM, setProveedoresCRM] = useState([])
  const [secciones, setSecciones] = useState([])
  const [infoGlobal, setInfoGlobal] = useState({
    prep_hora_foto: '', prep_hora_video: '', prep_salida_foto_video: '',
    ceremonia_hora: '', ceremonia_duracion: '',
    coctel_hora: '', coctel_duracion: '',
    recepcion_hora: '', recepcion_tipo: 'Banquete',
    barra_hora: '', fin_boda: '',
    invitados_adultos: '', invitados_ninos: '', parking: '',
    observaciones_generales: '',
    vestuario_novia: { vestido: '', disenador: '', zapatos: '', joyas: '', ramo: '' },
    vestuario_novio: { traje: '', disenador: '' },
  })
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [timingId, setTimingId] = useState(null)
  const [seccionAbierta, setSeccionAbierta] = useState('prep_novia')
  const [modoVista, setModoVista] = useState(false)
  const [itemEditando, setItemEditando] = useState(null) // tempId del item expandido

  useEffect(() => { if (user && id) cargar() }, [user, id])

  async function cargar() {
    setLoading(true)
    const [{ data: t }, { data: tim }, { data: provs }] = await Promise.all([
      supabase.from('v2_trabajos').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('v2_timings').select('*').eq('trabajo_id', id).single(),
      supabase.from('v2_proveedores').select('id,empresa,nombre,categoria,telefono,instagram').eq('user_id', user.id).is('deleted_at', null).order('empresa'),
    ])
    setTrabajo(t)
    setProveedoresCRM(provs || [])

    if (tim) {
      setTimingId(tim.id)
      // Si tiene contenido del CRM v1 (formato antiguo), migrar
      const contenido = tim.contenido || tim.eventos
      if (contenido && Array.isArray(contenido) && contenido.length > 0) {
        // Normalizar secciones del formato v1
        const secsNormalizadas = SECCIONES_BASE.map(base => {
          const existente = contenido.find(s => s.id === base.id)
          if (existente) {
            return {
              ...base,
              titulo: existente.titulo || base.titulo,
              ubicacion: existente.ubicacion || '',
              contacto_principal: existente.contacto_principal || '',
              items: (existente.items || []).map(it => ({
                ...it,
                tempId: Date.now() + Math.random(),
              })),
            }
          }
          return { ...base, ubicacion: '', contacto_principal: '', items: [] }
        })
        setSecciones(secsNormalizadas)
      } else {
        setSecciones(SECCIONES_BASE.map(s => ({ ...s, ubicacion: '', contacto_principal: '', items: [] })))
      }
      if (tim.info_global && typeof tim.info_global === 'object') {
        setInfoGlobal(ig => ({ ...ig, ...tim.info_global }))
      }
    } else {
      // Plantilla base con datos del trabajo
      setSecciones(SECCIONES_BASE.map(s => {
        const items = []
        if (s.id === 'prep_novia') {
          items.push({ ...ITEM_VACIO(), hora: t?.hora_inicio || '09:00', titulo: 'Llega el fotógrafo', badge: 'yo', contacto: `Ricardo Ferreiro / ${t?.telefono_fotografo || '+34 606110337'}` })
        }
        if (s.id === 'ceremonia' && t?.hora_ceremonia) {
          items.push({ ...ITEM_VACIO(), hora: t.hora_ceremonia, titulo: 'Inicio ceremonia', badge: 'clave', ubicacion: t.lugar_ceremonia || '' })
        }
        return { ...s, ubicacion: s.id === 'ceremonia' ? (t?.lugar_ceremonia || '') : (s.id === 'coctel' || s.id === 'recepcion' || s.id === 'barra_libre' ? (t?.lugar || '') : ''), contacto_principal: '', items }
      }))
      setInfoGlobal(ig => ({
        ...ig,
        ceremonia_hora: t?.hora_ceremonia || '',
        invitados_adultos: t?.n_invitados?.toString() || '',
      }))
    }
    setLoading(false)
  }

  function updateSeccion(secId, campo, valor) {
    setSecciones(ss => ss.map(s => s.id === secId ? { ...s, [campo]: valor } : s))
  }

  function addItem(secId) {
    setSecciones(ss => ss.map(s => {
      if (s.id !== secId) return s
      const nuevo = ITEM_VACIO()
      setItemEditando(nuevo.tempId)
      return { ...s, items: [...(s.items || []), nuevo] }
    }))
  }

  function updateItem(secId, tempId, campo, valor) {
    setSecciones(ss => ss.map(s => {
      if (s.id !== secId) return s
      return { ...s, items: s.items.map(it => it.tempId === tempId ? { ...it, [campo]: valor } : it) }
    }))
  }

  function removeItem(secId, tempId) {
    setSecciones(ss => ss.map(s => {
      if (s.id !== secId) return s
      return { ...s, items: s.items.filter(it => it.tempId !== tempId) }
    }))
  }

  function moverItem(secId, idx, dir) {
    setSecciones(ss => ss.map(s => {
      if (s.id !== secId) return s
      const items = [...s.items]
      const swap = idx + dir
      if (swap < 0 || swap >= items.length) return s
      ;[items[idx], items[swap]] = [items[swap], items[idx]]
      return { ...s, items }
    }))
  }

  // Añadir proveedor del CRM a la sección proveedores
  function addProveedorCRM(prov) {
    setSecciones(ss => ss.map(s => {
      if (s.id !== 'proveedores') return s
      const nuevo = {
        tempId: Date.now() + Math.random(),
        nombre: prov.empresa || prov.nombre || '',
        tipo: prov.categoria || '',
        contacto: prov.nombre || '',
        telefono: prov.telefono || '',
        instagram: prov.instagram || '',
        notas: '',
      }
      return { ...s, items: [...(s.items || []), nuevo] }
    }))
  }

  async function guardar() {
    setGuardando(true)
    const payload = {
      trabajo_id: parseInt(id),
      user_id: user.id,
      contenido: secciones.map(s => ({
        id: s.id, tipo: s.tipo, titulo: s.titulo,
        ubicacion: s.ubicacion || '',
        contacto_principal: s.contacto_principal || '',
        items: (s.items || []).map(({ tempId, ...it }) => it),
      })),
      info_global: infoGlobal,
      notas: '',
    }
    if (timingId) {
      await supabase.from('v2_timings').update(payload).eq('id', timingId)
    } else {
      const { data } = await supabase.from('v2_timings').insert(payload).select().single()
      if (data) setTimingId(data.id)
    }
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
    setGuardando(false)
  }

  const setIG = (k, v) => setInfoGlobal(g => ({ ...g, [k]: v }))
  const setVN = (k, v) => setInfoGlobal(g => ({ ...g, vestuario_novia: { ...g.vestuario_novia, [k]: v } }))
  const setVNovio = (k, v) => setInfoGlobal(g => ({ ...g, vestuario_novio: { ...g.vestuario_novio, [k]: v } }))

  // Ordenar items por hora para la vista
  const itemsOrdenados = (items) => [...(items||[])].sort((a,b) => {
    const ha = a.hora?.replace(/\./,':') || '99:99'
    const hb = b.hora?.replace(/\./,':') || '99:99'
    return ha.localeCompare(hb)
  })

  if (loading) return <div className="flex items-center justify-center h-64 text-sm text-ink-3">Cargando…</div>

  return (
    <div className="flex h-[calc(100vh-54px)] overflow-hidden">

      {/* ── PANEL IZQUIERDO: EDICIÓN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-cream-dark bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link to={`/trabajos/${id}`} className="text-ink-3 hover:text-ink"><ArrowLeft size={16}/></Link>
            <div>
              <h1 className="text-[14px] font-medium text-ink">{trabajo?.titulo}</h1>
              <p className="text-[11px] text-ink-3">
                Timing · {trabajo?.fecha ? new Date(trabajo.fecha+'T00:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setModoVista(!modoVista)}
              className={`btn-ghost text-xs ${modoVista ? 'text-brand' : ''}`}>
              <Eye size={13}/> {modoVista ? 'Editar' : 'Vista'}
            </button>
            <button onClick={guardar} disabled={guardando}
              className={`btn-primary text-sm ${guardado ? 'bg-emerald-600' : ''}`}>
              {guardado ? <><Check size={13}/> Guardado</> : <><Save size={13}/> {guardando?'…':'Guardar'}</>}
            </button>
          </div>
        </div>

        {/* Info global (colapsable) */}
        <details className="border-b border-cream-dark flex-shrink-0 bg-cream">
          <summary className="px-5 py-2.5 text-xs font-medium text-ink-2 cursor-pointer flex items-center gap-2 list-none">
            <Settings size={13}/> Datos generales de la boda
          </summary>
          <div className="px-5 pb-4 grid grid-cols-4 gap-3">
            {[
              { k:'prep_hora_foto', l:'Llega fotógrafo', type:'time' },
              { k:'prep_hora_video', l:'Llega videógrafo', type:'time' },
              { k:'prep_salida_foto_video', l:'Salen a ceremonia', type:'time' },
              { k:'ceremonia_hora', l:'Inicio ceremonia', type:'time' },
              { k:'ceremonia_duracion', l:'Duración ceremonia' },
              { k:'coctel_hora', l:'Inicio cóctel', type:'time' },
              { k:'recepcion_hora', l:'Inicio recepción', type:'time' },
              { k:'recepcion_tipo', l:'Tipo recepción' },
              { k:'barra_hora', l:'Inicio barra libre', type:'time' },
              { k:'fin_boda', l:'Fin de boda', type:'time' },
              { k:'invitados_adultos', l:'Invitados adultos', type:'number' },
              { k:'invitados_ninos', l:'Invitados niños', type:'number' },
            ].map(f => (
              <div key={f.k}>
                <label className="label">{f.l}</label>
                <input type={f.type||'text'} value={infoGlobal[f.k]||''} onChange={e=>setIG(f.k,e.target.value)} className="input text-xs py-1.5"/>
              </div>
            ))}
            <div className="col-span-4 grid grid-cols-5 gap-3">
              <div className="col-span-2">
                <label className="label">Vestuario novia</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[{k:'vestido',l:'Vestido'},{k:'disenador',l:'Diseñador'},{k:'zapatos',l:'Zapatos'},{k:'joyas',l:'Joyas'},{k:'ramo',l:'Ramo'}].map(f=>(
                    <input key={f.k} placeholder={f.l} value={infoGlobal.vestuario_novia?.[f.k]||''} onChange={e=>setVN(f.k,e.target.value)} className="input text-xs py-1"/>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Vestuario novio</label>
                <div className="flex flex-col gap-1.5">
                  {[{k:'traje',l:'Traje'},{k:'disenador',l:'Diseñador'}].map(f=>(
                    <input key={f.k} placeholder={f.l} value={infoGlobal.vestuario_novio?.[f.k]||''} onChange={e=>setVNovio(f.k,e.target.value)} className="input text-xs py-1"/>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Parking</label>
                <input value={infoGlobal.parking||''} onChange={e=>setIG('parking',e.target.value)} className="input text-xs py-1"/>
              </div>
              <div>
                <label className="label">Observaciones</label>
                <textarea value={infoGlobal.observaciones_generales||''} onChange={e=>setIG('observaciones_generales',e.target.value)} className="input text-xs py-1 resize-none" rows={2}/>
              </div>
            </div>
          </div>
        </details>

        {/* Secciones */}
        <div className="flex-1 overflow-auto">
          {secciones.map(sec => (
            <SeccionTiming
              key={sec.id}
              sec={sec}
              abierta={seccionAbierta === sec.id}
              onToggle={() => setSeccionAbierta(seccionAbierta === sec.id ? null : sec.id)}
              onUpdateSeccion={(campo, val) => updateSeccion(sec.id, campo, val)}
              onAddItem={() => addItem(sec.id)}
              onUpdateItem={(tid, campo, val) => updateItem(sec.id, tid, campo, val)}
              onRemoveItem={(tid) => removeItem(sec.id, tid)}
              onMoverItem={(idx, dir) => moverItem(sec.id, idx, dir)}
              itemEditando={itemEditando}
              setItemEditando={setItemEditando}
              proveedoresCRM={proveedoresCRM}
              onAddProveedorCRM={addProveedorCRM}
              modoVista={modoVista}
            />
          ))}
        </div>
      </div>

      {/* ── PANEL DERECHO: VISTA TIMELINE ── */}
      <div className="w-64 border-l border-brand/[.08] flex flex-col bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-cream-dark flex-shrink-0">
          <p className="text-[11px] font-medium text-ink-2">Timeline del día</p>
          {trabajo?.lugar && <p className="text-[10px] text-ink-3 mt-0.5 flex items-center gap-1"><MapPin size={9}/>{trabajo.lugar}</p>}
        </div>
        <div className="flex-1 overflow-auto py-3 px-3">
          {/* Info clave */}
          {[
            infoGlobal.prep_hora_foto && { hora: infoGlobal.prep_hora_foto, txt: 'Llega fotógrafo', badge: 'yo' },
            infoGlobal.ceremonia_hora && { hora: infoGlobal.ceremonia_hora, txt: 'Inicio ceremonia', badge: 'clave' },
            infoGlobal.coctel_hora && { hora: infoGlobal.coctel_hora, txt: 'Inicio cóctel', badge: '' },
            infoGlobal.recepcion_hora && { hora: infoGlobal.recepcion_hora, txt: infoGlobal.recepcion_tipo || 'Recepción', badge: '' },
            infoGlobal.barra_hora && { hora: infoGlobal.barra_hora, txt: 'Barra libre', badge: '' },
            infoGlobal.fin_boda && { hora: infoGlobal.fin_boda, txt: 'Fin de boda', badge: '' },
          ].filter(Boolean).map((it, i) => (
            <div key={i} className="flex gap-2 mb-1">
              <span className="text-[10px] font-mono text-ink-3 w-10 flex-shrink-0 pt-0.5 text-right">{it.hora}</span>
              <div className={`flex-1 text-[10px] px-2 py-1 rounded border ${badgeStyle(it.badge)}`}>{it.txt}</div>
            </div>
          ))}

          {/* Items de todas las secciones ordenados */}
          <div className="mt-2 border-t border-cream-dark pt-2">
            {secciones
              .filter(s => s.tipo === 'momentos' && (s.items||[]).length > 0)
              .flatMap(s => (s.items||[]).filter(it => it.hora && it.titulo).map(it => ({ ...it, _sec: s.titulo })))
              .sort((a,b) => (a.hora||'99:99').replace(/\./,':').localeCompare((b.hora||'99:99').replace(/\./,':')))
              .map((it, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <span className="text-[9px] font-mono text-ink-3 w-10 flex-shrink-0 pt-0.5 text-right">{it.hora}</span>
                  <div className={`flex-1 text-[9.5px] px-1.5 py-1 rounded border leading-snug ${badgeStyle(it.badge)}`}>
                    <p className="font-medium">{it.titulo}</p>
                    {it.ubicacion && <p className="opacity-60">{it.ubicacion}</p>}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}

// ── COMPONENTE SECCIÓN ────────────────────────────────────────
function SeccionTiming({ sec, abierta, onToggle, onUpdateSeccion, onAddItem, onUpdateItem, onRemoveItem, onMoverItem, itemEditando, setItemEditando, proveedoresCRM, onAddProveedorCRM, modoVista }) {
  const esShotlist = sec.tipo === 'shotlist'
  const esProveedores = sec.tipo === 'proveedores'
  const items = sec.items || []
  const [showProvCRM, setShowProvCRM] = useState(false)

  const COLOR_SEC = {
    prep_novia: 'bg-pink-50 border-pink-200',
    prep_novio: 'bg-blue-50 border-blue-200',
    ceremonia:  'bg-brand/5 border-brand/20',
    traslado:   'bg-gray-50 border-gray-200',
    coctel:     'bg-amber-50 border-amber-200',
    recepcion:  'bg-orange-50 border-orange-200',
    barra_libre:'bg-purple-50 border-purple-200',
    shot_list:  'bg-teal-50 border-teal-200',
    proveedores:'bg-emerald-50 border-emerald-200',
  }

  return (
    <div className={`border-b border-cream-dark ${abierta ? 'bg-white' : ''}`}>
      {/* Header sección */}
      <button onClick={onToggle}
        className={`w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-cream/50 transition-colors ${abierta ? 'border-b border-cream-dark' : ''}`}>
        <div className={`w-2 h-6 rounded-full ${COLOR_SEC[sec.id]?.split(' ')[0] || 'bg-gray-200'}`}/>
        <span className="text-[13px] font-medium text-ink flex-1">{sec.titulo}</span>
        {!modoVista && sec.ubicacion && <span className="text-[10px] text-ink-3 flex items-center gap-1 mr-2"><MapPin size={9}/>{sec.ubicacion}</span>}
        <span className="text-[10px] text-ink-3 mr-1">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
        {abierta ? <ChevronUp size={14} className="text-ink-3"/> : <ChevronDown size={14} className="text-ink-3"/>}
      </button>

      {abierta && (
        <div className="px-5 py-3">
          {/* Datos de la sección */}
          {!modoVista && (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label">Ubicación / Lugar</label>
                <input value={sec.ubicacion||''} onChange={e=>onUpdateSeccion('ubicacion',e.target.value)} className="input text-sm py-1.5" placeholder="Ej: Hotel Sevilla Centro"/>
              </div>
              <div>
                <label className="label">Contacto principal</label>
                <input value={sec.contacto_principal||''} onChange={e=>onUpdateSeccion('contacto_principal',e.target.value)} className="input text-sm py-1.5" placeholder="Nombre / teléfono"/>
              </div>
            </div>
          )}
          {modoVista && (sec.ubicacion || sec.contacto_principal) && (
            <div className="flex gap-4 mb-3 text-xs text-ink-3">
              {sec.ubicacion && <span className="flex items-center gap-1"><MapPin size={11}/>{sec.ubicacion}</span>}
              {sec.contacto_principal && <span className="flex items-center gap-1"><Phone size={11}/>{sec.contacto_principal}</span>}
            </div>
          )}

          {/* Items */}
          {!esProveedores && !esShotlist && (
            <div className="space-y-1.5">
              {(modoVista ? [...items].sort((a,b)=>(a.hora||'99:99').replace(/\./,':').localeCompare((b.hora||'99:99').replace(/\./,':'))) : items)
                .map((item, idx) => (
                  <ItemRow
                    key={item.tempId}
                    item={item}
                    idx={idx}
                    total={items.length}
                    editando={itemEditando === item.tempId}
                    onToggleEdit={() => setItemEditando(itemEditando === item.tempId ? null : item.tempId)}
                    onUpdate={(campo, val) => onUpdateItem(item.tempId, campo, val)}
                    onRemove={() => onRemoveItem(item.tempId)}
                    onMoverArriba={() => onMoverItem(idx, -1)}
                    onMoverAbajo={() => onMoverItem(idx, 1)}
                    modoVista={modoVista}
                  />
                ))
              }
              {!modoVista && (
                <button onClick={onAddItem} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink-3 hover:text-brand hover:bg-brand/[.04] rounded-lg transition-all border border-dashed border-cream-dark hover:border-brand/30">
                  <Plus size={12}/> Añadir momento
                </button>
              )}
            </div>
          )}

          {/* Shot list */}
          {esShotlist && (
            <div className="space-y-1.5">
              {items.map((item, idx) => (
                <div key={item.tempId} className="flex items-start gap-2 group">
                  <div className="w-4 h-4 rounded border-2 border-ink-3 mt-0.5 flex-shrink-0"/>
                  {modoVista ? (
                    <div className="flex-1">
                      <p className="text-sm text-ink">{item.titulo}</p>
                      {item.notas && <p className="text-xs text-ink-3">{item.notas}</p>}
                    </div>
                  ) : (
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input value={item.titulo||''} onChange={e=>onUpdateItem(item.tempId,'titulo',e.target.value)} className="input text-sm py-1" placeholder="Foto imprescindible…"/>
                      <input value={item.notas||''} onChange={e=>onUpdateItem(item.tempId,'notas',e.target.value)} className="input text-sm py-1" placeholder="Notas…"/>
                    </div>
                  )}
                  {!modoVista && (
                    <button onClick={() => onRemoveItem(item.tempId)} className="text-ink-3 hover:text-red-500 opacity-0 group-hover:opacity-100 mt-0.5"><Trash2 size={12}/></button>
                  )}
                </div>
              ))}
              {!modoVista && (
                <button onClick={onAddItem} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink-3 hover:text-brand hover:bg-brand/[.04] rounded-lg transition-all border border-dashed border-cream-dark hover:border-brand/30">
                  <Plus size={12}/> Añadir foto
                </button>
              )}
            </div>
          )}

          {/* Proveedores */}
          {esProveedores && (
            <div className="space-y-2">
              {items.map((prov) => (
                <div key={prov.tempId} className="card p-3 group">
                  {modoVista ? (
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-ink">{prov.nombre}</p>
                        <p className="text-xs text-ink-3">{prov.tipo}</p>
                        {prov.contacto && <p className="text-xs text-ink-2 mt-0.5">{prov.contacto}</p>}
                        <div className="flex gap-3 mt-1">
                          {prov.telefono && <a href={`tel:${prov.telefono}`} className="text-xs text-brand flex items-center gap-1"><Phone size={10}/>{prov.telefono}</a>}
                          {prov.instagram && <a href={`https://instagram.com/${prov.instagram.replace('@','')}`} target="_blank" rel="noreferrer" className="text-xs text-brand flex items-center gap-1"><Link2 size={10}/>@{prov.instagram.replace('@','')}</a>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <input value={prov.nombre||''} onChange={e=>onUpdateItem(prov.tempId,'nombre',e.target.value)} className="input text-xs py-1" placeholder="Empresa / nombre"/>
                      <input value={prov.tipo||''} onChange={e=>onUpdateItem(prov.tempId,'tipo',e.target.value)} className="input text-xs py-1" placeholder="Tipo (DJ, Vídeo…)"/>
                      <input value={prov.contacto||''} onChange={e=>onUpdateItem(prov.tempId,'contacto',e.target.value)} className="input text-xs py-1" placeholder="Contacto"/>
                      <input value={prov.telefono||''} onChange={e=>onUpdateItem(prov.tempId,'telefono',e.target.value)} className="input text-xs py-1" placeholder="Teléfono"/>
                      <input value={prov.instagram||''} onChange={e=>onUpdateItem(prov.tempId,'instagram',e.target.value)} className="input text-xs py-1" placeholder="Instagram"/>
                      <input value={prov.notas||''} onChange={e=>onUpdateItem(prov.tempId,'notas',e.target.value)} className="input text-xs py-1" placeholder="Notas"/>
                      <button onClick={() => onRemoveItem(prov.tempId)} className="col-span-3 text-xs text-red-400 hover:text-red-600 text-right opacity-0 group-hover:opacity-100"><Trash2 size={12} className="inline"/> Eliminar</button>
                    </div>
                  )}
                </div>
              ))}
              {!modoVista && (
                <div className="flex gap-2">
                  <button onClick={onAddItem} className="btn-ghost text-xs flex-1 justify-center border border-dashed border-cream-dark hover:border-brand/30">
                    <Plus size={12}/> Añadir proveedor
                  </button>
                  <div className="relative">
                    <button onClick={() => setShowProvCRM(!showProvCRM)} className="btn-ghost text-xs whitespace-nowrap">
                      Del CRM <ChevronDown size={12}/>
                    </button>
                    {showProvCRM && (
                      <div className="absolute bottom-full mb-1 right-0 bg-white border border-brand/15 rounded-xl shadow-xl z-20 w-64 max-h-48 overflow-auto p-1.5">
                        {proveedoresCRM.map(p => (
                          <button key={p.id} onClick={() => { onAddProveedorCRM(p); setShowProvCRM(false) }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-brand/[.05] rounded-lg">
                            <span className="font-medium text-ink">{p.empresa}</span>
                            <span className="text-ink-3 ml-2">{p.categoria}</span>
                          </button>
                        ))}
                        {proveedoresCRM.length === 0 && <p className="text-xs text-ink-3 p-2 text-center">Sin proveedores en el CRM</p>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── COMPONENTE ITEM ───────────────────────────────────────────
function ItemRow({ item, idx, total, editando, onToggleEdit, onUpdate, onRemove, onMoverArriba, onMoverAbajo, modoVista }) {
  return (
    <div className={`rounded-lg border transition-all ${editando ? 'border-brand/25 bg-brand/[.02]' : 'border-cream-dark bg-white'} group`}>
      {/* Fila compacta */}
      <div className="flex items-center gap-2 px-3 py-2">
        {!modoVista && (
          <div className="flex flex-col gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onMoverArriba} disabled={idx===0} className="text-ink-3 hover:text-ink disabled:opacity-20 leading-none text-[10px]">▲</button>
            <button onClick={onMoverAbajo} disabled={idx===total-1} className="text-ink-3 hover:text-ink disabled:opacity-20 leading-none text-[10px]">▼</button>
          </div>
        )}
        {/* Hora */}
        {!modoVista ? (
          <input value={item.hora||''} onChange={e=>onUpdate('hora',e.target.value)}
            className="w-[70px] border border-transparent hover:border-brand/20 focus:border-brand/40 rounded px-1.5 py-0.5 text-xs font-mono text-ink bg-transparent focus:bg-white transition-all outline-none"
            placeholder="HH:MM"/>
        ) : (
          <span className="text-xs font-mono text-ink-3 w-[50px] flex-shrink-0 text-right">{item.hora||'—'}</span>
        )}
        {/* Badge */}
        {!modoVista ? (
          <select value={item.badge||''} onChange={e=>onUpdate('badge',e.target.value)}
            className={`text-[10px] px-2 py-0.5 rounded-full border-none outline-none cursor-pointer font-medium flex-shrink-0 ${badgeStyle(item.badge)}`}>
            {BADGES.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        ) : item.badge ? (
          <span className={`text-[9px] px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${badgeStyle(item.badge)}`}>{badgeLabel(item.badge)}</span>
        ) : null}
        {/* Título */}
        {!modoVista ? (
          <input value={item.titulo||''} onChange={e=>onUpdate('titulo',e.target.value)}
            className="flex-1 border border-transparent hover:border-brand/20 focus:border-brand/40 rounded px-1.5 py-0.5 text-sm text-ink bg-transparent focus:bg-white transition-all outline-none min-w-0"
            placeholder="Momento…"/>
        ) : (
          <span className="flex-1 text-sm text-ink truncate">{item.titulo}</span>
        )}
        {/* Acciones */}
        {!modoVista && (
          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onToggleEdit} className={`text-[10px] px-2 py-0.5 rounded transition-colors ${editando?'text-brand bg-brand/10':'text-ink-3 hover:text-brand hover:bg-brand/[.05]'}`}>
              {editando ? 'Cerrar' : 'Detalles'}
            </button>
            <button onClick={onRemove} className="text-ink-3 hover:text-red-500 p-0.5"><Trash2 size={12}/></button>
          </div>
        )}
        {/* Indicador de que tiene detalles */}
        {modoVista && (item.notas || item.contacto || item.ubicacion) && (
          <button onClick={onToggleEdit} className="text-ink-3 hover:text-ink flex-shrink-0">
            <ChevronRight size={13} className={editando?'rotate-90 transition-transform':'transition-transform'}/>
          </button>
        )}
      </div>

      {/* Panel expandido con detalles */}
      {editando && (
        <div className={`px-3 pb-3 border-t border-cream-dark mt-0 grid grid-cols-2 gap-2 ${modoVista?'pt-2':''}`}>
          {!modoVista ? (
            <>
              <div>
                <label className="label">Notas públicas</label>
                <textarea value={item.notas||''} onChange={e=>onUpdate('notas',e.target.value)} className="input text-xs resize-none py-1.5" rows={2} placeholder="Detalles para el cliente..."/>
              </div>
              <div>
                <label className="label">Notas internas</label>
                <textarea value={item.notas_internas||''} onChange={e=>onUpdate('notas_internas',e.target.value)} className="input text-xs resize-none py-1.5" rows={2} placeholder="Solo para ti (no visible al cliente)"/>
              </div>
              <div>
                <label className="label">Contacto</label>
                <input value={item.contacto||''} onChange={e=>onUpdate('contacto',e.target.value)} className="input text-xs py-1.5" placeholder="Nombre / teléfono"/>
              </div>
              <div>
                <label className="label">Ubicación</label>
                <input value={item.ubicacion||''} onChange={e=>onUpdate('ubicacion',e.target.value)} className="input text-xs py-1.5" placeholder="Lugar específico"/>
              </div>
            </>
          ) : (
            <div className="col-span-2 space-y-1">
              {item.notas && <p className="text-xs text-ink-2 leading-relaxed">{item.notas}</p>}
              {item.contacto && <p className="text-xs text-ink-3 flex items-center gap-1"><Phone size={10}/>{item.contacto}</p>}
              {item.ubicacion && <p className="text-xs text-ink-3 flex items-center gap-1"><MapPin size={10}/>{item.ubicacion}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
