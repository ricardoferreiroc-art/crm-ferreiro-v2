import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  ArrowLeft, Plus, Trash2, Save, Check, ChevronDown, ChevronUp,
  MapPin, Phone, Link2, X, ChevronRight, Eye, EyeOff,
  Zap, GripVertical, Clock, Users, Car, AlertCircle, Download
} from 'lucide-react'

// ── SECCIONES FIJAS ──────────────────────────────────────────
const SECCIONES = [
  { id: 'prep_novia',  titulo: 'Preparativos novia',   color: 'pink',   tipo: 'momentos' },
  { id: 'prep_novio',  titulo: 'Preparativos novio',   color: 'blue',   tipo: 'momentos' },
  { id: 'ceremonia',   titulo: 'Ceremonia',             color: 'indigo', tipo: 'momentos' },
  { id: 'traslado',    titulo: 'Traslado',              color: 'gray',   tipo: 'momentos' },
  { id: 'coctel',      titulo: 'Cóctel',                color: 'amber',  tipo: 'momentos' },
  { id: 'recepcion',   titulo: 'Recepción / Banquete',  color: 'orange', tipo: 'momentos' },
  { id: 'barra_libre', titulo: 'Barra libre & fiesta',  color: 'purple', tipo: 'momentos' },
  { id: 'shot_list',   titulo: 'Shot list',             color: 'teal',   tipo: 'shotlist' },
  { id: 'proveedores', titulo: 'Proveedores del día',   color: 'green',  tipo: 'proveedores' },
]

const COL = {
  pink:   { bg:'bg-pink-50',   border:'border-pink-200',   dot:'bg-pink-400',   head:'text-pink-700',   btn:'hover:bg-pink-50' },
  blue:   { bg:'bg-blue-50',   border:'border-blue-200',   dot:'bg-blue-400',   head:'text-blue-700',   btn:'hover:bg-blue-50' },
  indigo: { bg:'bg-indigo-50', border:'border-indigo-200', dot:'bg-indigo-500', head:'text-indigo-700', btn:'hover:bg-indigo-50' },
  gray:   { bg:'bg-gray-50',   border:'border-gray-200',   dot:'bg-gray-400',   head:'text-gray-600',   btn:'hover:bg-gray-50' },
  amber:  { bg:'bg-amber-50',  border:'border-amber-200',  dot:'bg-amber-400',  head:'text-amber-700',  btn:'hover:bg-amber-50' },
  orange: { bg:'bg-orange-50', border:'border-orange-200', dot:'bg-orange-400', head:'text-orange-700', btn:'hover:bg-orange-50' },
  purple: { bg:'bg-purple-50', border:'border-purple-200', dot:'bg-purple-400', head:'text-purple-700', btn:'hover:bg-purple-50' },
  teal:   { bg:'bg-teal-50',   border:'border-teal-200',   dot:'bg-teal-400',   head:'text-teal-700',   btn:'hover:bg-teal-50' },
  green:  { bg:'bg-green-50',  border:'border-green-200',  dot:'bg-green-500',  head:'text-green-700',  btn:'hover:bg-green-50' },
}

