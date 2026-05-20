import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { fmtFecha, iniciales } from '../../lib/utils'
import { Plus, Search, Mail, Phone, X, Save, Edit2, Trash2 } from 'lucide-react'

const IDIOMAS = ['es', 'en', 'fr', 'it', 'de', 'pt']

export default function Clientes() {
  const { user } = useAuth()
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [selected, setSelected] = useState(null)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [trabajosCliente, setTrabajosCliente] = useState([])

  useEffect(() => { if (user) cargar() }, [user])
  useEffect(() => { if (selected) cargarTrabajos(selected.id) }, [selected])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('v2_clientes')
      .select('*').eq('user_id', user.id).is('deleted_at', null)
      .order('nombre')
    setClientes(data || [])
    setLoading(false)
  }

  async function cargarTrabajos(clienteId) {
    const { data } = await supabase.from('v2_trabajos')
      .select('id, titulo, tipo, fecha, precio_total, cobrado, estado_entrega')
      .eq('cliente_id', clienteId).is('deleted_at', null)
      .order('fecha', { ascending: false })
    setTrabajosCliente(data || [])
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    if (form.id) {
      const { data } = await supabase.from('v2_clientes')
        .update({ nombre: form.nombre, apellidos: form.apellidos, email: form.email, telefono: form.telefono, ciudad: form.ciudad, provincia: form.provincia, pais: form.pais, idioma: form.idioma, notas: form.notas })
        .eq('id', form.id).eq('user_id', user.id).select().single()
      setSelected(data)
      setClientes(c => c.map(x => x.id === data.id ? data : x))
      setEditando(false)
    } else {
      const { data } = await supabase.from('v2_clientes')
        .insert({ ...form, user_id: user.id }).select().single()
      setClientes(c => [...c, data].sort((a,b) => a.nombre.localeCompare(b.nombre)))
      setModal(false)
    }
    setGuardando(false)
  }

  async function eliminar(id) {
    await supabase.from('v2_clientes').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    setClientes(c => c.filter(x => x.id !== id))
    setSelected(null)
  }

  const filtrados = clientes.filter(c =>
    !busqueda || [c.nombre, c.apellidos, c.email, c.telefono, c.ciudad].some(f => f?.toLowerCase().includes(busqueda.toLowerCase()))
  )

  const FormCliente = ({ onClose, onSave }) => (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-cream-dark">
          <h2 className="font-medium text-ink">Nuevo cliente</h2>
          <button onClick={onClose} className="text-ink-3 hover:text-ink"><X size={18} /></button>
        </div>
        <form onSubmit={guardar} className="px-6 py-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Nombre *</label><input value={form.nombre||''} onChange={e=>set('nombre',e.target.value)} className="input text-sm" required /></div>
            <div><label className="label">Apellidos</label><input value={form.apellidos||''} onChange={e=>set('apellidos',e.target.value)} className="input text-sm" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Email</label><input type="email" value={form.email||''} onChange={e=>set('email',e.target.value)} className="input text-sm" /></div>
            <div><label className="label">Teléfono</label><input value={form.telefono||''} onChange={e=>set('telefono',e.target.value)} className="input text-sm" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Ciudad</label><input value={form.ciudad||''} onChange={e=>set('ciudad',e.target.value)} className="input text-sm" /></div>
            <div><label className="label">Idioma</label>
              <select value={form.idioma||'es'} onChange={e=>set('idioma',e.target.value)} className="select text-sm">
                {IDIOMAS.map(l=><option key={l} value={l}>{l.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Notas</label><textarea value={form.notas||''} onChange={e=>set('notas',e.target.value)} className="input resize-none text-sm" rows={2} /></div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={guardando} className="btn-primary flex-1 justify-center">{guardando?'Guardando…':'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-54px)]">
      {/* Lista */}
      <div className="w-80 border-r border-brand/[.08] flex flex-col">
        <div className="p-4 border-b border-cream-dark">
          <div className="flex items-center gap-2 mb-3">
            <h1 className="text-[14px] font-medium text-ink flex-1">Clientes</h1>
            <span className="text-xs text-ink-3 bg-cream-dark px-2 py-0.5 rounded-full">{clientes.length}</span>
            <button onClick={() => { setForm({}); setModal(true) }} className="btn-primary py-1 px-2 text-xs"><Plus size={13} /></button>
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} className="input pl-8 text-sm py-1.5 w-full" placeholder="Buscar…" />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? <p className="text-sm text-ink-3 p-4 text-center">Cargando…</p>
            : filtrados.length === 0 ? <p className="text-sm text-ink-3 p-4 text-center">Sin resultados</p>
            : filtrados.map(c => (
              <button key={c.id} onClick={() => setSelected(c)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-cream-dark hover:bg-brand/[.03] transition-colors
                  ${selected?.id === c.id ? 'bg-brand/[.05] border-l-2 border-l-brand' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[10px] font-medium flex-shrink-0">
                  {iniciales(`${c.nombre} ${c.apellidos || ''}`)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{c.nombre} {c.apellidos}</p>
                  <p className="text-xs text-ink-3 truncate">{c.email || c.telefono || c.ciudad || '—'}</p>
                </div>
                {c.idioma && c.idioma !== 'es' && (
                  <span className="text-[9px] text-ink-3 uppercase">{c.idioma}</span>
                )}
              </button>
            ))
          }
        </div>
      </div>

      {/* Detalle */}
      <div className="flex-1 overflow-auto">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-sm text-ink-3">
            Selecciona un cliente para ver su ficha
          </div>
        ) : (
          <div className="p-6 max-w-2xl">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center text-sm font-medium">
                  {iniciales(`${selected.nombre} ${selected.apellidos || ''}`)}
                </div>
                <div>
                  <h2 className="text-lg font-medium text-ink">{selected.nombre} {selected.apellidos}</h2>
                  <p className="text-sm text-ink-3">{selected.ciudad || ''}{selected.ciudad && selected.idioma !== 'es' ? ' · ' : ''}{selected.idioma !== 'es' ? selected.idioma?.toUpperCase() : ''}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {editando ? (
                  <>
                    <button onClick={() => setEditando(false)} className="btn-ghost"><X size={14} /></button>
                    <button onClick={guardar} disabled={guardando} className="btn-primary"><Save size={14} /> {guardando ? '…' : 'Guardar'}</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setForm(selected); setEditando(true) }} className="btn-ghost"><Edit2 size={14} /> Editar</button>
                    <button onClick={() => eliminar(selected.id)} className="btn-ghost text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            </div>

            {/* Datos contacto */}
            <div className="card p-5 mb-4">
              <p className="text-xs font-medium text-ink-2 uppercase tracking-wide mb-3">Contacto</p>
              <div className="grid grid-cols-2 gap-4">
                {editando ? (
                  <>
                    <div><label className="label">Nombre</label><input value={form.nombre||''} onChange={e=>set('nombre',e.target.value)} className="input text-sm" /></div>
                    <div><label className="label">Apellidos</label><input value={form.apellidos||''} onChange={e=>set('apellidos',e.target.value)} className="input text-sm" /></div>
                    <div><label className="label">Email</label><input type="email" value={form.email||''} onChange={e=>set('email',e.target.value)} className="input text-sm" /></div>
                    <div><label className="label">Teléfono</label><input value={form.telefono||''} onChange={e=>set('telefono',e.target.value)} className="input text-sm" /></div>
                    <div><label className="label">Ciudad</label><input value={form.ciudad||''} onChange={e=>set('ciudad',e.target.value)} className="input text-sm" /></div>
                    <div><label className="label">Idioma</label>
                      <select value={form.idioma||'es'} onChange={e=>set('idioma',e.target.value)} className="select text-sm">
                        {IDIOMAS.map(l=><option key={l} value={l}>{l.toUpperCase()}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2"><label className="label">Notas</label><textarea value={form.notas||''} onChange={e=>set('notas',e.target.value)} className="input resize-none text-sm" rows={2} /></div>
                  </>
                ) : (
                  <>
                    {selected.email && <div className="flex items-center gap-2"><Mail size={13} className="text-ink-3" /><a href={`mailto:${selected.email}`} className="text-sm text-brand hover:underline">{selected.email}</a></div>}
                    {selected.telefono && <div className="flex items-center gap-2"><Phone size={13} className="text-ink-3" /><a href={`tel:${selected.telefono}`} className="text-sm text-ink hover:text-brand">{selected.telefono}</a></div>}
                    {selected.ciudad && <div><p className="text-xs text-ink-3">Ciudad</p><p className="text-sm text-ink">{selected.ciudad}</p></div>}
                    {selected.notas && <div className="col-span-2 bg-cream rounded-lg p-2.5 text-sm text-ink-2">{selected.notas}</div>}
                  </>
                )}
              </div>
            </div>

            {/* Historial de trabajos */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-cream-dark">
                <p className="text-xs font-medium text-ink-2 uppercase tracking-wide">Trabajos</p>
              </div>
              {trabajosCliente.length === 0 ? (
                <p className="text-sm text-ink-3 p-4 text-center">Sin trabajos vinculados</p>
              ) : trabajosCliente.map((t, i) => (
                <div key={t.id} className={`flex items-center gap-3 px-4 py-3 ${i < trabajosCliente.length-1 ? 'border-b border-cream-dark' : ''}`}>
                  <div className="flex-1">
                    <p className="text-sm text-ink">{t.titulo}</p>
                    <p className="text-xs text-ink-3">{t.tipo} · {fmtFecha(t.fecha)}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.estado_entrega==='Entregado'?'bg-emerald-100 text-emerald-700':'bg-cream-dark text-ink-3'}`}>
                    {t.estado_entrega||'Pendiente'}
                  </span>
                  <span className="font-serif text-sm text-brand">{t.precio_total ? `${t.precio_total.toLocaleString('es-ES')} €` : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {modal && <FormCliente onClose={() => setModal(false)} />}
    </div>
  )
}
