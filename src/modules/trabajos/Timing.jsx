import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  ArrowLeft, Plus, Trash2, Save, Check, ChevronDown, ChevronUp,
  MapPin, Phone, Link2, X, Eye, EyeOff, Zap, Clock, Star,
  AlignLeft, Users, Palette, BookOpen, Download, MoreHorizontal,
  GripVertical, AlertCircle, ChevronRight
} from 'lucide-react'

// ── SECCIONES BASE ────────────────────────────────────────────
const SECCIONES_BASE = [
  { id:'prep_novia',  titulo:'Preparativos novia',  color:'rose',   tipo:'momentos' },
  { id:'prep_novio',  titulo:'Preparativos novio',  color:'blue',   tipo:'momentos' },
  { id:'ceremonia',   titulo:'Ceremonia',            color:'indigo', tipo:'momentos' },
  { id:'traslado',    titulo:'Traslado',             color:'slate',  tipo:'momentos' },
  { id:'coctel',      titulo:'Cóctel',               color:'amber',  tipo:'momentos' },
  { id:'recepcion',   titulo:'Recepción / Banquete', color:'orange', tipo:'momentos' },
  { id:'barra_libre', titulo:'Barra libre & fiesta', color:'purple', tipo:'momentos' },
  { id:'shot_list',   titulo:'Shot list',            color:'teal',   tipo:'shotlist'  },
  { id:'proveedores', titulo:'Proveedores del día',  color:'green',  tipo:'proveedores' },
]

// Colores por sección
const C = {
  rose:   { bg:'#fff1f2', border:'#fecdd3', dot:'#f43f5e', head:'#be123c', badge:'bg-rose-100 text-rose-700',   dark:'#881337' },
  blue:   { bg:'#eff6ff', border:'#bfdbfe', dot:'#3b82f6', head:'#1d4ed8', badge:'bg-blue-100 text-blue-700',   dark:'#1e3a8a' },
  indigo: { bg:'#eef2ff', border:'#c7d2fe', dot:'#6366f1', head:'#4338ca', badge:'bg-indigo-100 text-indigo-700', dark:'#312e81' },
  slate:  { bg:'#f8fafc', border:'#e2e8f0', dot:'#64748b', head:'#475569', badge:'bg-slate-100 text-slate-600',  dark:'#1e293b' },
  amber:  { bg:'#fffbeb', border:'#fde68a', dot:'#f59e0b', head:'#b45309', badge:'bg-amber-100 text-amber-700',  dark:'#78350f' },
  orange: { bg:'#fff7ed', border:'#fed7aa', dot:'#f97316', head:'#c2410c', badge:'bg-orange-100 text-orange-700', dark:'#7c2d12' },
  purple: { bg:'#faf5ff', border:'#e9d5ff', dot:'#a855f7', head:'#7e22ce', badge:'bg-purple-100 text-purple-700', dark:'#4a1772' },
  teal:   { bg:'#f0fdfa', border:'#99f6e4', dot:'#14b8a6', head:'#0f766e', badge:'bg-teal-100 text-teal-700',    dark:'#134e4a' },
  green:  { bg:'#f0fdf4', border:'#bbf7d0', dot:'#22c55e', head:'#15803d', badge:'bg-green-100 text-green-700',  dark:'#14532d' },
}

// ── BADGES DISPONIBLES ────────────────────────────────────────
const BADGE_LIST = [
  { id:'yo',        label:'📷 Yo',          cls:'bg-brand/15 text-brand border-brand/30' },
  { id:'video',     label:'🎬 Vídeo',        cls:'bg-purple-100 text-purple-700 border-purple-200' },
  { id:'clave',     label:'⭐ Clave',        cls:'bg-amber-100 text-amber-700 border-amber-200' },
  { id:'2nd',       label:'📸 2º foto',      cls:'bg-teal-100 text-teal-700 border-teal-200' },
  { id:'wp',        label:'💼 W.Planner',   cls:'bg-pink-100 text-pink-700 border-pink-200' },
  { id:'dj',        label:'🎵 DJ/Música',   cls:'bg-violet-100 text-violet-700 border-violet-200' },
  { id:'familia',   label:'👨‍👩‍👧 Familia',      cls:'bg-green-100 text-green-700 border-green-200' },
  { id:'pareja',    label:'💑 Pareja',       cls:'bg-rose-100 text-rose-700 border-rose-200' },
  { id:'traslado',  label:'🚗 Traslado',    cls:'bg-slate-100 text-slate-600 border-slate-200' },
  { id:'ceremonia', label:'💒 Ceremonia',   cls:'bg-indigo-100 text-indigo-700 border-indigo-200' },
]
const getBadge = (id) => BADGE_LIST.find(b => b.id === id)

// ── PLANTILLAS RÁPIDAS ────────────────────────────────────────
const RAPIDOS = {
  prep_novia: [
    { titulo:'Llega el fotógrafo', badges:['yo'], hora:'09:00', contacto:'Ricardo / +34 606 110 337' },
    { titulo:'Llega el videógrafo', badges:['video'], hora:'' },
    { titulo:'Getting ready — detalles', badges:['clave','yo'], hora:'' },
    { titulo:'Fotos con la madre / madrinas', badges:['familia'], hora:'' },
    { titulo:'Salida hacia la ceremonia', badges:['traslado'], hora:'' },
  ],
  prep_novio: [
    { titulo:'Llega el 2º fotógrafo', badges:['2nd'], hora:'' },
    { titulo:'Getting ready novio', badges:['clave','2nd'], hora:'' },
    { titulo:'Fotos con el padre / padrinos', badges:['familia'], hora:'' },
    { titulo:'Salida hacia la ceremonia', badges:['traslado'], hora:'' },
  ],
  ceremonia: [
    { titulo:'Entrada de la novia', badges:['clave','ceremonia'], hora:'' },
    { titulo:'Inicio de la ceremonia', badges:['clave','ceremonia'], hora:'' },
    { titulo:'Intercambio de anillos', badges:['clave'], hora:'' },
    { titulo:'Primer beso como casados', badges:['clave'], hora:'' },
    { titulo:'Salida de los novios', badges:['clave','ceremonia'], hora:'' },
    { titulo:'Arroz / pétalos', badges:['clave'], hora:'' },
  ],
  coctel: [
    { titulo:'Llegada de los novios al cóctel', badges:['clave'], hora:'' },
    { titulo:'Entrega de ramos a las madres', badges:['clave','familia'], hora:'' },
    { titulo:'Música en directo', badges:['dj'], hora:'' },
    { titulo:'Sesión de pareja exterior', badges:['clave','pareja','yo'], hora:'' },
  ],
  recepcion: [
    { titulo:'Entrada de los novios al salón', badges:['clave'], hora:'' },
    { titulo:'Primer baile', badges:['clave'], hora:'' },
    { titulo:'Baile con los padres', badges:['familia'], hora:'' },
    { titulo:'Postres y tarta', badges:['clave'], hora:'' },
  ],
  barra_libre: [
    { titulo:'Inicio barra libre', badges:[], hora:'' },
    { titulo:'DJ / Ameniza', badges:['dj'], hora:'' },
    { titulo:'Bouquet / liga', badges:['clave'], hora:'' },
  ],
}