// ── BADGES ───────────────────────────────────────────────────
const BADGES = [
  { id: '',      label: '—',            cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  { id: 'yo',    label: '📷 Yo',        cls: 'bg-brand/10 text-brand border-brand/20' },
  { id: 'video', label: '🎬 Vídeo',     cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'clave', label: '⭐ Clave',     cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: '2nd',   label: '📸 2º foto',   cls: 'bg-teal-100 text-teal-700 border-teal-200' },
  { id: 'wp',    label: '💼 W.Planner', cls: 'bg-pink-100 text-pink-700 border-pink-200' },
  { id: 'dj',    label: '🎵 DJ/Música', cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
]
const getBadge = (id) => BADGES.find(b => b.id === id) || BADGES[0]

// ── ITEMS RÁPIDOS POR SECCIÓN ─────────────────────────────────
const RAPIDOS = {
  prep_novia:  [
    { titulo:'Llega el fotógrafo', badge:'yo', hora:'09:00', contacto:'Ricardo Ferreiro / +34 606110337' },
    { titulo:'Llega el videógrafo', badge:'video', hora:'09:00' },
    { titulo:'Personas que acompañan a la novia', badge:'', hora:'' },
    { titulo:'Fotos de familia', badge:'clave', hora:'' },
    { titulo:'Salida hacia la ceremonia', badge:'', hora:'' },
  ],
  prep_novio: [
    { titulo:'Llega el fotógrafo/2º', badge:'2nd', hora:'' },
    { titulo:'Llega el videógrafo', badge:'video', hora:'' },
    { titulo:'Personas que acompañan al novio', badge:'', hora:'' },
    { titulo:'Fotos de familia', badge:'clave', hora:'' },
    { titulo:'Salida hacia la ceremonia', badge:'', hora:'' },
  ],
  ceremonia: [
    { titulo:'Entrada de la novia', badge:'clave', hora:'' },
    { titulo:'Inicio de la ceremonia', badge:'clave', hora:'' },
    { titulo:'Personas que intervienen', badge:'clave', hora:'' },
    { titulo:'Música en la ceremonia', badge:'', hora:'' },
    { titulo:'Finalización de la ceremonia', badge:'clave', hora:'' },
    { titulo:'Salida de los novios', badge:'clave', hora:'' },
  ],
  coctel: [
    { titulo:'Entrada al cóctel', badge:'clave', hora:'' },
    { titulo:'Entrega de ramos a las madres', badge:'clave', hora:'' },
    { titulo:'Música en directo', badge:'dj', hora:'' },
  ],
  recepcion: [
    { titulo:'Entrada de los novios al salón', badge:'clave', hora:'' },
    { titulo:'Entrega de detalles/regalos', badge:'clave', hora:'' },
    { titulo:'Postres', badge:'', hora:'' },
  ],
  barra_libre: [
    { titulo:'Inicio barra libre', badge:'', hora:'' },
    { titulo:'Baile nupcial', badge:'clave', hora:'' },
    { titulo:'DJ / Ameniza', badge:'dj', hora:'' },
  ],
}

const newItem = () => ({
  _id: `${Date.now()}-${Math.random()}`,
  hora: '', titulo: '', notas: '', notas_internas: '',
  contacto: '', ubicacion: '', badge: '',
})

const newProv = () => ({
  _id: `${Date.now()}-${Math.random()}`,
  nombre: '', tipo: '', contacto: '', telefono: '', instagram: '', notas: '',
})

const newShot = () => ({
  _id: `${Date.now()}-${Math.random()}`,
  titulo: '', notas: '',
})

// ── HOOK GOOGLE PLACES AUTOCOMPLETE ──────────────────────────
function usePlaces(inputRef, onSelect) {
  useEffect(() => {
    if (!inputRef.current || !window.google?.maps?.places) return
    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment', 'geocode'],
      componentRestrictions: { country: 'es' },
      fields: ['formatted_address', 'name'],
    })
    const listener = ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      const val = place.name
        ? `${place.name}${place.formatted_address ? ', '+place.formatted_address : ''}`
        : place.formatted_address || ''
      onSelect(val)
    })
    return () => window.google.maps.event.removeListener(listener)
  }, [])
}

