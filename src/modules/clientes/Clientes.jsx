import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { fmtFecha, iniciales, fmtEur } from '../../lib/utils'
import { Plus, Search, Mail, Phone, X, Save, Edit2, Trash2, Calendar, MapPin, ChevronLeft } from 'lucide-react'

const IDIOMAS = ['es','en','fr','it','de','pt']

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
  const [vistaDetalle, setVistaDetalle] = useState(false)

  useEffect(() => { if (user) cargar() }, [user])
  useEffect(() => { if (selected) cargarTrabajos(selected.id) }, [selected])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('v2_clientes').select('*').eq('user_id',user.id).is('deleted_at',null).order('nombre')
    setClientes(data||[])
    setLoading(false)
  }
  async function cargarTrabajos(cid) {
    const { data } = await supabase.from('v2_trabajos').select('id,titulo,tipo,fecha,precio_total,cobrado,estado_entrega').eq('cliente_id',cid).is('deleted_at',null).order('fecha',{ascending:false})
    setTrabajosCliente(data||[])
  }
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  async function guardar(e) {
    e.preventDefault(); setGuardando(true)
    const payload = {nombre:form.nombre,apellidos:form.apellidos,email:form.email,telefono:form.telefono,ciudad:form.ciudad,provincia:form.provincia,pais:form.pais||'España',idioma:form.idioma||'es',notas:form.notas}
    if (form.id) {
      const {data} = await supabase.from('v2_clientes').update(payload).eq('id',form.id).eq('user_id',user.id).select().single()
      setSelected(data); setClientes(c=>c.map(x=>x.id===data.id?data:x)); setEditando(false)
    } else {
      const {data} = await supabase.from('v2_clientes').insert({...payload,user_id:user.id}).select().single()
      setClientes(c=>[...c,data].sort((a,b)=>a.nombre.localeCompare(b.nombre))); setModal(false)
    }
    setGuardando(false)
  }
  async function eliminar(id) {
    await supabase.from('v2_clientes').update({deleted_at:new Date().toISOString()}).eq('id',id)
    setClientes(c=>c.filter(x=>x.id!==id)); setSelected(null); setVistaDetalle(false)
  }
  const filtrados = clientes.filter(c=>!busqueda||[c.nombre,c.apellidos,c.email,c.telefono,c.ciudad].some(f=>f?.toLowerCase().includes(busqueda.toLowerCase())))

  const handleSelect = (c) => { setSelected(c); setVistaDetalle(true) }

  return (
    <div className="flex h-[calc(100vh-54px-56px)] md:h-[calc(100vh-54px)] overflow-hidden">

      {/* LISTA */}
      <div className={`${vistaDetalle?'hidden md:flex':'flex'} flex-col md:w-96 w-full border-r border-brand/[.08] flex-shrink-0`}>
        <div className="p-4 border-b border-cream-dark">
          <div className="flex items-center gap-2 mb-3">
            <h1 className="text-[14px] font-medium text-ink flex-1">Clientes <span className="text-ink-3 text-xs font-normal">({clientes.length})</span></h1>
            <button onClick={()=>{setForm({idioma:'es',pais:'España'});setModal(true)}} className="btn-primary py-1.5 px-3 text-xs"><Plus size={13}/> Nuevo</button>
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3"/>
            <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} className="input pl-8 text-sm py-1.5 w-full" placeholder="Buscar…"/>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {loading?<p className="text-sm text-ink-3 p-4 text-center">Cargando…</p>
            :filtrados.length===0?<p className="text-sm text-ink-3 p-4 text-center">Sin resultados</p>
            :filtrados.map(c=>(
              <button key={c.id} onClick={()=>handleSelect(c)}
                className={`w-full text-left px-4 py-3.5 border-b border-cream-dark hover:bg-brand/[.03] transition-colors ${selected?.id===c.id?'bg-brand/[.06] border-l-2 border-l-brand':''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[11px] font-semibold flex-shrink-0">{iniciales(`${c.nombre} ${c.apellidos||''}`)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink">{c.nombre} {c.apellidos}</p>
                    <p className="text-[10.5px] text-ink-3 truncate">{c.email||c.telefono||c.ciudad||'—'}</p>
                    <p className="text-[9.5px] text-ink-3/60 mt-0.5">Alta: {fmtFecha(c.created_at)}</p>
                  </div>
                  {c.idioma&&c.idioma!=='es'&&<span className="text-[9px] bg-brand/10 text-brand px-1.5 py-0.5 rounded flex-shrink-0">{c.idioma.toUpperCase()}</span>}
                </div>
              </button>
            ))
          }
        </div>
      </div>

      {/* DETALLE */}
      <div className={`${vistaDetalle?'flex':'hidden md:flex'} flex-1 flex-col overflow-auto bg-white`}>
        {!selected?(
          <div className="flex items-center justify-center h-full text-sm text-ink-3">Selecciona un cliente</div>
        ):(
          <div className="p-5 md:p-7 max-w-2xl w-full">
            {/* Botón volver móvil */}
            <button onClick={()=>setVistaDetalle(false)} className="flex items-center gap-1.5 text-sm text-ink-2 mb-4 md:hidden">
              <ChevronLeft size={16}/> Volver
            </button>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center text-sm font-semibold">{iniciales(`${selected.nombre} ${selected.apellidos||''}`)}</div>
                <div>
                  <h2 className="text-lg font-medium text-ink">{selected.nombre} {selected.apellidos}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {selected.ciudad&&<span className="flex items-center gap-1 text-xs text-ink-3"><MapPin size={11}/>{selected.ciudad}</span>}
                    {selected.idioma&&selected.idioma!=='es'&&<span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded-full">{selected.idioma.toUpperCase()}</span>}
                    <span className="text-xs text-ink-3">Alta: {fmtFecha(selected.created_at)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5">
                {editando?(
                  <><button onClick={()=>setEditando(false)} className="btn-ghost p-1.5"><X size={14}/></button><button onClick={guardar} disabled={guardando} className="btn-primary py-1.5 px-3 text-xs"><Save size={13}/></button></>
                ):(
                  <><button onClick={()=>{setForm(selected);setEditando(true)}} className="btn-ghost py-1.5 px-3 text-xs"><Edit2 size={13}/></button><button onClick={()=>eliminar(selected.id)} className="btn-ghost py-1.5 px-2 text-red-500"><Trash2 size={13}/></button></>
                )}
              </div>
            </div>
            <div className="card p-4 mb-4">
              {editando?(
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="label">Nombre</label><input value={form.nombre||''} onChange={e=>set('nombre',e.target.value)} className="input text-sm"/></div>
                  <div><label className="label">Apellidos</label><input value={form.apellidos||''} onChange={e=>set('apellidos',e.target.value)} className="input text-sm"/></div>
                  <div><label className="label">Email</label><input type="email" value={form.email||''} onChange={e=>set('email',e.target.value)} className="input text-sm"/></div>
                  <div><label className="label">Teléfono</label><input value={form.telefono||''} onChange={e=>set('telefono',e.target.value)} className="input text-sm"/></div>
                  <div><label className="label">Ciudad</label><input value={form.ciudad||''} onChange={e=>set('ciudad',e.target.value)} className="input text-sm"/></div>
                  <div><label className="label">Idioma</label><select value={form.idioma||'es'} onChange={e=>set('idioma',e.target.value)} className="select text-sm">{IDIOMAS.map(l=><option key={l} value={l}>{l.toUpperCase()}</option>)}</select></div>
                  <div className="sm:col-span-2"><label className="label">Notas</label><textarea value={form.notas||''} onChange={e=>set('notas',e.target.value)} className="input resize-none text-sm" rows={2}/></div>
                </div>
              ):(
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selected.email&&<div className="flex items-center gap-2.5"><Mail size={14} className="text-ink-3"/><a href={`mailto:${selected.email}`} className="text-sm text-brand hover:underline break-all">{selected.email}</a></div>}
                  {selected.telefono&&<div className="flex items-center gap-2.5"><Phone size={14} className="text-ink-3"/><a href={`tel:${selected.telefono}`} className="text-sm text-ink">{selected.telefono}</a></div>}
                  {selected.notas&&<div className="sm:col-span-2 bg-cream rounded-lg p-3 text-sm text-ink-2">{selected.notas}</div>}
                </div>
              )}
            </div>
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-cream-dark flex items-center justify-between">
                <p className="text-xs font-medium text-ink-2 uppercase tracking-wide">Historial</p>
                <span className="text-xs text-ink-3">{trabajosCliente.length}</span>
              </div>
              {trabajosCliente.length===0?<p className="text-sm text-ink-3 p-4 text-center">Sin trabajos</p>
                :trabajosCliente.map((t,i)=>(
                  <div key={t.id} className={`flex items-center gap-3 px-4 py-3 ${i<trabajosCliente.length-1?'border-b border-cream-dark':''}`}>
                    <Calendar size={13} className="text-ink-3 flex-shrink-0"/>
                    <div className="flex-1 min-w-0"><p className="text-sm text-ink truncate">{t.titulo}</p><p className="text-xs text-ink-3">{t.tipo} · {fmtFecha(t.fecha)}</p></div>
                    <span className="font-serif text-sm text-brand flex-shrink-0">{fmtEur(t.precio_total)}</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>

      {modal&&(
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-cream-dark">
              <h2 className="font-medium text-ink">Nuevo cliente</h2>
              <button onClick={()=>setModal(false)} className="text-ink-3"><X size={18}/></button>
            </div>
            <form onSubmit={guardar} className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Nombre *</label><input value={form.nombre||''} onChange={e=>set('nombre',e.target.value)} className="input text-sm" required/></div>
                <div><label className="label">Apellidos</label><input value={form.apellidos||''} onChange={e=>set('apellidos',e.target.value)} className="input text-sm"/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Email</label><input type="email" value={form.email||''} onChange={e=>set('email',e.target.value)} className="input text-sm"/></div>
                <div><label className="label">Teléfono</label><input value={form.telefono||''} onChange={e=>set('telefono',e.target.value)} className="input text-sm"/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Ciudad</label><input value={form.ciudad||''} onChange={e=>set('ciudad',e.target.value)} className="input text-sm"/></div>
                <div><label className="label">Idioma</label><select value={form.idioma||'es'} onChange={e=>set('idioma',e.target.value)} className="select text-sm">{IDIOMAS.map(l=><option key={l} value={l}>{l.toUpperCase()}</option>)}</select></div>
              </div>
              <div className="flex gap-3 pt-1 pb-safe">
                <button type="button" onClick={()=>setModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
                <button type="submit" disabled={guardando} className="btn-primary flex-1 justify-center">{guardando?'…':'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
