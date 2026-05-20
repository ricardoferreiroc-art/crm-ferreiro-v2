import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { fmtFecha, fmtEur, esBoda, TIPOS_TRABAJO } from '../../lib/utils'
import {
  ArrowLeft, Edit2, Save, X, Check, Plus, Trash2,
  Euro, Camera, MapPin, Calendar, Users, FileText,
  Package, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react'

const FASES_WORKFLOW = ['Antes', 'Día B', 'Post']

const CHECKLIST_DEFAULT = {
  Boda: [
    { fase: 'Antes', titulo: 'Contrato firmado' },
    { fase: 'Antes', titulo: 'Reserva cobrada' },
    { fase: 'Antes', titulo: 'Cuestionario recibido' },
    { fase: 'Antes', titulo: 'Reunión logística' },
    { fase: 'Antes', titulo: 'Timing confirmado' },
    { fase: 'Antes', titulo: 'Segundo fotógrafo confirmado' },
    { fase: 'Día B', titulo: 'Resumen 24h enviado' },
    { fase: 'Día B', titulo: 'Boda realizada' },
    { fase: 'Día B', titulo: 'Resto del pago cobrado' },
    { fase: 'Post', titulo: 'Selección de fotos' },
    { fase: 'Post', titulo: 'Edición completada' },
    { fase: 'Post', titulo: 'Avance enviado' },
    { fase: 'Post', titulo: 'Galería completa entregada' },
    { fase: 'Post', titulo: 'Álbum encargado' },
    { fase: 'Post', titulo: 'Reseña recibida' },
  ],
  default: [
    { fase: 'Antes', titulo: 'Reserva cobrada' },
    { fase: 'Antes', titulo: 'Datos del cliente confirmados' },
    { fase: 'Día B', titulo: 'Sesión realizada' },
    { fase: 'Post', titulo: 'Edición completada' },
    { fase: 'Post', titulo: 'Galería entregada' },
  ]
}

const ESTADOS_ENTREGA = ['Pendiente', 'Editando', 'Avance enviado', 'Entregado']
const ESTADOS_TRABAJO = ['Confirmado', 'Realizado', 'Editando', 'Entregado', 'Cancelado']

export default function TrabajoDetalle() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [trabajo, setTrabajo] = useState(null)
  const [checklist, setChecklist] = useState([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [seccion, setSeccion] = useState('info') // info | cobros | workflow | entrega
  const [nuevaTarea, setNuevaTarea] = useState({ fase: 'Antes', titulo: '' })
  const [addingTarea, setAddingTarea] = useState(false)

  useEffect(() => { if (user && id) cargar() }, [user, id])

  async function cargar() {
    setLoading(true)
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from('v2_trabajos').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('v2_workflow').select('*').eq('trabajo_id', id).order('orden'),
    ])
    if (!t) { navigate('/trabajos'); return }
    setTrabajo(t)
    setForm(t)
    // Si no hay checklist, crear uno por defecto
    if (!c || c.length === 0) {
      const plantilla = esBoda(t.tipo) ? CHECKLIST_DEFAULT.Boda : CHECKLIST_DEFAULT.default
      const items = plantilla.map((item, i) => ({
        trabajo_id: parseInt(id), user_id: user.id,
        fase: item.fase, titulo: item.titulo,
        completado: false, orden: i, auto: true,
      }))
      const { data: insertados } = await supabase.from('v2_workflow').insert(items).select()
      setChecklist(insertados || [])
    } else {
      setChecklist(c)
    }
    setLoading(false)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function guardar() {
    setGuardando(true)
    const { data, error } = await supabase
      .from('v2_trabajos')
      .update({
        titulo: form.titulo, tipo: form.tipo, fecha: form.fecha,
        hora_inicio: form.hora_inicio, lugar: form.lugar, ciudad: form.ciudad,
        tipo_ceremonia: form.tipo_ceremonia, lugar_ceremonia: form.lugar_ceremonia,
        hora_ceremonia: form.hora_ceremonia, n_invitados: form.n_invitados,
        wedding_planner: form.wedding_planner, videografo: form.videografo,
        segundo_nombre: form.segundo_nombre,
        precio_total: form.precio_total, reserva: form.reserva,
        segundo_pago: form.segundo_pago, cobrado: form.cobrado,
        gasto_segundo: form.gasto_segundo, gasto_album: form.gasto_album,
        gasto_desplaz: form.gasto_desplaz, gasto_material: form.gasto_material,
        estado: form.estado, estado_entrega: form.estado_entrega,
        link_galeria: form.link_galeria, fecha_entrega: form.fecha_entrega,
        resena_recibida: form.resena_recibida, reunion_logistica: form.reunion_logistica,
        notas: form.notas,
      })
      .eq('id', id).eq('user_id', user.id).select().single()
    if (!error) { setTrabajo(data); setEditando(false) }
    setGuardando(false)
  }

  async function toggleChecklist(item) {
    const completado = !item.completado
    const completado_at = completado ? new Date().toISOString() : null
    await supabase.from('v2_workflow')
      .update({ completado, completado_at })
      .eq('id', item.id)
    setChecklist(c => c.map(x => x.id === item.id ? { ...x, completado, completado_at } : x))
  }

  async function addTarea() {
    if (!nuevaTarea.titulo.trim()) return
    const max = checklist.filter(c => c.fase === nuevaTarea.fase).length
    const { data } = await supabase.from('v2_workflow').insert({
      trabajo_id: parseInt(id), user_id: user.id,
      fase: nuevaTarea.fase, titulo: nuevaTarea.titulo.trim(),
      completado: false, orden: max, auto: false,
    }).select().single()
    if (data) setChecklist(c => [...c, data])
    setNuevaTarea(n => ({ ...n, titulo: '' }))
    setAddingTarea(false)
  }

  async function deleteTarea(itemId) {
    await supabase.from('v2_workflow').delete().eq('id', itemId)
    setChecklist(c => c.filter(x => x.id !== itemId))
  }

  async function actualizarEstadoEntrega(estado) {
    await supabase.from('v2_trabajos')
      .update({ estado_entrega: estado })
      .eq('id', id).eq('user_id', user.id)
    setTrabajo(t => ({ ...t, estado_entrega: estado }))
    setForm(f => ({ ...f, estado_entrega: estado }))
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-ink-3 text-sm">Cargando…</div>
  if (!trabajo) return null

  const benef = (trabajo.precio_total || 0)
    - (trabajo.gasto_segundo || 0) - (trabajo.gasto_album || 0)
    - (trabajo.gasto_desplaz || 0) - (trabajo.gasto_material || 0)
  const pendiente = (trabajo.precio_total || 0) - (trabajo.cobrado || 0)
  const pctCobro = trabajo.precio_total > 0 ? Math.min(100, Math.round((trabajo.cobrado / trabajo.precio_total) * 100)) : 0

  const completados = checklist.filter(c => c.completado).length
  const pctWorkflow = checklist.length > 0 ? Math.round((completados / checklist.length) * 100) : 0

  const tab = (id, label) => (
    <button
      onClick={() => setSeccion(id)}
      className={`px-4 py-2 text-sm border-b-2 transition-all ${seccion === id
        ? 'border-brand text-brand font-medium'
        : 'border-transparent text-ink-3 hover:text-ink'}`}
    >
      {label}
    </button>
  )

  return (
    <div className="max-w-4xl mx-auto p-6">

      {/* Cabecera */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/trabajos" className="text-ink-3 hover:text-ink transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            {editando
              ? <input value={form.titulo} onChange={e => set('titulo', e.target.value)} className="input text-lg font-medium py-1 w-80" />
              : <h1 className="text-xl font-medium text-ink">{trabajo.titulo}</h1>
            }
            <p className="text-sm text-ink-3 mt-0.5">
              {fmtFecha(trabajo.fecha)}
              {trabajo.hora_inicio ? ` · ${trabajo.hora_inicio}` : ''}
              {trabajo.lugar ? ` · ${trabajo.lugar}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editando ? (
            <>
              <button onClick={() => setEditando(false)} className="btn-ghost"><X size={15} /> Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="btn-primary">
                <Save size={15} /> {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </>
          ) : (
            <button onClick={() => setEditando(true)} className="btn-ghost">
              <Edit2 size={15} /> Editar
            </button>
          )}
        </div>
      </div>

      {/* Badges de estado */}
      <div className="flex items-center gap-2 mb-5">
        {editando ? (
          <>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className="select text-sm w-auto py-1">
              {TIPOS_TRABAJO.map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={form.estado} onChange={e => set('estado', e.target.value)} className="select text-sm w-auto py-1">
              {ESTADOS_TRABAJO.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={form.estado_entrega} onChange={e => set('estado_entrega', e.target.value)} className="select text-sm w-auto py-1">
              {ESTADOS_ENTREGA.map(s => <option key={s}>{s}</option>)}
            </select>
          </>
        ) : (
          <>
            <span className="badge-boda text-xs px-3 py-1 rounded-full bg-brand/10 text-brand">{trabajo.tipo}</span>
            <span className="text-xs px-3 py-1 rounded-full bg-cream-dark text-ink-2">{trabajo.estado}</span>
            <span className={`text-xs px-3 py-1 rounded-full ${
              trabajo.estado_entrega === 'Entregado' ? 'bg-emerald-100 text-emerald-700' :
              trabajo.estado_entrega === 'Editando' ? 'bg-amber-100 text-amber-700' :
              trabajo.estado_entrega === 'Avance enviado' ? 'bg-blue-100 text-blue-700' :
              'bg-cream-dark text-ink-3'}`}>
              {trabajo.estado_entrega || 'Pendiente'}
            </span>
          </>
        )}
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="card p-3">
          <p className="text-[10px] text-ink-3 mb-1">Precio total</p>
          <p className="font-serif text-xl text-brand">{fmtEur(trabajo.precio_total)}</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] text-ink-3 mb-1">Cobrado</p>
          <p className="font-serif text-xl text-ink">{fmtEur(trabajo.cobrado)}</p>
          <div className="h-1 bg-cream-dark rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pctCobro}%` }} />
          </div>
        </div>
        <div className="card p-3">
          <p className="text-[10px] text-ink-3 mb-1">Pendiente</p>
          <p className={`font-serif text-xl ${pendiente > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {fmtEur(pendiente)}
          </p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] text-ink-3 mb-1">Beneficio neto</p>
          <p className="font-serif text-xl text-ink">{fmtEur(benef)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-cream-dark mb-5">
        {tab('info', 'Información')}
        {tab('cobros', 'Cobros y gastos')}
        {tab('workflow', `Workflow ${pctWorkflow}%`)}
        {tab('entrega', 'Entrega')}
      </div>

      {/* ── TAB: INFORMACIÓN ── */}
      {seccion === 'info' && (
        <div className="grid grid-cols-2 gap-5">
          <div className="card p-5 space-y-4">
            <p className="text-xs font-medium text-ink-2 uppercase tracking-wide mb-3">Datos del evento</p>
            <Field label="Tipo" edit={editando}>
              {editando
                ? <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className="select text-sm">{TIPOS_TRABAJO.map(t => <option key={t}>{t}</option>)}</select>
                : trabajo.tipo}
            </Field>
            <Field label="Fecha">
              {editando
                ? <input type="date" value={form.fecha || ''} onChange={e => set('fecha', e.target.value)} className="input text-sm" />
                : fmtFecha(trabajo.fecha)}
            </Field>
            <Field label="Hora inicio">
              {editando
                ? <input value={form.hora_inicio || ''} onChange={e => set('hora_inicio', e.target.value)} className="input text-sm" placeholder="18:00" />
                : trabajo.hora_inicio || '—'}
            </Field>
            <Field label="Lugar">
              {editando
                ? <input value={form.lugar || ''} onChange={e => set('lugar', e.target.value)} className="input text-sm" />
                : trabajo.lugar || '—'}
            </Field>
            <Field label="Ciudad">
              {editando
                ? <input value={form.ciudad || ''} onChange={e => set('ciudad', e.target.value)} className="input text-sm" />
                : trabajo.ciudad || '—'}
            </Field>
            {esBoda(trabajo.tipo) && <>
              <Field label="Ceremonia">
                {editando
                  ? <input value={form.tipo_ceremonia || ''} onChange={e => set('tipo_ceremonia', e.target.value)} className="input text-sm" placeholder="Civil / Religiosa / Simbólica" />
                  : trabajo.tipo_ceremonia || '—'}
              </Field>
              <Field label="Lugar ceremonia">
                {editando
                  ? <input value={form.lugar_ceremonia || ''} onChange={e => set('lugar_ceremonia', e.target.value)} className="input text-sm" />
                  : trabajo.lugar_ceremonia || '—'}
              </Field>
              <Field label="Hora ceremonia">
                {editando
                  ? <input value={form.hora_ceremonia || ''} onChange={e => set('hora_ceremonia', e.target.value)} className="input text-sm" placeholder="12:00" />
                  : trabajo.hora_ceremonia || '—'}
              </Field>
              <Field label="Nº invitados">
                {editando
                  ? <input type="number" value={form.n_invitados || ''} onChange={e => set('n_invitados', e.target.value)} className="input text-sm" />
                  : trabajo.n_invitados || '—'}
              </Field>
            </>}
          </div>

          <div className="card p-5 space-y-4">
            <p className="text-xs font-medium text-ink-2 uppercase tracking-wide mb-3">Equipo y proveedores</p>
            <Field label="2º fotógrafo">
              {editando
                ? <input value={form.segundo_nombre || ''} onChange={e => set('segundo_nombre', e.target.value)} className="input text-sm" />
                : trabajo.segundo_nombre || '—'}
            </Field>
            <Field label="Wedding planner">
              {editando
                ? <input value={form.wedding_planner || ''} onChange={e => set('wedding_planner', e.target.value)} className="input text-sm" />
                : trabajo.wedding_planner || '—'}
            </Field>
            <Field label="Videógrafo">
              {editando
                ? <input value={form.videografo || ''} onChange={e => set('videografo', e.target.value)} className="input text-sm" />
                : trabajo.videografo || '—'}
            </Field>

            <p className="text-xs font-medium text-ink-2 uppercase tracking-wide mt-5 mb-3">Estado</p>
            <Field label="Reunión logística">
              <button
                onClick={() => { if (editando) set('reunion_logistica', !form.reunion_logistica) }}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                  ${(editando ? form.reunion_logistica : trabajo.reunion_logistica)
                    ? 'bg-brand border-brand' : 'border-ink-3'}`}
              >
                {(editando ? form.reunion_logistica : trabajo.reunion_logistica) && <Check size={12} className="text-white" />}
              </button>
            </Field>
            <Field label="Reseña recibida">
              <button
                onClick={() => { if (editando) set('resena_recibida', !form.resena_recibida) }}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                  ${(editando ? form.resena_recibida : trabajo.resena_recibida)
                    ? 'bg-brand border-brand' : 'border-ink-3'}`}
              >
                {(editando ? form.resena_recibida : trabajo.resena_recibida) && <Check size={12} className="text-white" />}
              </button>
            </Field>

            <div className="mt-4">
              <p className="label">Notas</p>
              {editando
                ? <textarea value={form.notas || ''} onChange={e => set('notas', e.target.value)} className="input resize-none text-sm" rows={4} />
                : <p className="text-sm text-ink-2 bg-cream rounded-lg p-3 min-h-[60px]">{trabajo.notas || '—'}</p>
              }
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: COBROS Y GASTOS ── */}
      {seccion === 'cobros' && (
        <div className="grid grid-cols-2 gap-5">
          <div className="card p-5">
            <p className="text-xs font-medium text-ink-2 uppercase tracking-wide mb-4">Ingresos</p>
            <div className="space-y-3">
              {[
                { label: 'Precio total', key: 'precio_total', bold: true },
                { label: 'Reserva', key: 'reserva' },
                { label: '2º pago', key: 'segundo_pago' },
                { label: 'Total cobrado', key: 'cobrado', bold: true },
              ].map(({ label, key, bold }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className={`text-sm ${bold ? 'font-medium text-ink' : 'text-ink-2'}`}>{label}</span>
                  {editando
                    ? <input type="number" value={form[key] || 0} onChange={e => set(key, parseFloat(e.target.value) || 0)}
                        className="input text-sm w-32 text-right py-1" />
                    : <span className={`font-serif text-base ${bold ? 'text-brand' : 'text-ink'}`}>{fmtEur(trabajo[key])}</span>
                  }
                </div>
              ))}
              <div className="border-t border-cream-dark pt-3 flex items-center justify-between">
                <span className="text-sm font-medium text-amber-600">Pendiente de cobro</span>
                <span className="font-serif text-base text-amber-600">{fmtEur(pendiente)}</span>
              </div>
              <div className="bg-cream-dark rounded-full h-2 overflow-hidden">
                <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${pctCobro}%` }} />
              </div>
              <p className="text-xs text-ink-3 text-right">{pctCobro}% cobrado</p>
            </div>
          </div>

          <div className="card p-5">
            <p className="text-xs font-medium text-ink-2 uppercase tracking-wide mb-4">Gastos</p>
            <div className="space-y-3">
              {[
                { label: '2º fotógrafo', key: 'gasto_segundo' },
                { label: 'Álbum', key: 'gasto_album' },
                { label: 'Desplazamiento', key: 'gasto_desplaz' },
                { label: 'Material', key: 'gasto_material' },
              ].map(({ label, key }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-ink-2">{label}</span>
                  {editando
                    ? <input type="number" value={form[key] || 0} onChange={e => set(key, parseFloat(e.target.value) || 0)}
                        className="input text-sm w-32 text-right py-1" />
                    : <span className="font-serif text-base text-ink">{fmtEur(trabajo[key])}</span>
                  }
                </div>
              ))}
              <div className="border-t border-cream-dark pt-3 flex items-center justify-between">
                <span className="text-sm text-ink-3">Total gastos</span>
                <span className="font-serif text-base text-ink">
                  {fmtEur((trabajo.gasto_segundo||0)+(trabajo.gasto_album||0)+(trabajo.gasto_desplaz||0)+(trabajo.gasto_material||0))}
                </span>
              </div>
              <div className="border-t border-cream-dark pt-3 flex items-center justify-between">
                <span className="text-sm font-medium text-ink">Beneficio neto</span>
                <span className="font-serif text-lg text-brand">{fmtEur(benef)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: WORKFLOW ── */}
      {seccion === 'workflow' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="bg-cream-dark rounded-full h-2 w-48 overflow-hidden">
                <div className="h-full bg-brand rounded-full" style={{ width: `${pctWorkflow}%` }} />
              </div>
              <span className="text-sm text-ink-3">{completados} / {checklist.length} completadas</span>
            </div>
            <button onClick={() => setAddingTarea(true)} className="btn-ghost text-sm">
              <Plus size={13} /> Añadir tarea
            </button>
          </div>

          {FASES_WORKFLOW.map(fase => {
            const items = checklist.filter(c => c.fase === fase)
            const completadasFase = items.filter(c => c.completado).length
            return (
              <div key={fase} className="card overflow-hidden">
                <div className={`px-4 py-2.5 flex items-center justify-between border-b border-cream-dark
                  ${fase === 'Antes' ? 'bg-blue-50' : fase === 'Día B' ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                  <span className="text-sm font-medium text-ink">{fase}</span>
                  <span className="text-xs text-ink-3">{completadasFase}/{items.length}</span>
                </div>
                {items.map(item => (
                  <div key={item.id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-cream-dark last:border-0 group
                    ${item.completado ? 'bg-emerald-50/30' : ''}`}>
                    <button onClick={() => toggleChecklist(item)}
                      className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all
                        ${item.completado ? 'bg-brand border-brand' : 'border-ink-3 hover:border-brand'}`}>
                      {item.completado && <Check size={11} className="text-white" />}
                    </button>
                    <span className={`text-sm flex-1 ${item.completado ? 'line-through text-ink-3' : 'text-ink'}`}>
                      {item.titulo}
                    </span>
                    {item.completado_at && (
                      <span className="text-[10px] text-ink-3">{fmtFecha(item.completado_at)}</span>
                    )}
                    <button onClick={() => deleteTarea(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-red-500 transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {addingTarea && nuevaTarea.fase === fase && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-cream">
                    <input autoFocus value={nuevaTarea.titulo}
                      onChange={e => setNuevaTarea(n => ({ ...n, titulo: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') addTarea(); if (e.key === 'Escape') setAddingTarea(false) }}
                      className="input text-sm flex-1 py-1" placeholder="Nueva tarea…" />
                    <button onClick={addTarea} className="btn-primary py-1 px-2 text-xs"><Check size={13} /></button>
                    <button onClick={() => setAddingTarea(false)} className="btn-ghost py-1 px-2 text-xs"><X size={13} /></button>
                  </div>
                )}
                {addingTarea && nuevaTarea.fase !== fase && (
                  <button onClick={() => setNuevaTarea({ fase, titulo: '' })}
                    className="w-full text-left px-4 py-2 text-xs text-ink-3 hover:text-brand hover:bg-brand/[.03] transition-all">
                    + Añadir en {fase}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── TAB: ENTREGA ── */}
      {seccion === 'entrega' && (
        <div className="grid grid-cols-2 gap-5">
          <div className="card p-5 space-y-4">
            <p className="text-xs font-medium text-ink-2 uppercase tracking-wide mb-3">Estado de entrega</p>
            <div className="flex flex-col gap-2">
              {ESTADOS_ENTREGA.map(e => (
                <button key={e} onClick={() => actualizarEstadoEntrega(e)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm transition-all text-left
                    ${trabajo.estado_entrega === e
                      ? 'bg-brand text-white border-brand'
                      : 'border-brand/20 text-ink hover:border-brand/40 hover:bg-brand/[.03]'}`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                    ${trabajo.estado_entrega === e ? 'border-white' : 'border-current'}`}>
                    {trabajo.estado_entrega === e && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                  </div>
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <p className="text-xs font-medium text-ink-2 uppercase tracking-wide mb-3">Galería y fechas</p>
            <div>
              <label className="label">Fecha de entrega</label>
              {editando
                ? <input type="date" value={form.fecha_entrega || ''} onChange={e => set('fecha_entrega', e.target.value)} className="input text-sm" />
                : <p className="text-sm text-ink">{trabajo.fecha_entrega ? fmtFecha(trabajo.fecha_entrega) : '—'}</p>
              }
            </div>
            <div>
              <label className="label">Enlace galería</label>
              {editando
                ? <input value={form.link_galeria || ''} onChange={e => set('link_galeria', e.target.value)} className="input text-sm" placeholder="https://…" />
                : trabajo.link_galeria
                  ? <a href={trabajo.link_galeria} target="_blank" rel="noreferrer"
                      className="text-sm text-brand hover:underline flex items-center gap-1.5">
                      <ExternalLink size={13} /> Ver galería
                    </a>
                  : <p className="text-sm text-ink-3">Sin enlace</p>
              }
            </div>
            {!editando && (
              <button onClick={() => setEditando(true)} className="btn-ghost w-full justify-center mt-2 text-sm">
                <Edit2 size={13} /> Editar campos
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Componente auxiliar para campos
function Field({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-ink-3 flex-shrink-0 mt-1 w-28">{label}</span>
      <div className="flex-1 text-sm text-ink text-right">{children}</div>
    </div>
  )
}