// Campo con autocompletado de Google Places
function PlacesInput({ value, onChange, placeholder, className }) {
  const ref = useRef(null)
  usePlaces(ref, onChange)
  return (
    <input
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  )
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────
export default function Timing() {
  const { id } = useParams()
  const { user } = useAuth()
  const [trabajo, setTrabajo] = useState(null)
  const [provsCRM, setProvsCRM] = useState([])
  const [secciones, setSecciones] = useState([])
  const [infoGlobal, setInfoGlobal] = useState({
    prep_hora_foto: '', prep_hora_video: '', prep_salida_foto_video: '',
    ceremonia_hora: '', ceremonia_duracion: '',
    coctel_hora: '', recepcion_hora: '', recepcion_tipo: 'Banquete',
    barra_hora: '', fin_boda: '',
    invitados_adultos: '', invitados_ninos: '', parking: '',
    obs: '',
    ves_novia: { vestido: '', disenador: '', zapatos: '', joyas: '', ramo: '' },
    ves_novio: { traje: '', disenador: '' },
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [timingId, setTimingId] = useState(null)
  const [openSec, setOpenSec] = useState('prep_novia')
  const [vistaCliente, setVistaCliente] = useState(false)
  const [expandedItem, setExpandedItem] = useState(null)
  const [showRapidos, setShowRapidos] = useState(null)
  const [showProvCRM, setShowProvCRM] = useState(false)
  const [googleLoaded, setGoogleLoaded] = useState(false)

  // Cargar Google Places API
  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_PLACES_API_KEY
    if (!key || window.google?.maps?.places) { setGoogleLoaded(true); return }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&language=es`
    script.async = true
    script.onload = () => setGoogleLoaded(true)
    document.head.appendChild(script)
  }, [])

  useEffect(() => { if (user && id) cargar() }, [user, id])

  async function cargar() {
    setLoading(true)
    const [{ data: t }, { data: tim }, { data: provs }] = await Promise.all([
      supabase.from('v2_trabajos').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('v2_timings').select('*').eq('trabajo_id', id).single(),
      supabase.from('v2_proveedores').select('id,empresa,nombre,categoria,telefono,instagram')
        .eq('user_id', user.id).is('deleted_at', null).order('empresa'),
    ])
    setTrabajo(t)
    setProvsCRM(provs || [])

    if (tim) {
      setTimingId(tim.id)
      const raw = tim.contenido || tim.eventos || []
      if (Array.isArray(raw) && raw.length > 0) {
        // Normalizar desde formato v1 o v2
        const secsNorm = SECCIONES.map(base => {
          const found = raw.find(s => s.id === base.id)
          return {
            ...base,
            ubicacion: found?.ubicacion || '',
            contacto_principal: found?.contacto_principal || '',
            items: (found?.items || []).map(it => ({ ...it, _id: `${Date.now()}-${Math.random()}` })),
          }
        })
        setSecciones(secsNorm)
      } else {
        setSecciones(initSecciones(t))
      }
      if (tim.info_global && typeof tim.info_global === 'object') {
        setInfoGlobal(g => ({ ...g, ...tim.info_global }))
      }
    } else {
      setSecciones(initSecciones(t))
      setInfoGlobal(g => ({
        ...g,
        ceremonia_hora: t?.hora_ceremonia || '',
        invitados_adultos: t?.n_invitados?.toString() || '',
      }))
    }
    setLoading(false)
  }

  function initSecciones(t) {
    return SECCIONES.map(s => {
      const items = []
      if (s.id === 'prep_novia') {
        items.push({ ...newItem(), hora: t?.hora_inicio || '09:00', titulo: 'Llega el fotógrafo', badge: 'yo', contacto: 'Ricardo Ferreiro / +34 606110337' })
      }
      if (s.id === 'ceremonia' && t?.hora_ceremonia) {
        items.push({ ...newItem(), hora: t.hora_ceremonia, titulo: 'Inicio ceremonia', badge: 'clave', ubicacion: t?.lugar_ceremonia || '' })
      }
      const ubicDefecto = ['coctel','recepcion','barra_libre'].includes(s.id) ? (t?.lugar || '') : ''
        || s.id === 'ceremonia' ? (t?.lugar_ceremonia || '') : ''
      return { ...s, ubicacion: ubicDefecto, contacto_principal: '', items }
    })
  }

  // ── MUTACIONES ───────────────────────────────────────────────
  const updSec = (secId, campo, val) =>
    setSecciones(ss => ss.map(s => s.id === secId ? { ...s, [campo]: val } : s))

  const addItem = (secId, template = null) => {
    const nuevo = template ? { ...newItem(), ...template, _id: `${Date.now()}-${Math.random()}` } : newItem()
    setSecciones(ss => ss.map(s => s.id !== secId ? s : { ...s, items: [...(s.items||[]), nuevo] }))
    setExpandedItem(nuevo._id)
    setShowRapidos(null)
  }

  const updItem = (secId, _id, campo, val) =>
    setSecciones(ss => ss.map(s => s.id !== secId ? s : {
      ...s, items: s.items.map(it => it._id !== _id ? it : { ...it, [campo]: val })
    }))

  const delItem = (secId, _id) =>
    setSecciones(ss => ss.map(s => s.id !== secId ? s : { ...s, items: s.items.filter(it => it._id !== _id) }))

  const moveItem = (secId, idx, dir) =>
    setSecciones(ss => ss.map(s => {
      if (s.id !== secId) return s
      const arr = [...s.items]; const to = idx + dir
      if (to < 0 || to >= arr.length) return s
      ;[arr[idx], arr[to]] = [arr[to], arr[idx]]
      return { ...s, items: arr }
    }))

  const addProvFromCRM = (prov) => {
    const nuevo = {
      ...newProv(),
      nombre: prov.empresa || '', tipo: prov.categoria || '',
      contacto: prov.nombre || '', telefono: prov.telefono || '',
      instagram: prov.instagram || '',
    }
    setSecciones(ss => ss.map(s => s.id !== 'proveedores' ? s : { ...s, items: [...(s.items||[]), nuevo] }))
    setShowProvCRM(false)
  }

  const setIG = (k, v) => setInfoGlobal(g => ({ ...g, [k]: v }))
  const setVN = (k, v) => setInfoGlobal(g => ({ ...g, ves_novia: { ...(g.ves_novia||{}), [k]: v } }))
  const setVNovio = (k, v) => setInfoGlobal(g => ({ ...g, ves_novio: { ...(g.ves_novio||{}), [k]: v } }))

  async function guardar() {
    setSaving(true)
    const payload = {
      trabajo_id: parseInt(id), user_id: user.id,
      contenido: secciones.map(s => ({
        id: s.id, tipo: s.tipo, titulo: s.titulo,
        color: s.color,
        ubicacion: s.ubicacion || '',
        contacto_principal: s.contacto_principal || '',
        items: (s.items||[]).map(({ _id, ...it }) => it),
      })),
      info_global: infoGlobal, notas: '',
    }
    if (timingId) {
      await supabase.from('v2_timings').update(payload).eq('id', timingId)
    } else {
      const { data } = await supabase.from('v2_timings').insert(payload).select().single()
      if (data) setTimingId(data.id)
    }
    setSaved(true); setTimeout(() => setSaved(false), 2000); setSaving(false)
  }

  // Todos los items con hora, ordenados
  const allItems = secciones
    .filter(s => s.tipo === 'momentos')
    .flatMap(s => (s.items||[]).filter(it => it.hora && it.titulo).map(it => ({ ...it, _sec: s.titulo, _color: s.color })))
    .sort((a,b) => (a.hora||'').replace('.',':').localeCompare((b.hora||'').replace('.',':')))

  if (loading) return <div className="flex items-center justify-center h-64 text-sm text-ink-3">Cargando timing…</div>

  return (
    <div className="flex h-[calc(100vh-54px)] overflow-hidden bg-cream">

      {/* ══════════ PANEL IZQUIERDO ══════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-cream-dark bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link to={`/trabajos/${id}`} className="text-ink-3 hover:text-ink transition-colors">
              <ArrowLeft size={16}/>
            </Link>
            <div>
              <p className="text-[14px] font-medium text-ink">{trabajo?.titulo}</p>
              <p className="text-[11px] text-ink-3">
                {trabajo?.fecha
                  ? new Date(trabajo.fecha+'T00:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
                  : '—'}
                {trabajo?.lugar ? ` · ${trabajo.lugar}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setVistaCliente(!vistaCliente)}
              className={`btn-ghost text-xs gap-1.5 ${vistaCliente?'text-brand bg-brand/[.06]':''}`}>
              {vistaCliente ? <><EyeOff size={13}/> Editar</> : <><Eye size={13}/> Vista cliente</>}
            </button>
            <button onClick={guardar} disabled={saving}
              className={`btn-primary text-sm ${saved?'bg-emerald-600 border-emerald-600':''}`}>
              {saved ? <><Check size={13}/> Guardado</> : saving ? '…' : <><Save size={13}/> Guardar</>}
            </button>
          </div>
        </div>

        {/* Info global colapsable */}
        {!vistaCliente && (
          <details className="border-b border-cream-dark bg-white flex-shrink-0 group">
            <summary className="flex items-center gap-2 px-5 py-2.5 cursor-pointer text-xs font-medium text-ink-2 select-none list-none">
              <AlertCircle size={13} className="text-ink-3"/>
              <span>Datos generales de la boda</span>
              <ChevronDown size={12} className="text-ink-3 ml-auto group-open:rotate-180 transition-transform"/>
            </summary>
            <div className="px-5 pb-5 pt-1">
              <div className="grid grid-cols-6 gap-2.5 mb-3">
                {[
                  { k:'prep_hora_foto',           l:'📷 Llega fotógrafo',   t:'time' },
                  { k:'prep_hora_video',          l:'🎬 Llega videógrafo',  t:'time' },
                  { k:'prep_salida_foto_video',   l:'🚗 Salen a ceremonia', t:'time' },
                  { k:'ceremonia_hora',           l:'💒 Inicio ceremonia',  t:'time' },
                  { k:'ceremonia_duracion',       l:'⏱ Duración ceremonia', t:'text' },
                  { k:'coctel_hora',              l:'🥂 Inicio cóctel',     t:'time' },
                  { k:'recepcion_hora',           l:'🍽 Inicio recepción',  t:'time' },
                  { k:'recepcion_tipo',           l:'Tipo recepción',       t:'text' },
                  { k:'barra_hora',               l:'🎉 Barra libre',       t:'time' },
                  { k:'fin_boda',                 l:'🌙 Fin de boda',       t:'time' },
                  { k:'invitados_adultos',        l:'👥 Invitados adultos', t:'number' },
                  { k:'invitados_ninos',          l:'🧒 Niños',             t:'number' },
                ].map(f => (
                  <div key={f.k}>
                    <label className="label text-[9.5px]">{f.l}</label>
                    <input type={f.t} value={infoGlobal[f.k]||''} onChange={e=>setIG(f.k,e.target.value)}
                      className="input text-xs py-1.5"/>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                {/* Vestuario novia */}
                <div className="col-span-2">
                  <label className="label text-[9.5px] mb-1.5">👰 Vestuario novia</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[{k:'vestido',l:'Vestido'},{k:'disenador',l:'Diseñador'},{k:'zapatos',l:'Zapatos'},{k:'joyas',l:'Joyas'},{k:'ramo',l:'Ramo'}].map(f=>(
                      <input key={f.k} placeholder={f.l} value={infoGlobal.ves_novia?.[f.k]||''}
                        onChange={e=>setVN(f.k,e.target.value)} className="input text-xs py-1"/>
                    ))}
                  </div>
                </div>
                {/* Vestuario novio */}
                <div>
                  <label className="label text-[9.5px] mb-1.5">🤵 Vestuario novio</label>
                  <div className="space-y-1.5">
                    {[{k:'traje',l:'Traje'},{k:'disenador',l:'Diseñador'}].map(f=>(
                      <input key={f.k} placeholder={f.l} value={infoGlobal.ves_novio?.[f.k]||''}
                        onChange={e=>setVNovio(f.k,e.target.value)} className="input text-xs py-1"/>
                    ))}
                  </div>
                </div>
                {/* Otros */}
                <div className="space-y-1.5">
                  <div>
                    <label className="label text-[9.5px]">🅿 Parking</label>
                    <input value={infoGlobal.parking||''} onChange={e=>setIG('parking',e.target.value)} className="input text-xs py-1"/>
                  </div>
                  <div>
                    <label className="label text-[9.5px]">📝 Observaciones</label>
                    <textarea value={infoGlobal.obs||''} onChange={e=>setIG('obs',e.target.value)} className="input text-xs py-1 resize-none" rows={2}/>
                  </div>
                </div>
              </div>
            </div>
          </details>
        )}

        {/* Secciones */}
        <div className="flex-1 overflow-auto">
          {secciones.map(sec => {
            const c = COL[sec.color]
            const isOpen = openSec === sec.id
            const items = sec.items || []
            const esProv = sec.tipo === 'proveedores'
            const isShot = sec.tipo === 'shotlist'
            const rapidos = RAPIDOS[sec.id] || []

            return (
              <div key={sec.id} className={`border-b border-cream-dark ${isOpen ? 'bg-white' : ''}`}>

                {/* Header sección */}
                <button
                  onClick={() => setOpenSec(isOpen ? null : sec.id)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors
                    ${isOpen ? `${c.bg} border-b ${c.border}` : 'hover:bg-cream/60'}`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.dot}`}/>
                  <span className={`text-[13.5px] font-medium flex-1 ${isOpen ? c.head : 'text-ink'}`}>
                    {sec.titulo}
                  </span>
                  {sec.ubicacion && (
                    <span className="flex items-center gap-1 text-[10px] text-ink-3 mr-2">
                      <MapPin size={9}/>{sec.ubicacion.split(',')[0]}
                    </span>
                  )}
                  <span className="text-[10px] text-ink-3">{items.length}</span>
                  {isOpen ? <ChevronUp size={14} className="text-ink-3 flex-shrink-0"/> : <ChevronDown size={14} className="text-ink-3 flex-shrink-0"/>}
                </button>

                {isOpen && (
                  <div className="px-5 py-4">

                    {/* Campos de sección */}
                    {!vistaCliente && !esProv && !isShot && (
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                          <label className="label">📍 Ubicación</label>
                          {googleLoaded
                            ? <PlacesInput value={sec.ubicacion||''} onChange={v=>updSec(sec.id,'ubicacion',v)} placeholder="Escribe para buscar dirección…" className="input text-sm"/>
                            : <input value={sec.ubicacion||''} onChange={e=>updSec(sec.id,'ubicacion',e.target.value)} className="input text-sm" placeholder="Dirección o lugar"/>
                          }
                        </div>
                        <div>
                          <label className="label">📞 Contacto principal</label>
                          <input value={sec.contacto_principal||''} onChange={e=>updSec(sec.id,'contacto_principal',e.target.value)} className="input text-sm" placeholder="Nombre / teléfono"/>
                        </div>
                      </div>
                    )}

                    {/* Vista cliente: info sección */}
                    {vistaCliente && (sec.ubicacion || sec.contacto_principal) && (
                      <div className="flex gap-4 mb-3 pb-3 border-b border-cream-dark text-xs text-ink-3">
                        {sec.ubicacion && <span className="flex items-center gap-1.5"><MapPin size={11}/>{sec.ubicacion}</span>}
                        {sec.contacto_principal && <span className="flex items-center gap-1.5"><Phone size={11}/>{sec.contacto_principal}</span>}
                      </div>
                    )}

                    {/* ── MOMENTOS ── */}
                    {!esProv && !isShot && (
                      <div>
                        {/* Timeline de items */}
                        <div className="relative pl-16">
                          {/* Línea vertical */}
                          {items.length > 0 && (
                            <div className="absolute left-[34px] top-2 bottom-2 w-px bg-cream-dark"/>
                          )}

                          {(vistaCliente
                            ? [...items].sort((a,b)=>(a.hora||'').replace('.',':').localeCompare((b.hora||'').replace('.',':')))
                            : items
                          ).map((item, idx) => {
                            const badge = getBadge(item.badge)
                            const isExp = expandedItem === item._id
                            return (
                              <div key={item._id} className="relative mb-2 group">
                                {/* Hora a la izquierda */}
                                <div className="absolute -left-16 top-2 w-[52px] text-right">
                                  {!vistaCliente ? (
                                    <input value={item.hora||''} onChange={e=>updItem(sec.id,item._id,'hora',e.target.value)}
                                      className="w-full text-right text-xs font-mono text-ink-3 bg-transparent border-0 outline-none hover:text-ink focus:text-ink p-0"
                                      placeholder="HH:MM"/>
                                  ) : (
                                    <span className="text-xs font-mono text-ink-3">{item.hora||'—'}</span>
                                  )}
                                </div>

                                {/* Punto en la línea */}
                                <div className={`absolute -left-[7px] top-2.5 w-3.5 h-3.5 rounded-full border-2 border-white z-10 flex-shrink-0
                                  ${item.badge ? c.dot : 'bg-gray-300'}`}
                                  style={{left:'-27px'}}
                                />

                                {/* Tarjeta */}
                                <div className={`rounded-lg border transition-all
                                  ${isExp && !vistaCliente ? `border-brand/25 ${c.bg}` : 'border-cream-dark bg-white hover:border-gray-300'}`}>

                                  <div className="flex items-center gap-2 px-3 py-2">
                                    {/* Reorder (solo edición) */}
                                    {!vistaCliente && (
                                      <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                        <button onClick={()=>moveItem(sec.id,idx,-1)} disabled={idx===0} className="text-[9px] text-ink-3 hover:text-ink disabled:opacity-20 leading-none">▲</button>
                                        <button onClick={()=>moveItem(sec.id,idx,1)} disabled={idx===items.length-1} className="text-[9px] text-ink-3 hover:text-ink disabled:opacity-20 leading-none">▼</button>
                                      </div>
                                    )}

                                    {/* Badge */}
                                    {!vistaCliente ? (
                                      <select value={item.badge||''} onChange={e=>updItem(sec.id,item._id,'badge',e.target.value)}
                                        className={`text-[10px] px-2 py-0.5 rounded-full border cursor-pointer outline-none flex-shrink-0 font-medium ${badge.cls}`}>
                                        {BADGES.map(b=><option key={b.id} value={b.id}>{b.label}</option>)}
                                      </select>
                                    ) : item.badge ? (
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 font-medium ${badge.cls}`}>{badge.label}</span>
                                    ) : null}

                                    {/* Título */}
                                    {!vistaCliente ? (
                                      <input value={item.titulo||''} onChange={e=>updItem(sec.id,item._id,'titulo',e.target.value)}
                                        className="flex-1 text-sm text-ink bg-transparent border-0 outline-none min-w-0 placeholder-ink-3"
                                        placeholder="Descripción del momento…"/>
                                    ) : (
                                      <span className="flex-1 text-sm text-ink">{item.titulo}</span>
                                    )}

                                    {/* Acciones */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      {!vistaCliente ? (
                                        <>
                                          <button onClick={()=>setExpandedItem(isExp?null:item._id)}
                                            className={`text-[10px] px-2 py-0.5 rounded transition-colors opacity-0 group-hover:opacity-100
                                              ${isExp?'text-brand bg-brand/10':'text-ink-3 hover:text-brand hover:bg-brand/[.06]'}`}>
                                            {isExp?'Cerrar':'+ Detalles'}
                                          </button>
                                          <button onClick={()=>delItem(sec.id,item._id)}
                                            className="text-ink-3 hover:text-red-500 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 size={12}/>
                                          </button>
                                        </>
                                      ) : (item.notas || item.contacto || item.ubicacion) ? (
                                        <button onClick={()=>setExpandedItem(isExp?null:item._id)}
                                          className="text-ink-3 hover:text-ink">
                                          <ChevronRight size={13} className={isExp?'rotate-90 transition-transform':'transition-transform'}/>
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>

                                  {/* Panel expandido */}
                                  {isExp && (
                                    <div className="border-t border-cream-dark px-3 py-3">
                                      {!vistaCliente ? (
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <label className="label text-[10px]">Notas (visibles para el cliente)</label>
                                            <textarea value={item.notas||''} onChange={e=>updItem(sec.id,item._id,'notas',e.target.value)}
                                              className="input text-xs resize-none py-1.5" rows={2} placeholder="Detalles que verá la pareja…"/>
                                          </div>
                                          <div>
                                            <label className="label text-[10px]">🔒 Notas internas (solo tú)</label>
                                            <textarea value={item.notas_internas||''} onChange={e=>updItem(sec.id,item._id,'notas_internas',e.target.value)}
                                              className="input text-xs resize-none py-1.5 bg-amber-50 border-amber-200" rows={2} placeholder="Recordatorios privados…"/>
                                          </div>
                                          <div>
                                            <label className="label text-[10px]">Contacto</label>
                                            <input value={item.contacto||''} onChange={e=>updItem(sec.id,item._id,'contacto',e.target.value)}
                                              className="input text-xs py-1.5" placeholder="Nombre / teléfono"/>
                                          </div>
                                          <div>
                                            <label className="label text-[10px]">📍 Ubicación específica</label>
                                            {googleLoaded
                                              ? <PlacesInput value={item.ubicacion||''} onChange={v=>updItem(sec.id,item._id,'ubicacion',v)} placeholder="Buscar dirección…" className="input text-xs py-1.5"/>
                                              : <input value={item.ubicacion||''} onChange={e=>updItem(sec.id,item._id,'ubicacion',e.target.value)} className="input text-xs py-1.5" placeholder="Dirección"/>
                                            }
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="space-y-1.5 text-xs">
                                          {item.notas && <p className="text-ink-2 leading-relaxed">{item.notas}</p>}
                                          {item.contacto && <p className="text-ink-3 flex items-center gap-1.5"><Phone size={10}/>{item.contacto}</p>}
                                          {item.ubicacion && <p className="text-ink-3 flex items-center gap-1.5"><MapPin size={10}/>{item.ubicacion}</p>}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Botones añadir */}
                        {!vistaCliente && (
                          <div className="pl-16 mt-2 flex gap-2">
                            <button onClick={()=>addItem(sec.id)}
                              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-dashed transition-all ${c.btn} text-ink-3 hover:text-ink border-gray-200 hover:border-gray-300`}>
                              <Plus size={12}/> Añadir momento
                            </button>
                            {rapidos.length > 0 && (
                              <div className="relative">
                                <button onClick={()=>setShowRapidos(showRapidos===sec.id?null:sec.id)}
                                  className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-dashed border-gray-200 hover:border-brand/30 text-ink-3 hover:text-brand transition-all">
                                  <Zap size={12}/> Rápido
                                </button>
                                {showRapidos===sec.id && (
                                  <div className="absolute bottom-full mb-1 left-0 bg-white border border-brand/15 rounded-xl shadow-xl z-20 w-56 py-1.5">
                                    {rapidos.map((r,i)=>(
                                      <button key={i} onClick={()=>addItem(sec.id,r)}
                                        className="w-full text-left px-3.5 py-2 text-xs hover:bg-brand/[.05] flex items-center gap-2.5">
                                        {r.badge && <span className={`text-[9px] px-1.5 py-0.5 rounded-full border flex-shrink-0 ${getBadge(r.badge).cls}`}>{getBadge(r.badge).label}</span>}
                                        <span className="text-ink">{r.titulo}</span>
                                        {r.hora && <span className="text-ink-3 ml-auto font-mono">{r.hora}</span>}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── SHOT LIST ── */}
                    {isShot && (
                      <div className="space-y-1.5">
                        {items.map((item,idx)=>(
                          <div key={item._id} className="flex items-start gap-3 group">
                            <div className={`w-4 h-4 rounded border-2 mt-0.5 flex-shrink-0 ${COL.teal.border}`}/>
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              {!vistaCliente ? (
                                <>
                                  <input value={item.titulo||''} onChange={e=>updItem(sec.id,item._id,'titulo',e.target.value)}
                                    className="input text-sm py-1" placeholder="Foto imprescindible…"/>
                                  <input value={item.notas||''} onChange={e=>updItem(sec.id,item._id,'notas',e.target.value)}
                                    className="input text-sm py-1" placeholder="Detalles…"/>
                                </>
                              ) : (
                                <div className="col-span-2">
                                  <p className="text-sm text-ink">{item.titulo}</p>
                                  {item.notas && <p className="text-xs text-ink-3 mt-0.5">{item.notas}</p>}
                                </div>
                              )}
                            </div>
                            {!vistaCliente && (
                              <button onClick={()=>delItem(sec.id,item._id)}
                                className="text-ink-3 hover:text-red-500 opacity-0 group-hover:opacity-100 mt-0.5">
                                <Trash2 size={12}/>
                              </button>
                            )}
                          </div>
                        ))}
                        {!vistaCliente && (
                          <button onClick={()=>addItem(sec.id,{})}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink-3 hover:text-teal-700 hover:bg-teal-50 rounded-lg border border-dashed border-gray-200 hover:border-teal-200 transition-all">
                            <Plus size={12}/> Añadir foto
                          </button>
                        )}
                      </div>
                    )}

                    {/* ── PROVEEDORES ── */}
                    {esProv && (
                      <div className="space-y-2">
                        {items.map(prov=>(
                          <div key={prov._id} className="card p-3.5 group">
                            {!vistaCliente ? (
                              <div className="grid grid-cols-3 gap-2">
                                <input value={prov.nombre||''} onChange={e=>updItem(sec.id,prov._id,'nombre',e.target.value)} className="input text-xs py-1.5" placeholder="Empresa / nombre"/>
                                <input value={prov.tipo||''} onChange={e=>updItem(sec.id,prov._id,'tipo',e.target.value)} className="input text-xs py-1.5" placeholder="Tipo (DJ, Vídeo…)"/>
                                <input value={prov.contacto||''} onChange={e=>updItem(sec.id,prov._id,'contacto',e.target.value)} className="input text-xs py-1.5" placeholder="Contacto"/>
                                <input value={prov.telefono||''} onChange={e=>updItem(sec.id,prov._id,'telefono',e.target.value)} className="input text-xs py-1.5" placeholder="📞 Teléfono"/>
                                <input value={prov.instagram||''} onChange={e=>updItem(sec.id,prov._id,'instagram',e.target.value)} className="input text-xs py-1.5" placeholder="📸 Instagram"/>
                                <input value={prov.notas||''} onChange={e=>updItem(sec.id,prov._id,'notas',e.target.value)} className="input text-xs py-1.5" placeholder="Notas"/>
                                <button onClick={()=>delItem(sec.id,prov._id)}
                                  className="col-span-3 flex items-center justify-end gap-1 text-[10px] text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Trash2 size={10}/> Eliminar
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-ink">{prov.nombre}</p>
                                  {prov.tipo && <p className="text-xs text-ink-3">{prov.tipo}</p>}
                                  {prov.contacto && <p className="text-xs text-ink-2 mt-0.5">{prov.contacto}</p>}
                                  <div className="flex flex-wrap gap-3 mt-1.5">
                                    {prov.telefono && <a href={`tel:${prov.telefono}`} className="text-xs text-brand flex items-center gap-1 hover:underline"><Phone size={10}/>{prov.telefono}</a>}
                                    {prov.instagram && <a href={`https://instagram.com/${prov.instagram.replace('@','')}`} target="_blank" rel="noreferrer" className="text-xs text-brand flex items-center gap-1 hover:underline"><Link2 size={10}/>@{prov.instagram.replace('@','')}</a>}
                                  </div>
                                  {prov.notas && <p className="text-xs text-ink-3 mt-1 italic">{prov.notas}</p>}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {!vistaCliente && (
                          <div className="flex gap-2">
                            <button onClick={()=>addItem(sec.id,{})}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-dashed border-gray-200 hover:border-green-300 hover:bg-green-50 text-ink-3 hover:text-green-700 transition-all">
                              <Plus size={12}/> Añadir proveedor
                            </button>
                            <div className="relative">
                              <button onClick={()=>setShowProvCRM(!showProvCRM)}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-dashed border-gray-200 hover:border-brand/30 hover:bg-brand/[.04] text-ink-3 hover:text-brand transition-all whitespace-nowrap">
                                Del CRM <ChevronDown size={11}/>
                              </button>
                              {showProvCRM && (
                                <div className="absolute bottom-full mb-1 right-0 bg-white border border-brand/15 rounded-xl shadow-xl z-30 w-64 max-h-52 overflow-auto py-1.5">
                                  {provsCRM.length===0
                                    ? <p className="text-xs text-ink-3 px-4 py-2">Sin proveedores en el CRM</p>
                                    : provsCRM.map(p=>(
                                      <button key={p.id} onClick={()=>addProvFromCRM(p)}
                                        className="w-full text-left px-4 py-2 text-xs hover:bg-brand/[.05] flex items-center justify-between gap-2">
                                        <span className="font-medium text-ink truncate">{p.empresa}</span>
                                        <span className="text-ink-3 flex-shrink-0 text-[10px]">{p.categoria}</span>
                                      </button>
                                    ))
                                  }
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
          })}
        </div>
      </div>

      {/* ══════════ PANEL DERECHO: TIMELINE ══════════ */}
      <div className="w-60 border-l border-brand/[.08] flex flex-col bg-white overflow-hidden flex-shrink-0">
        <div className="px-4 py-3 border-b border-cream-dark">
          <p className="text-[11px] font-medium text-ink-2">Timeline del día</p>
          {trabajo?.fecha && (
            <p className="text-[9.5px] text-ink-3 mt-0.5">
              {new Date(trabajo.fecha+'T00:00').toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'})}
            </p>
          )}
        </div>
        <div className="flex-1 overflow-auto py-3 px-3 space-y-0.5">
          {/* Horas clave del info global */}
          {[
            { h:infoGlobal.prep_hora_foto,         txt:'📷 Llega fotógrafo',  color:'brand' },
            { h:infoGlobal.prep_hora_video,        txt:'🎬 Llega videógrafo', color:'purple' },
            { h:infoGlobal.prep_salida_foto_video, txt:'🚗 Salen a ceremonia',color:'gray' },
            { h:infoGlobal.ceremonia_hora,         txt:'💒 Inicio ceremonia', color:'indigo' },
            { h:infoGlobal.coctel_hora,            txt:'🥂 Cóctel',           color:'amber' },
            { h:infoGlobal.recepcion_hora,         txt:`🍽 ${infoGlobal.recepcion_tipo||'Recepción'}`, color:'orange' },
            { h:infoGlobal.barra_hora,             txt:'🎉 Barra libre',      color:'purple' },
            { h:infoGlobal.fin_boda,               txt:'🌙 Fin de boda',      color:'gray' },
          ].filter(x=>x.h).map((x,i)=>(
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-ink-3 w-11 text-right flex-shrink-0">{x.h}</span>
              <div className="flex-1 text-[10px] px-2 py-1 rounded bg-cream-dark text-ink-2 font-medium">{x.txt}</div>
            </div>
          ))}

          {/* Separador */}
          {allItems.length > 0 && <div className="border-t border-cream-dark my-2"/>}

          {/* Todos los items con hora */}
          {allItems.map((it,i)=>{
            const badge = getBadge(it.badge)
            const c = COL[it._color] || COL.gray
            return (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[9.5px] font-mono text-ink-3 w-11 text-right flex-shrink-0 pt-0.5">{it.hora}</span>
                <div className={`flex-1 text-[9.5px] px-2 py-1.5 rounded border leading-snug ${c.bg} ${c.border}`}>
                  {it.badge && <span className={`text-[8px] mr-1 px-1 rounded-sm ${badge.cls}`}>{badge.label}</span>}
                  <span className="font-medium text-inherit">{it.titulo}</span>
                  {it.ubicacion && <p className="opacity-60 flex items-center gap-0.5 mt-0.5"><MapPin size={8}/>{it.ubicacion.split(',')[0]}</p>}
                </div>
              </div>
            )
          })}

          {allItems.length === 0 && !Object.values(infoGlobal).some(v=>v) && (
            <p className="text-[10px] text-ink-3 text-center pt-4">Añade momentos con hora<br/>para ver el timeline</p>
          )}
        </div>
      </div>
    </div>
  )
}