const normHora = (h) => h ? h.replace(/\./g, ':').replace(/\s*h\s*$/i, '').trim() : ''
const newItem = (overrides = {}) => ({ _id:`${Date.now()}-${Math.random()}`, hora:'', titulo:'', badges:[], notas:'', notas_internas:'', contacto:'', ubicacion:'', es_nota:false, ...overrides })
const newProv = () => ({ _id:`${Date.now()}-${Math.random()}`, nombre:'', tipo:'', contacto:'', telefono:'', instagram:'', notas:'' })
const newShot = () => ({ _id:`${Date.now()}-${Math.random()}`, titulo:'', notas:'' })

// ── GOOGLE PLACES ─────────────────────────────────────────────
function PlacesInput({ value, onChange, placeholder, className }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current || !window.google?.maps?.places) return
    const ac = new window.google.maps.places.Autocomplete(ref.current, {
      types:['establishment','geocode'], componentRestrictions:{country:'es'},
      fields:['formatted_address','name'],
    })
    const l = ac.addListener('place_changed', () => {
      const p = ac.getPlace()
      onChange(p.name ? `${p.name}${p.formatted_address ? ', '+p.formatted_address : ''}` : p.formatted_address || '')
    })
    return () => window.google.maps.event.removeListener(l)
  }, [])
  return <input ref={ref} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className={className}/>
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────
export default function Timing() {
  const { id } = useParams()
  const { user } = useAuth()
  const [trabajo, setTrabajo] = useState(null)
  const [provsCRM, setProvsCRM] = useState([])
  const [secciones, setSecciones] = useState([])
  const [infoGlobal, setInfoGlobal] = useState({ prep_hora_foto:'',prep_hora_video:'',prep_salida:'',ceremonia_hora:'',ceremonia_duracion:'',coctel_hora:'',recepcion_hora:'',recepcion_tipo:'Banquete',barra_hora:'',fin_boda:'',invitados_adultos:'',invitados_ninos:'',parking:'',obs:'', ves_novia:{vestido:'',disenador:'',zapatos:'',joyas:'',ramo:'',peluqueria:'',maquillaje:''}, ves_novio:{traje:'',disenador:'',zapatos:'',complementos:''} })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [timingId, setTimingId] = useState(null)
  const [tab, setTab] = useState('timeline')     // timeline | estilismo | directorio
  const [openSec, setOpenSec] = useState('prep_novia')
  const [vistaCliente, setVistaCliente] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [showRapidos, setShowRapidos] = useState(null)
  const [showProvCRM, setShowProvCRM] = useState(false)
  const [showBadgePicker, setShowBadgePicker] = useState(null) // itemId
  const [gLoaded, setGLoaded] = useState(false)
  const saveTimer = useRef(null)

  // Cargar Google Places
  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_PLACES_API_KEY
    if (!key || window.google?.maps?.places) { setGLoaded(true); return }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&language=es`
    s.async = true; s.onload = () => setGLoaded(true)
    document.head.appendChild(s)
  }, [])

  useEffect(() => { if (user && id) cargar() }, [user, id])

  async function cargar() {
    setLoading(true)
    const [{ data:t },{ data:tim },{ data:provs }] = await Promise.all([
      supabase.from('v2_trabajos').select('*').eq('id',id).eq('user_id',user.id).single(),
      supabase.from('v2_timings').select('*').eq('trabajo_id',id).single(),
      supabase.from('v2_proveedores').select('id,empresa,nombre,categoria,telefono,instagram').eq('user_id',user.id).is('deleted_at',null).order('empresa'),
    ])
    setTrabajo(t); setProvsCRM(provs||[])
    if (tim) {
      setTimingId(tim.id)
      const raw = tim.contenido || tim.eventos || []
      if (Array.isArray(raw) && raw.length > 0) {
        setSecciones(SECCIONES_BASE.map(base => {
          const f = raw.find(s => s.id === base.id)
          return { ...base, titulo:f?.titulo||base.titulo, color:f?.color||base.color, hora_inicio:f?.hora_inicio||'', hora_fin:f?.hora_fin||'', traslado_min:f?.traslado_min||'', ubicacion:f?.ubicacion||'', contacto_principal:f?.contacto_principal||'', items:(f?.items||[]).map(it=>({ ...it, hora:normHora(it.hora), badges:Array.isArray(it.badges)?it.badges:(it.badge?[it.badge]:[]), _id:`${Date.now()}-${Math.random()}` })) }
        }))
      } else setSecciones(initSecs(t))
      if (tim.info_global) setInfoGlobal(g=>({...g,...tim.info_global}))
    } else setSecciones(initSecs(t))
    setLoading(false)
  }

  function initSecs(t) {
    return SECCIONES_BASE.map(s => {
      const items = []
      if (s.id==='prep_novia') items.push(newItem({hora:normHora(t?.hora_inicio)||'09:00',titulo:'Llega el fotógrafo',badges:['yo'],contacto:'Ricardo Ferreiro / +34 606 110 337'}))
      if (s.id==='ceremonia'&&t?.hora_ceremonia) items.push(newItem({hora:normHora(t.hora_ceremonia),titulo:'Inicio ceremonia',badges:['clave','ceremonia'],ubicacion:t.lugar_ceremonia||''}))
      const ub = ['coctel','recepcion','barra_libre'].includes(s.id)?(t?.lugar||''):s.id==='ceremonia'?(t?.lugar_ceremonia||''):''
      return {...s, hora_inicio:'', hora_fin:'', traslado_min:'', ubicacion:ub, contacto_principal:'', items}
    })
  }

  // Autoguardar 2s después de cambiar
  function triggerSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => guardar(true), 2000)
  }

  // Mutaciones
  const updSec = (secId, campo, val) => { setSecciones(ss=>ss.map(s=>s.id!==secId?s:{...s,[campo]:val})); triggerSave() }
  const addItem = (secId, tpl={}) => { const n=newItem(tpl); setSecciones(ss=>ss.map(s=>s.id!==secId?s:{...s,items:[...s.items,n]})); setExpanded(n._id); setShowRapidos(null) }
  const addNota = (secId) => { const n=newItem({es_nota:true}); setSecciones(ss=>ss.map(s=>s.id!==secId?s:{...s,items:[...s.items,n]})); setExpanded(n._id) }
  const updItem = (secId, _id, k, v) => { setSecciones(ss=>ss.map(s=>s.id!==secId?s:{...s,items:s.items.map(it=>it._id!==_id?it:{...it,[k]:v})})); triggerSave() }
  const toggleBadge = (secId, _id, badge) => {
    setSecciones(ss=>ss.map(s=>s.id!==secId?s:{...s,items:s.items.map(it=>{
      if(it._id!==_id) return it
      const has=it.badges.includes(badge)
      return {...it,badges:has?it.badges.filter(b=>b!==badge):[...it.badges,badge]}
    })})); triggerSave()
  }
  const delItem = (secId, _id) => { setSecciones(ss=>ss.map(s=>s.id!==secId?s:{...s,items:s.items.filter(it=>it._id!==_id)})); triggerSave() }
  const moveItem = (secId, idx, dir) => {
    setSecciones(ss=>ss.map(s=>{
      if(s.id!==secId) return s
      const arr=[...s.items]; const to=idx+dir
      if(to<0||to>=arr.length) return s
      ;[arr[idx],arr[to]]=[arr[to],arr[idx]]
      return {...s,items:arr}
    })); triggerSave()
  }
  const delSec = (secId) => { if(window.confirm('¿Eliminar esta sección?')) { setSecciones(ss=>ss.filter(s=>s.id!==secId)); triggerSave() }}
  const setIG = (k,v) => { setInfoGlobal(g=>({...g,[k]:v})); triggerSave() }
  const setVN = (k,v) => { setInfoGlobal(g=>({...g,ves_novia:{...g.ves_novia,[k]:v}})); triggerSave() }
  const setVNovio = (k,v) => { setInfoGlobal(g=>({...g,ves_novio:{...g.ves_novio,[k]:v}})); triggerSave() }
  const addProvFromCRM = (p) => { setSecciones(ss=>ss.map(s=>s.id!=='proveedores'?s:{...s,items:[...s.items,{...newProv(),nombre:p.empresa||'',tipo:p.categoria||'',contacto:p.nombre||'',telefono:p.telefono||'',instagram:p.instagram||''}]})); setShowProvCRM(false) }

  async function guardar(auto=false) {
    if (!auto) setSaving(true)
    const payload = {
      trabajo_id:parseInt(id), user_id:user.id,
      contenido:secciones.map(s=>({id:s.id,tipo:s.tipo,titulo:s.titulo,color:s.color,hora_inicio:s.hora_inicio||'',hora_fin:s.hora_fin||'',traslado_min:s.traslado_min||'',ubicacion:s.ubicacion||'',contacto_principal:s.contacto_principal||'',items:(s.items||[]).map(({_id,...it})=>it)})),
      info_global:infoGlobal, notas:'',
    }
    if (timingId) await supabase.from('v2_timings').update(payload).eq('id',timingId)
    else { const {data}=await supabase.from('v2_timings').insert(payload).select().single(); if(data) setTimingId(data.id) }
    if (!auto) { setSaved(true); setTimeout(()=>setSaved(false),2000); setSaving(false) }
  }

  // PDF
  function generarPDF() {
    const fechaStr = trabajo?.fecha ? new Date(trabajo.fecha+'T00:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : ''
    const CMAP = { rose:'#f43f5e',blue:'#3b82f6',indigo:'#6366f1',slate:'#64748b',amber:'#f59e0b',orange:'#f97316',purple:'#a855f7',teal:'#14b8a6',green:'#22c55e' }
    const secsHtml = secciones.map(sec=>{
      const color = CMAP[sec.color]||'#6b7280'
      const items = (sec.items||[]).filter(it=>it.titulo)
      if (!items.length && !sec.ubicacion && !sec.hora_inicio) return ''
      const sorted = sec.tipo==='momentos' ? [...items].sort((a,b)=>(a.hora||'99:99').localeCompare(b.hora||'99:99')) : items
      const rows = sec.tipo==='momentos' ? sorted.map(it=>{
        const badgesHtml = (it.badges||[]).map(bid=>{ const b=getBadge(bid); return b?`<span style="font-size:9px;padding:2px 6px;border-radius:20px;background:#f3f4f6;color:#374151;margin-right:4px">${b.label}</span>`:'' }).join('')
        return `<tr>
          <td style="padding:7px 4px;vertical-align:top;width:50px;font-family:monospace;font-size:11px;color:#9ca3af;border-bottom:1px solid #f3f4f6;white-space:nowrap">${it.hora||''}</td>
          <td style="padding:7px 12px;border-bottom:1px solid #f3f4f6;border-left:2px solid ${color}33">
            ${it.es_nota?`<p style="font-size:12px;color:#6b7280;font-style:italic">${it.titulo}</p>`:
            `<div style="display:flex;align-items:center;flex-wrap:wrap;gap:3px">${badgesHtml}<span style="font-size:12.5px;font-weight:${(it.badges||[]).includes('clave')?'600':'400'};color:${(it.badges||[]).includes('clave')?'#1d4ed8':'#111827'}">${it.titulo}</span></div>`}
            ${it.notas&&!vistaCliente?`<p style="font-size:11px;color:#6b7280;margin:3px 0 0">${it.notas}</p>`:''}
            ${it.contacto?`<p style="font-size:11px;color:#9ca3af;margin:2px 0 0">📞 ${it.contacto}</p>`:''}
            ${it.ubicacion?`<p style="font-size:11px;color:#9ca3af;margin:2px 0 0">📍 ${it.ubicacion}</p>`:''}
          </td></tr>`
      }).join('') : sec.tipo==='shotlist' ? sorted.map(it=>`<tr><td colspan="2" style="padding:6px 12px;border-bottom:1px solid #f3f4f6;border-left:2px solid ${color}40"><span style="font-size:12px">☐ ${it.titulo}</span></td></tr>`).join('')
        : sorted.map(it=>`<tr><td colspan="2" style="padding:8px 12px;border-bottom:1px solid #f3f4f6"><strong style="font-size:12.5px">${it.nombre||''}</strong> <span style="color:#6b7280">${it.tipo?'· '+it.tipo:''}</span>${it.telefono?`<br><span style="font-size:11px;color:#3b82f6">📞 ${it.telefono}</span>`:''}</td></tr>`).join('')
      const hInfo = sec.hora_inicio||sec.hora_fin ? `<span style="font-size:11px;color:${color};margin-left:8px">${sec.hora_inicio||''}${sec.hora_fin?' – '+sec.hora_fin:''}</span>` : ''
      return `<div style="margin-bottom:18px;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;page-break-inside:avoid">
        <div style="background:${color}18;border-left:4px solid ${color};padding:9px 14px;display:flex;align-items:center;gap:8px">
          <span style="font-size:13px;font-weight:600;color:${color}">${sec.titulo}</span>${hInfo}
          ${sec.ubicacion?`<span style="font-size:11px;color:#6b7280;margin-left:auto">📍 ${sec.ubicacion.split(',')[0]}</span>`:''}
        </div>
        ${sec.traslado_min?`<div style="background:#fefce8;border-left:4px solid #eab308;padding:5px 14px;font-size:11px;color:#a16207">🚗 Traslado: ${sec.traslado_min} min</div>`:''}
        <table style="width:100%;border-collapse:collapse;background:white">${rows||'<tr><td colspan="2" style="padding:10px 14px;color:#9ca3af;font-size:12px">Sin eventos</td></tr>'}</table>
      </div>`
    }).join('')
    const igArr = [
      infoGlobal.prep_hora_foto&&`📷 Fotógrafo: <strong>${infoGlobal.prep_hora_foto}</strong>`,
      infoGlobal.prep_hora_video&&`🎬 Videógrafo: <strong>${infoGlobal.prep_hora_video}</strong>`,
      infoGlobal.ceremonia_hora&&`💒 Ceremonia: <strong>${infoGlobal.ceremonia_hora}</strong>${infoGlobal.ceremonia_duracion?' ('+infoGlobal.ceremonia_duracion+')':''}`,
      infoGlobal.coctel_hora&&`🥂 Cóctel: <strong>${infoGlobal.coctel_hora}</strong>`,
      infoGlobal.recepcion_hora&&`🍽 ${infoGlobal.recepcion_tipo||'Recepción'}: <strong>${infoGlobal.recepcion_hora}</strong>`,
      infoGlobal.barra_hora&&`🎉 Barra: <strong>${infoGlobal.barra_hora}</strong>`,
      infoGlobal.fin_boda&&`🌙 Fin: <strong>${infoGlobal.fin_boda}</strong>`,
      (infoGlobal.invitados_adultos||infoGlobal.invitados_ninos)&&`👥 <strong>${infoGlobal.invitados_adultos||'—'} adultos${infoGlobal.invitados_ninos?' + '+infoGlobal.invitados_ninos+' niños':''}`,
    ].filter(Boolean)
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Timing · ${trabajo?.titulo||''}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{max-width:800px;margin:0 auto;padding:36px 40px}.no-print{position:fixed;bottom:20px;right:20px}@media print{.no-print{display:none}@page{margin:1.5cm}.page{padding:20px 28px}}</style></head><body>
<div class="page">
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2.5px solid #000499">
  <div><p style="font-size:18px;font-weight:400;letter-spacing:.22em;text-transform:uppercase;color:#000499">FERREIRO</p><p style="font-size:10px;font-style:italic;color:#9ca3af;font-family:Georgia,serif">capturing moments</p></div>
  <div style="text-align:right"><p style="font-size:16px;font-weight:500">${trabajo?.titulo||''}</p><p style="font-size:12px;color:#6b7280;margin-top:2px;text-transform:capitalize">${fechaStr}</p>${trabajo?.lugar?`<p style="font-size:11px;color:#9ca3af">📍 ${trabajo.lugar}</p>`:''}</div>
</div>
${igArr.length?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:20px;padding:12px 14px;background:#f8f9ff;border-radius:8px;border:1px solid #e0e7ff">${igArr.map(f=>`<span style="font-size:11px;padding:3px 9px;background:white;border-radius:20px;border:1px solid #e5e7eb">${f}</span>`).join('')}</div>`:''}
${secsHtml}
<div style="margin-top:24px;padding-top:14px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af"><span>Ricardo Ferreiro Photography · +34 606 110 337 · ricardoferreiro.com</span><span>${new Date().toLocaleDateString('es-ES')}</span></div>
</div>
<div class="no-print"><button onclick="window.print()" style="background:#000499;color:white;border:none;padding:10px 20px;border-radius:8px;font-size:13px;cursor:pointer;box-shadow:0 4px 12px rgba(0,4,153,.3)">🖨 Guardar como PDF</button></div>
</body></html>`
    const w = window.open('','_blank','width=900,height=800')
    if (w) { w.document.write(html); w.document.close() }
  }

  // Todos los items ordenados para el panel lateral
  const allItems = secciones.filter(s=>s.tipo==='momentos').flatMap(s=>(s.items||[]).filter(it=>it.hora&&it.titulo&&!it.es_nota).map(it=>({...it,_sec:s.titulo,_color:s.color}))).sort((a,b)=>(a.hora||'').localeCompare(b.hora||''))

  const TabBtn = ({id,label}) => <button onClick={()=>setTab(id)} className={`px-4 py-2 text-sm transition-all border-b-2 ${tab===id?'border-brand text-brand font-medium':'border-transparent text-ink-3 hover:text-ink'}`}>{label}</button>

  if (loading) return <div className="flex items-center justify-center h-64 text-sm text-ink-3">Cargando timing…</div>

  return (
    <div className="flex flex-col md:flex-row bg-cream" style={{minHeight:'calc(100vh - 110px)'}}>

      {/* ══ PANEL IZQUIERDO ══ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-cream-dark bg-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Link to={`/trabajos/${id}`} className="text-ink-3 hover:text-ink"><ArrowLeft size={16}/></Link>
            <div>
              <p className="text-[14px] font-medium text-ink leading-none">{trabajo?.titulo}</p>
              <p className="text-[11px] text-ink-3 mt-0.5 capitalize">
                {trabajo?.fecha?new Date(trabajo.fecha+'T00:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'}):''}{trabajo?.lugar?` · ${trabajo.lugar}`:''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={()=>setVistaCliente(!vistaCliente)}
              className={`btn-ghost text-xs gap-1 ${vistaCliente?'text-brand bg-brand/[.06]':''}`}>
              {vistaCliente?<><EyeOff size={12}/><span className="hidden sm:inline"> Editar</span></>:<><Eye size={12}/><span className="hidden sm:inline"> Vista cliente</span></>}
            </button>
            <button onClick={generarPDF} className="btn-ghost text-xs gap-1"><Download size={12}/><span className="hidden sm:inline"> PDF</span></button>
            <button onClick={()=>guardar()} disabled={saving}
              className={`btn-primary text-xs ${saved?'bg-emerald-600':''}`}>
              {saved?<><Check size={12}/> Guardado</>:saving?'…':<><Save size={12}/><span className="hidden sm:inline"> Guardar</span></>}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-cream-dark bg-white flex-shrink-0 px-2">
          <TabBtn id="timeline" label="⏱ Timeline"/>
          <TabBtn id="estilismo" label="👗 Estilismo"/>
          <TabBtn id="directorio" label="📋 Directorio"/>
        </div>

        {/* ── TAB TIMELINE ── */}
        {tab==='timeline' && (
          <div className="flex-1 overflow-auto">

            {/* Info global */}
            <details className="border-b border-cream-dark bg-white flex-shrink-0 group">
              <summary className="flex items-center gap-2 px-5 py-2.5 cursor-pointer text-xs font-medium text-ink-2 select-none list-none hover:bg-cream/50">
                <AlertCircle size={13} className="text-ink-3"/>
                Datos generales · horas clave y logística
                <ChevronRight size={12} className="text-ink-3 ml-auto group-open:rotate-90 transition-transform"/>
              </summary>
              <div className="px-4 pb-4 pt-1 bg-cream/30">
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
                  {[{k:'prep_hora_foto',l:'📷 Fotógrafo',t:'time'},{k:'prep_hora_video',l:'🎬 Videógrafo',t:'time'},{k:'prep_salida',l:'🚗 Salen',t:'time'},{k:'ceremonia_hora',l:'💒 Ceremonia',t:'time'},{k:'coctel_hora',l:'🥂 Cóctel',t:'time'},{k:'recepcion_hora',l:'🍽 Recepción',t:'time'},{k:'barra_hora',l:'🎉 Barra libre',t:'time'},{k:'fin_boda',l:'🌙 Fin de boda',t:'time'},{k:'invitados_adultos',l:'👥 Adultos',t:'number'},{k:'invitados_ninos',l:'🧒 Niños',t:'number'},{k:'parking',l:'🅿 Parking',t:'text'},{k:'obs',l:'📝 Obs.',t:'text'}].map(f=>(
                    <div key={f.k}>
                      <label className="label text-[9.5px]">{f.l}</label>
                      <input type={f.t} value={infoGlobal[f.k]||''} onChange={e=>setIG(f.k,e.target.value)} className="input text-xs py-1.5"/>
                    </div>
                  ))}
                </div>
              </div>
            </details>

            {/* Secciones */}
            {secciones.map(sec => {
              const c = C[sec.color]||C.slate
              const isOpen = openSec === sec.id
              const items = sec.items||[]
              const claves = items.filter(it=>(it.badges||[]).includes('clave')).length
              const rapidos = RAPIDOS[sec.id]||[]

              return (
                <div key={sec.id} className="border-b border-cream-dark">

                  {/* Header sección */}
                  <div className="flex items-center group/sec" style={{background:isOpen?c.bg:'transparent'}}>
                    <button onClick={()=>setOpenSec(isOpen?null:sec.id)}
                      className="flex items-center gap-2.5 px-4 md:px-5 py-3 flex-1 min-w-0 text-left"
                      style={{borderLeft:`3px solid ${isOpen?c.dot:'transparent'}`}}>
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:c.dot}}/>
                      {isOpen&&!vistaCliente ? (
                        <input value={sec.titulo} onChange={e=>updSec(sec.id,'titulo',e.target.value)}
                          onClick={e=>e.stopPropagation()}
                          className="text-[13px] font-semibold bg-transparent border-0 outline-none flex-1 min-w-0"
                          style={{color:c.head}}/>
                      ) : (
                        <span className="text-[13px] font-semibold flex-1 truncate" style={{color:isOpen?c.head:'#374151'}}>{sec.titulo}</span>
                      )}
                      {/* Horas sección */}
                      {(sec.hora_inicio||sec.hora_fin)&&(
                        <span className="text-[10px] font-mono mr-1 flex-shrink-0" style={{color:c.head}}>
                          {sec.hora_inicio||'—'}{sec.hora_fin?' – '+sec.hora_fin:''}
                        </span>
                      )}
                      <span className="text-[10px] text-ink-3 flex-shrink-0">{items.length}{claves>0?` · ⭐${claves}`:''}</span>
                      {isOpen?<ChevronUp size={13} className="text-ink-3 flex-shrink-0 ml-1"/>:<ChevronDown size={13} className="text-ink-3 flex-shrink-0 ml-1"/>}
                    </button>
                    {!vistaCliente&&(
                      <button onClick={()=>delSec(sec.id)}
                        className="px-3 py-3 text-ink-3 hover:text-red-500 opacity-0 group-hover/sec:opacity-100 transition-all flex-shrink-0">
                        <Trash2 size={12}/>
                      </button>
                    )}
                  </div>

                  {isOpen&&(
                    <div className="pb-3" style={{background:c.bg+'80'}}>

                      {/* Campos sección */}
                      {!vistaCliente&&sec.tipo==='momentos'&&(
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-4 md:px-5 pt-3 pb-2">
                          <div>
                            <label className="label text-[9.5px]">📍 Ubicación</label>
                            {gLoaded ? <PlacesInput value={sec.ubicacion||''} onChange={v=>updSec(sec.id,'ubicacion',v)} placeholder="Buscar lugar…" className="input text-xs py-1.5"/> : <input value={sec.ubicacion||''} onChange={e=>updSec(sec.id,'ubicacion',e.target.value)} className="input text-xs py-1.5" placeholder="Lugar"/>}
                          </div>
                          <div>
                            <label className="label text-[9.5px]">📞 Contacto principal</label>
                            <input value={sec.contacto_principal||''} onChange={e=>updSec(sec.id,'contacto_principal',e.target.value)} className="input text-xs py-1.5" placeholder="Nombre / teléfono"/>
                          </div>
                          <div>
                            <label className="label text-[9.5px]">⏰ Hora inicio</label>
                            <input type="time" value={sec.hora_inicio||''} onChange={e=>updSec(sec.id,'hora_inicio',e.target.value)} className="input text-xs py-1.5"/>
                          </div>
                          <div>
                            <label className="label text-[9.5px]">⏰ Hora fin · 🚗 Traslado (min)</label>
                            <div className="flex gap-1.5">
                              <input type="time" value={sec.hora_fin||''} onChange={e=>updSec(sec.id,'hora_fin',e.target.value)} className="input text-xs py-1.5 flex-1"/>
                              <input type="number" value={sec.traslado_min||''} onChange={e=>updSec(sec.id,'traslado_min',e.target.value)} className="input text-xs py-1.5 w-16" placeholder="min"/>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Info sección en vista cliente */}
                      {vistaCliente&&(sec.ubicacion||sec.contacto_principal||sec.hora_inicio)&&(
                        <div className="flex flex-wrap gap-3 px-5 pt-2 pb-1 text-xs text-ink-3">
                          {sec.hora_inicio&&<span className="flex items-center gap-1"><Clock size={10}/>{sec.hora_inicio}{sec.hora_fin?' – '+sec.hora_fin:''}</span>}
                          {sec.ubicacion&&<span className="flex items-center gap-1"><MapPin size={10}/>{sec.ubicacion}</span>}
                          {sec.contacto_principal&&<span className="flex items-center gap-1"><Phone size={10}/>{sec.contacto_principal}</span>}
                        </div>
                      )}

                      {/* Traslado badge */}
                      {sec.traslado_min&&(
                        <div className="mx-5 mb-2 px-3 py-1.5 rounded-lg text-xs font-medium" style={{background:'#fef9c3',color:'#a16207',border:'1px solid #fde68a'}}>
                          🚗 Traslado hacia esta sección: {sec.traslado_min} min
                        </div>
                      )}

                      {/* ── ITEMS MOMENTOS ── */}
                      {sec.tipo==='momentos'&&(
                        <div className="px-4 md:px-5 space-y-1">
                          {/* Línea timeline */}
                          <div className="relative" style={{paddingLeft:'72px'}}>
                            {items.length>0&&<div className="absolute top-2 bottom-2 w-px" style={{left:'52px',background:c.border}}/>}
                            {(vistaCliente ? [...items].filter(it=>!it.es_nota||it.notas).sort((a,b)=>(a.hora||'99').localeCompare(b.hora||'99')) : items)
                              .map((item,idx)=>{
                                const isExp = expanded===item._id
                                const isNota = item.es_nota
                                const isClave = (item.badges||[]).includes('clave')
                                return (
                                  <div key={item._id} className="relative group mb-1.5">
                                    {/* Hora */}
                                    <div className="absolute" style={{left:'-72px',width:'48px',top:'8px'}}>
                                      {!vistaCliente&&!isNota ? (
                                        <input value={item.hora||''}
                                          onChange={e=>updItem(sec.id,item._id,'hora',e.target.value.replace(/\./g,':').replace(/[^0-9:]/g,''))}
                                          className="w-full text-right text-[11px] font-mono font-medium bg-transparent border-0 outline-none p-0"
                                          style={{color:c.head}}
                                          placeholder="09:00"/>
                                      ) : !isNota ? (
                                        <span className="block text-right text-[11px] font-mono font-medium" style={{color:c.head}}>{item.hora||'—'}</span>
                                      ) : null}
                                    </div>

                                    {/* Punto en línea */}
                                    {!isNota&&<div className="absolute w-3 h-3 rounded-full border-2 border-white z-10" style={{left:'-18px',top:'10px',background:isClave?c.dot:item.hora?c.dot:'#d1d5db'}}/>}

                                    {/* Tarjeta item */}
                                    <div className={`rounded-lg border transition-all ${isExp&&!vistaCliente?'shadow-sm':''}
                                      ${isNota?'border-dashed':'border-solid'}
                                      ${isClave&&!isNota?'border-l-2':''}
                                    `}
                                      style={{
                                        background: isNota ? c.bg+'40' : isExp ? c.bg : 'white',
                                        borderColor: isNota ? c.border : isExp ? c.dot+'66' : '#e5e7eb',
                                        borderLeftColor: isClave&&!isNota ? c.dot : undefined,
                                      }}>

                                      <div className="flex items-center gap-2 px-3 py-2">
                                        {/* Reordenar */}
                                        {!vistaCliente&&!isNota&&(
                                          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                            <button onClick={()=>moveItem(sec.id,idx,-1)} disabled={idx===0} className="text-[8px] text-ink-3 hover:text-ink disabled:opacity-20 leading-none">▲</button>
                                            <button onClick={()=>moveItem(sec.id,idx,1)} disabled={idx===items.length-1} className="text-[8px] text-ink-3 hover:text-ink disabled:opacity-20 leading-none">▼</button>
                                          </div>
                                        )}

                                        {/* Icono nota */}
                                        {isNota&&<AlignLeft size={12} className="text-ink-3 flex-shrink-0"/>}

                                        {/* Badges */}
                                        {!isNota&&(
                                          <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
                                            {(item.badges||[]).map(bid=>{
                                              const b=getBadge(bid); if(!b) return null
                                              return (
                                                <span key={bid}
                                                  onClick={()=>!vistaCliente&&toggleBadge(sec.id,item._id,bid)}
                                                  className={`text-[9.5px] px-1.5 py-0.5 rounded-full border font-medium leading-none cursor-pointer select-none ${b.cls}`}>
                                                  {b.label}
                                                </span>
                                              )
                                            })}
                                            {/* Añadir badge */}
                                            {!vistaCliente&&showBadgePicker===item._id&&(
                                              <div className="absolute z-50 bg-white border border-brand/15 rounded-xl shadow-2xl p-2 grid grid-cols-2 gap-1" style={{top:'100%',left:0,minWidth:'220px'}}>
                                                {BADGE_LIST.map(b=>(
                                                  <button key={b.id} onClick={()=>toggleBadge(sec.id,item._id,b.id)}
                                                    className={`text-left text-xs px-2.5 py-1.5 rounded-lg border transition-all ${(item.badges||[]).includes(b.id)?b.cls+' font-medium':'bg-cream hover:bg-brand/[.05] text-ink-2 border-transparent'}`}>
                                                    {b.label}
                                                  </button>
                                                ))}
                                                <button onClick={()=>setShowBadgePicker(null)} className="col-span-2 text-xs text-ink-3 hover:text-ink pt-1 border-t border-cream-dark mt-1">Cerrar</button>
                                              </div>
                                            )}
                                            {!vistaCliente&&(
                                              <button onClick={()=>setShowBadgePicker(showBadgePicker===item._id?null:item._id)}
                                                className="w-5 h-5 rounded-full bg-cream-dark hover:bg-brand/10 flex items-center justify-center text-ink-3 hover:text-brand transition-all text-[10px] font-bold">
                                                {(item.badges||[]).length>0?'+':'#'}
                                              </button>
                                            )}
                                          </div>
                                        )}

                                        {/* Título */}
                                        {!vistaCliente ? (
                                          <input value={item.titulo||''} onChange={e=>updItem(sec.id,item._id,'titulo',e.target.value)}
                                            className="flex-1 text-sm bg-transparent border-0 outline-none min-w-0 placeholder-ink-3"
                                            style={{fontWeight:isClave?'600':'400', color:isClave?c.head:'#111827'}}
                                            placeholder={isNota?'Nota interna o recordatorio…':'Descripción del momento…'}/>
                                        ) : (
                                          <span className={`flex-1 text-sm ${isClave?'font-semibold':''}`} style={{color:isClave?c.head:'#111827'}}>{item.titulo}</span>
                                        )}

                                        {/* Estrella clave */}
                                        {!vistaCliente&&!isNota&&(
                                          <button onClick={()=>toggleBadge(sec.id,item._id,'clave')}
                                            className={`flex-shrink-0 transition-all ${(item.badges||[]).includes('clave')?'text-amber-400':'text-ink-3 hover:text-amber-300 opacity-0 group-hover:opacity-100'}`}>
                                            <Star size={13} fill={(item.badges||[]).includes('clave')?'currentColor':'none'}/>
                                          </button>
                                        )}

                                        {/* Botón detalles / eliminar */}
                                        {!vistaCliente&&(
                                          <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={()=>setExpanded(isExp?null:item._id)}
                                              className={`text-[10px] px-2 py-0.5 rounded transition-all ${isExp?'text-brand bg-brand/10':'text-ink-3 hover:text-brand hover:bg-brand/[.06]'}`}>
                                              {isExp?'▲':'▼'}
                                            </button>
                                            <button onClick={()=>delItem(sec.id,item._id)} className="text-ink-3 hover:text-red-500 p-0.5"><Trash2 size={11}/></button>
                                          </div>
                                        )}
                                        {/* Vista cliente: expandir si tiene detalles */}
                                        {vistaCliente&&(item.notas||item.contacto||item.ubicacion)&&(
                                          <button onClick={()=>setExpanded(isExp?null:item._id)} className="text-ink-3 hover:text-ink flex-shrink-0">
                                            <ChevronRight size={12} className={isExp?'rotate-90 transition-transform':'transition-transform'}/>
                                          </button>
                                        )}
                                      </div>

                                      {/* Panel expandido */}
                                      {isExp&&(
                                        <div className="border-t px-3 py-3" style={{borderColor:c.border+'80'}}>
                                          {!vistaCliente ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                              <div>
                                                <label className="label text-[9.5px]">Notas públicas (el cliente las ve)</label>
                                                <textarea value={item.notas||''} onChange={e=>updItem(sec.id,item._id,'notas',e.target.value)}
                                                  className="input text-xs resize-none py-1.5 w-full" rows={2} placeholder="Detalles para la pareja…"/>
                                              </div>
                                              <div>
                                                <label className="label text-[9.5px]">🔒 Notas internas (solo tú)</label>
                                                <textarea value={item.notas_internas||''} onChange={e=>updItem(sec.id,item._id,'notas_internas',e.target.value)}
                                                  className="input text-xs resize-none py-1.5 w-full bg-amber-50 border-amber-200" rows={2} placeholder="Logística, recordatorios…"/>
                                              </div>
                                              <div>
                                                <label className="label text-[9.5px]">📞 Contacto</label>
                                                <input value={item.contacto||''} onChange={e=>updItem(sec.id,item._id,'contacto',e.target.value)} className="input text-xs py-1.5" placeholder="Nombre / teléfono"/>
                                              </div>
                                              <div>
                                                <label className="label text-[9.5px]">📍 Ubicación específica</label>
                                                {gLoaded
                                                  ? <PlacesInput value={item.ubicacion||''} onChange={v=>updItem(sec.id,item._id,'ubicacion',v)} placeholder="Buscar dirección…" className="input text-xs py-1.5"/>
                                                  : <input value={item.ubicacion||''} onChange={e=>updItem(sec.id,item._id,'ubicacion',e.target.value)} className="input text-xs py-1.5" placeholder="Dirección"/>}
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="space-y-1 text-xs">
                                              {item.notas&&<p className="text-ink-2 leading-relaxed">{item.notas}</p>}
                                              {item.contacto&&<p className="text-ink-3 flex items-center gap-1"><Phone size={10}/>{item.contacto}</p>}
                                              {item.ubicacion&&<p className="text-ink-3 flex items-center gap-1"><MapPin size={10}/>{item.ubicacion}</p>}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )
                              })
                            }
                          </div>

                          {/* Botones añadir */}
                          {!vistaCliente&&(
                            <div className="flex gap-2 mt-2 pl-0" style={{paddingLeft:'72px'}}>
                              <button onClick={()=>addItem(sec.id)}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-dashed border-gray-200 hover:border-gray-400 text-ink-3 hover:text-ink transition-all">
                                <Plus size={11}/> Evento
                              </button>
                              <button onClick={()=>addNota(sec.id)}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-dashed border-gray-200 hover:border-amber-300 text-ink-3 hover:text-amber-600 transition-all">
                                <Star size={11}/> Nota
                              </button>
                              {rapidos.length>0&&(
                                <div className="relative">
                                  <button onClick={()=>setShowRapidos(showRapidos===sec.id?null:sec.id)}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-dashed border-gray-200 hover:border-brand/40 text-ink-3 hover:text-brand transition-all whitespace-nowrap">
                                    <Zap size={11}/> Rápido
                                  </button>
                                  {showRapidos===sec.id&&(
                                    <div className="absolute bottom-[calc(100%+4px)] left-0 bg-white border border-brand/15 rounded-xl shadow-2xl py-1.5 w-72" style={{zIndex:999}}>
                                      {rapidos.map((r,i)=>(
                                        <button key={i} onClick={()=>addItem(sec.id,{...r,badges:r.badges||[]})}
                                          className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-brand/[.05] flex items-center gap-2">
                                          <div className="flex gap-1 flex-wrap">
                                            {(r.badges||[]).map(bid=>{ const b=getBadge(bid); return b?<span key={bid} className={`text-[8.5px] px-1.5 py-0.5 rounded-full border ${b.cls}`}>{b.label}</span>:null })}
                                          </div>
                                          <span className="text-ink flex-1">{r.titulo}</span>
                                          {r.hora&&<span className="text-ink-3 font-mono flex-shrink-0">{r.hora}</span>}
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
                      {sec.tipo==='shotlist'&&(
                        <div className="px-5 space-y-1.5">
                          {(sec.items||[]).map(item=>(
                            <div key={item._id} className="flex items-start gap-2.5 group">
                              <div className="w-4 h-4 rounded border-2 mt-0.5 flex-shrink-0" style={{borderColor:c.dot}}/>
                              {!vistaCliente ? (
                                <div className="flex-1 grid grid-cols-2 gap-2">
                                  <input value={item.titulo||''} onChange={e=>updItem(sec.id,item._id,'titulo',e.target.value)} className="input text-sm py-1.5" placeholder="Foto imprescindible…"/>
                                  <input value={item.notas||''} onChange={e=>updItem(sec.id,item._id,'notas',e.target.value)} className="input text-sm py-1.5" placeholder="Detalles, personas…"/>
                                </div>
                              ) : (
                                <div><p className="text-sm text-ink">{item.titulo}</p>{item.notas&&<p className="text-xs text-ink-3">{item.notas}</p>}</div>
                              )}
                              {!vistaCliente&&<button onClick={()=>delItem(sec.id,item._id)} className="text-ink-3 hover:text-red-500 opacity-0 group-hover:opacity-100 mt-0.5"><Trash2 size={12}/></button>}
                            </div>
                          ))}
                          {!vistaCliente&&<button onClick={()=>addItem(sec.id,{})} className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-dashed border-gray-200 hover:border-teal-300 hover:bg-teal-50 text-ink-3 hover:text-teal-700 transition-all"><Plus size={11}/> Añadir foto</button>}
                        </div>
                      )}

                      {/* ── PROVEEDORES ── */}
                      {sec.tipo==='proveedores'&&(
                        <div className="px-5 space-y-2">
                          {(sec.items||[]).map(prov=>(
                            <div key={prov._id} className="card p-3 group">
                              {!vistaCliente ? (
                                <div className="grid grid-cols-3 gap-2">
                                  <input value={prov.nombre||''} onChange={e=>updItem(sec.id,prov._id,'nombre',e.target.value)} className="input text-xs py-1.5" placeholder="Empresa / nombre"/>
                                  <input value={prov.tipo||''} onChange={e=>updItem(sec.id,prov._id,'tipo',e.target.value)} className="input text-xs py-1.5" placeholder="Tipo (DJ, Vídeo…)"/>
                                  <input value={prov.contacto||''} onChange={e=>updItem(sec.id,prov._id,'contacto',e.target.value)} className="input text-xs py-1.5" placeholder="Contacto"/>
                                  <input value={prov.telefono||''} onChange={e=>updItem(sec.id,prov._id,'telefono',e.target.value)} className="input text-xs py-1.5" placeholder="📞 Teléfono"/>
                                  <input value={prov.instagram||''} onChange={e=>updItem(sec.id,prov._id,'instagram',e.target.value)} className="input text-xs py-1.5" placeholder="📸 Instagram"/>
                                  <input value={prov.notas||''} onChange={e=>updItem(sec.id,prov._id,'notas',e.target.value)} className="input text-xs py-1.5" placeholder="Notas"/>
                                  <button onClick={()=>delItem(sec.id,prov._id)} className="col-span-3 flex items-center justify-end gap-1 text-[10px] text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10}/> Eliminar</button>
                                </div>
                              ) : (
                                <div><p className="text-sm font-medium text-ink">{prov.nombre} <span className="text-ink-3 font-normal text-xs">{prov.tipo?'· '+prov.tipo:''}</span></p>
                                  {prov.contacto&&<p className="text-xs text-ink-2 mt-0.5">{prov.contacto}</p>}
                                  <div className="flex gap-3 mt-1 flex-wrap">
                                    {prov.telefono&&<a href={`tel:${prov.telefono}`} className="text-xs text-brand flex items-center gap-1 hover:underline"><Phone size={10}/>{prov.telefono}</a>}
                                    {prov.instagram&&<a href={`https://instagram.com/${prov.instagram.replace('@','')}`} target="_blank" rel="noreferrer" className="text-xs text-brand flex items-center gap-1 hover:underline"><Link2 size={10}/>@{prov.instagram.replace('@','')}</a>}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                          {!vistaCliente&&(
                            <div className="flex gap-2">
                              <button onClick={()=>addItem(sec.id,{})} className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-dashed border-gray-200 hover:border-green-300 hover:bg-green-50 text-ink-3 hover:text-green-700 transition-all"><Plus size={11}/> Añadir</button>
                              <div className="relative">
                                <button onClick={()=>setShowProvCRM(!showProvCRM)} className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-dashed border-gray-200 hover:border-brand/30 hover:bg-brand/[.04] text-ink-3 hover:text-brand transition-all whitespace-nowrap">Del CRM <ChevronDown size={11}/></button>
                                {showProvCRM&&(
                                  <div className="absolute bottom-full mb-1 right-0 bg-white border border-brand/15 rounded-xl shadow-2xl z-30 w-64 max-h-52 overflow-auto py-1.5">
                                    {provsCRM.length===0?<p className="text-xs text-ink-3 px-4 py-2">Sin proveedores</p>:provsCRM.map(p=>(
                                      <button key={p.id} onClick={()=>addProvFromCRM(p)} className="w-full text-left px-4 py-2 text-xs hover:bg-brand/[.05] flex justify-between">
                                        <span className="font-medium text-ink">{p.empresa}</span><span className="text-ink-3 text-[10px]">{p.categoria}</span>
                                      </button>
                                    ))}
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

            {/* Añadir sección */}
            {!vistaCliente&&(
              <div className="p-4 md:p-5">
                <button onClick={()=>{
                  const titulo = prompt('Nombre de la nueva sección:')
                  if (!titulo?.trim()) return
                  const colors = ['rose','blue','indigo','slate','amber','orange','purple','teal','green']
                  const newSec = { id:`custom_${Date.now()}`, titulo:titulo.trim(), color:colors[secciones.length%colors.length], tipo:'momentos', hora_inicio:'', hora_fin:'', traslado_min:'', ubicacion:'', contacto_principal:'', items:[] }
                  setSecciones(ss=>[...ss,newSec]); setOpenSec(newSec.id); triggerSave()
                }} className="flex items-center gap-2 text-xs text-ink-3 hover:text-brand transition-colors">
                  <Plus size={13}/> Añadir sección personalizada
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB ESTILISMO ── */}
        {tab==='estilismo'&&(
          <div className="flex-1 overflow-auto p-4 md:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Novia */}
              <div className="card p-5" style={{borderLeft:'3px solid #f43f5e'}}>
                <p className="text-sm font-semibold text-rose-700 mb-4">👰 Novia</p>
                <div className="space-y-3">
                  {[{k:'vestido',l:'Vestido'},{k:'disenador',l:'Diseñador / Marca'},{k:'zapatos',l:'Zapatos'},{k:'joyas',l:'Joyas / Accesorios'},{k:'ramo',l:'Ramo'},{k:'peluqueria',l:'Peluquería (profesional / estilo)'},{k:'maquillaje',l:'Maquillaje (profesional / estilo)'}].map(f=>(
                    <div key={f.k}>
                      <label className="label">{f.l}</label>
                      <input value={infoGlobal.ves_novia?.[f.k]||''} onChange={e=>setVN(f.k,e.target.value)} className="input text-sm" placeholder={f.l}/>
                    </div>
                  ))}
                </div>
              </div>
              {/* Novio */}
              <div className="card p-5" style={{borderLeft:'3px solid #3b82f6'}}>
                <p className="text-sm font-semibold text-blue-700 mb-4">🤵 Novio</p>
                <div className="space-y-3">
                  {[{k:'traje',l:'Traje'},{k:'disenador',l:'Diseñador / Marca'},{k:'zapatos',l:'Zapatos'},{k:'complementos',l:'Complementos (corbata, pañuelo…)'}].map(f=>(
                    <div key={f.k}>
                      <label className="label">{f.l}</label>
                      <input value={infoGlobal.ves_novio?.[f.k]||''} onChange={e=>setVNovio(f.k,e.target.value)} className="input text-sm" placeholder={f.l}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB DIRECTORIO ── */}
        {tab==='directorio'&&(
          <div className="flex-1 overflow-auto p-4 md:p-5">
            <p className="text-xs text-ink-3 mb-4">Vista rápida de todos los proveedores del timing</p>
            <div className="space-y-2">
              {secciones.find(s=>s.id==='proveedores')?.items?.filter(p=>p.nombre).map((p,i)=>(
                <div key={p._id||i} className="card p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-100 text-green-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">{p.nombre?.slice(0,2).toUpperCase()}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">{p.nombre} <span className="text-xs text-ink-3 font-normal">{p.tipo?'· '+p.tipo:''}</span></p>
                    {p.contacto&&<p className="text-xs text-ink-2 mt-0.5">{p.contacto}</p>}
                    <div className="flex gap-3 mt-1 flex-wrap">
                      {p.telefono&&<a href={`tel:${p.telefono}`} className="text-xs text-brand hover:underline flex items-center gap-1"><Phone size={10}/>{p.telefono}</a>}
                      {p.instagram&&<a href={`https://instagram.com/${p.instagram.replace('@','')}`} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline flex items-center gap-1"><Link2 size={10}/>@{p.instagram.replace('@','')}</a>}
                    </div>
                    {p.notas&&<p className="text-xs text-ink-3 mt-0.5 italic">{p.notas}</p>}
                  </div>
                </div>
              ))||[]}
              {!secciones.find(s=>s.id==='proveedores')?.items?.some(p=>p.nombre)&&(
                <div className="text-center py-8 text-sm text-ink-3">
                  <p>Sin proveedores añadidos aún</p>
                  <button onClick={()=>{setTab('timeline');setOpenSec('proveedores')}} className="text-brand text-xs mt-2 hover:underline">Ir a la sección Proveedores →</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══ PANEL DERECHO: TIMELINE ══ */}
      <div className="w-full md:w-1/3 border-t md:border-t-0 md:border-l border-brand/[.08] flex flex-col bg-white md:max-h-none max-h-64">
        <div className="px-4 py-3 border-b border-cream-dark flex-shrink-0">
          <p className="text-[11px] font-medium text-ink-2">Timeline del día</p>
          {trabajo?.fecha&&<p className="text-[9.5px] text-ink-3 mt-0.5 capitalize">{new Date(trabajo.fecha+'T00:00').toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'})}{trabajo?.lugar?` · ${trabajo.lugar}`:''}</p>}
        </div>
        <div className="flex-1 overflow-auto py-3 px-3">
          {/* Horas clave info global */}
          <div className="space-y-0.5 mb-2">
            {[
              {h:infoGlobal.prep_hora_foto,t:'📷 Fotógrafo'},
              {h:infoGlobal.prep_hora_video,t:'🎬 Videógrafo'},
              {h:infoGlobal.ceremonia_hora,t:'💒 Ceremonia'},
              {h:infoGlobal.coctel_hora,t:'🥂 Cóctel'},
              {h:infoGlobal.recepcion_hora,t:`🍽 ${infoGlobal.recepcion_tipo||'Recepción'}`},
              {h:infoGlobal.barra_hora,t:'🎉 Barra libre'},
              {h:infoGlobal.fin_boda,t:'🌙 Fin'},
            ].filter(x=>x.h).map((x,i)=>(
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-medium text-ink-3 w-11 text-right flex-shrink-0">{x.h}</span>
                <div className="flex-1 text-[10px] px-2 py-1 rounded bg-brand/[.06] text-brand font-medium truncate">{x.t}</div>
              </div>
            ))}
          </div>
          {allItems.length>0&&<div className="border-t border-cream-dark my-2"/>}
          {/* Items */}
          <div className="space-y-0.5">
            {allItems.map((it,i)=>{
              const c2 = C[it._color]||C.slate
              const isClave = (it.badges||[]).includes('clave')
              const badgesRow = (it.badges||[]).filter(b=>b!=='clave').slice(0,2)
              return (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[9.5px] font-mono text-ink-3 w-11 text-right flex-shrink-0 pt-1">{it.hora}</span>
                  <div className="flex-1 px-2 py-1.5 rounded-lg border text-[9.5px] leading-snug"
                    style={{background:c2.bg,borderColor:c2.border,borderLeftWidth:isClave?'3px':'1px',borderLeftColor:isClave?c2.dot:c2.border}}>
                    {badgesRow.map(bid=>{ const b=getBadge(bid); return b?<span key={bid} className={`text-[8px] px-1 rounded mr-0.5 border ${b.cls}`}>{b.label}</span>:null })}
                    <span className={`${isClave?'font-semibold':''}`} style={{color:isClave?c2.head:'#1f2937'}}>{it.titulo}</span>
                    {it.ubicacion&&<p className="text-[8.5px] opacity-60 mt-0.5 flex items-center gap-0.5"><MapPin size={8}/>{it.ubicacion.split(',')[0]}</p>}
                  </div>
                </div>
              )
            })}
            {allItems.length===0&&<p className="text-[10px] text-ink-3 text-center pt-4">Añade momentos con hora</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
