import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, Search, Star, Mail, Phone, Link2, Globe, X, Save, Edit2, Trash2 } from 'lucide-react'

const CATEGORIAS = ['Videógrafo', 'DJ', 'Florista', 'Catering', 'Hacienda/Finca', 'Wedding Planner', '2º Fotógrafo', 'Maquillaje', 'Música', 'Transporte', 'Imprenta', 'Otro']

export default function Proveedores() {
  const { user } = useAuth()
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroCat, setFiltroCat] = useState('Todos')
  const [selected, setSelected] = useState(null)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({})
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { if (user) cargar() }, [user])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('v2_proveedores')
      .select('*').eq('user_id', user.id).is('deleted_at', null)
      .order('empresa')
    setProveedores(data || [])
    setLoading(false)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    const payload = { empresa: form.empresa, nombre: form.nombre, categoria: form.categoria, telefono: form.telefono, email: form.email, instagram: form.instagram, web: form.web, rating: form.rating ? parseInt(form.rating) : null, notas: form.notas }
    if (form.id) {
      const { data } = await supabase.from('v2_proveedores').update(payload).eq('id', form.id).eq('user_id', user.id).select().single()
      setSelected(data)
      setProveedores(p => p.map(x => x.id === data.id ? data : x))
      setEditando(false)
    } else {
      const { data } = await supabase.from('v2_proveedores').insert({ ...payload, user_id: user.id }).select().single()
      setProveedores(p => [...p, data].sort((a,b) => a.empresa.localeCompare(b.empresa)))
      setModal(false)
    }
    setGuardando(false)
  }

  async function eliminar(id) {
    await supabase.from('v2_proveedores').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    setProveedores(p => p.filter(x => x.id !== id))
    setSelected(null)
  }

  const filtrados = proveedores.filter(p => {
    if (filtroCat !== 'Todos' && p.categoria !== filtroCat) return false
    if (busqueda && ![p.empresa, p.nombre, p.categoria].some(f => f?.toLowerCase().includes(busqueda.toLowerCase()))) return false
    return true
  })

  const Stars = ({ rating, interactive, onChange }) => (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <button key={n} type={interactive ? 'button' : 'button'} onClick={() => interactive && onChange(n)}
          className={`${interactive ? 'cursor-pointer' : 'cursor-default'}`}>
          <Star size={13} className={n <= (rating||0) ? 'fill-amber-400 text-amber-400' : 'text-ink-3'} />
        </button>
      ))}
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-54px-56px)] md:h-[calc(100vh-54px)] overflow-hidden">
      {/* Lista */}
      <div className="w-full md:w-80 border-r border-brand/[.08] flex flex-col flex-shrink-0 md:flex-shrink-0">
        <div className="p-4 border-b border-cream-dark">
          <div className="flex items-center gap-2 mb-3">
            <h1 className="text-[14px] font-medium text-ink flex-1">Proveedores</h1>
            <span className="text-xs text-ink-3 bg-cream-dark px-2 py-0.5 rounded-full">{proveedores.length}</span>
            <button onClick={() => { setForm({ categoria: 'Otro' }); setModal(true) }} className="btn-primary py-1 px-2 text-xs"><Plus size={13} /></button>
          </div>
          <div className="relative mb-2">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} className="input pl-8 text-sm py-1.5 w-full" placeholder="Buscar…" />
          </div>
          <select value={filtroCat} onChange={e=>setFiltroCat(e.target.value)} className="select text-sm w-full py-1.5">
            <option value="Todos">Todas las categorías</option>
            {CATEGORIAS.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex-1 overflow-auto bg-white">
          {loading ? <p className="text-sm text-ink-3 p-4 text-center">Cargando…</p>
            : filtrados.length === 0 ? <p className="text-sm text-ink-3 p-4 text-center">Sin resultados</p>
            : filtrados.map(p => (
              <button key={p.id} onClick={() => setSelected(p)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-cream-dark hover:bg-brand/[.03] transition-colors
                  ${selected?.id === p.id ? 'bg-brand/[.05] border-l-2 border-l-brand' : ''}`}>
                <div className="w-8 h-8 rounded-lg bg-cream-dark flex items-center justify-center text-[10px] font-medium text-ink-2 flex-shrink-0">
                  {p.empresa?.slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{p.empresa}</p>
                  <p className="text-xs text-ink-3">{p.categoria}</p>
                </div>
                {p.rating && <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(n=><Star key={n} size={9} className={n<=p.rating?'fill-amber-400 text-amber-400':'text-cream-dark'} />)}
                </div>}
              </button>
            ))
          }
        </div>
      </div>

      {/* Detalle */}
      <div className="flex-1 overflow-auto bg-white">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-sm text-ink-3">
            Selecciona un proveedor
          </div>
        ) : (
          <div className="p-4 md:p-6 max-w-2xl">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-medium text-ink">{selected.empresa}</h2>
                <p className="text-sm text-ink-3">{selected.nombre || ''}{selected.nombre ? ' · ' : ''}{selected.categoria}</p>
                {selected.rating && <div className="mt-1"><Stars rating={selected.rating} /></div>}
              </div>
              <div className="flex gap-2">
                {editando ? (
                  <>
                    <button onClick={() => setEditando(false)} className="btn-ghost"><X size={14} /></button>
                    <button onClick={guardar} disabled={guardando} className="btn-primary"><Save size={14} /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setForm(selected); setEditando(true) }} className="btn-ghost"><Edit2 size={14} /> Editar</button>
                    <button onClick={() => eliminar(selected.id)} className="btn-ghost text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            </div>

            <div className="card p-5 mb-4">
              {editando ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label">Empresa</label><input value={form.empresa||''} onChange={e=>set('empresa',e.target.value)} className="input text-sm" /></div>
                    <div><label className="label">Contacto</label><input value={form.nombre||''} onChange={e=>set('nombre',e.target.value)} className="input text-sm" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label">Categoría</label>
                      <select value={form.categoria||'Otro'} onChange={e=>set('categoria',e.target.value)} className="select text-sm">
                        {CATEGORIAS.map(c=><option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div><label className="label">Valoración</label>
                      <Stars rating={form.rating} interactive onChange={v=>set('rating',v)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label">Teléfono</label><input value={form.telefono||''} onChange={e=>set('telefono',e.target.value)} className="input text-sm" /></div>
                    <div><label className="label">Email</label><input type="email" value={form.email||''} onChange={e=>set('email',e.target.value)} className="input text-sm" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label">Instagram</label><input value={form.instagram||''} onChange={e=>set('instagram',e.target.value)} className="input text-sm" placeholder="@handle" /></div>
                    <div><label className="label">Web</label><input value={form.web||''} onChange={e=>set('web',e.target.value)} className="input text-sm" placeholder="https://…" /></div>
                  </div>
                  <div><label className="label">Notas</label><textarea value={form.notas||''} onChange={e=>set('notas',e.target.value)} className="input resize-none text-sm" rows={3} /></div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selected.telefono && <div className="flex items-center gap-2"><Phone size={13} className="text-ink-3" /><a href={`tel:${selected.telefono}`} className="text-sm text-ink hover:text-brand">{selected.telefono}</a></div>}
                  {selected.email && <div className="flex items-center gap-2"><Mail size={13} className="text-ink-3" /><a href={`mailto:${selected.email}`} className="text-sm text-brand hover:underline">{selected.email}</a></div>}
                  {selected.instagram && <div className="flex items-center gap-2"><Link2 size={13} className="text-ink-3" /><a href={`https://instagram.com/${selected.instagram.replace('@','')}`} target="_blank" rel="noreferrer" className="text-sm text-brand hover:underline">{selected.instagram}</a></div>}
                  {selected.web && <div className="flex items-center gap-2"><Globe size={13} className="text-ink-3" /><a href={selected.web} target="_blank" rel="noreferrer" className="text-sm text-brand hover:underline truncate">{selected.web}</a></div>}
                  {selected.notas && <div className="mt-3 bg-cream rounded-lg p-3 text-sm text-ink-2">{selected.notas}</div>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal nuevo */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-cream-dark">
              <h2 className="font-medium text-ink">Nuevo proveedor</h2>
              <button onClick={() => setModal(false)} className="text-ink-3 hover:text-ink"><X size={18} /></button>
            </div>
            <form onSubmit={guardar} className="px-6 py-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Empresa *</label><input value={form.empresa||''} onChange={e=>set('empresa',e.target.value)} className="input text-sm" required /></div>
                <div><label className="label">Contacto</label><input value={form.nombre||''} onChange={e=>set('nombre',e.target.value)} className="input text-sm" /></div>
              </div>
              <div><label className="label">Categoría</label>
                <select value={form.categoria||'Otro'} onChange={e=>set('categoria',e.target.value)} className="select text-sm">
                  {CATEGORIAS.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Teléfono</label><input value={form.telefono||''} onChange={e=>set('telefono',e.target.value)} className="input text-sm" /></div>
                <div><label className="label">Email</label><input type="email" value={form.email||''} onChange={e=>set('email',e.target.value)} className="input text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Instagram</label><input value={form.instagram||''} onChange={e=>set('instagram',e.target.value)} className="input text-sm" /></div>
                <div><label className="label">Web</label><input value={form.web||''} onChange={e=>set('web',e.target.value)} className="input text-sm" /></div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
                <button type="submit" disabled={guardando} className="btn-primary flex-1 justify-center">{guardando?'Guardando…':'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
