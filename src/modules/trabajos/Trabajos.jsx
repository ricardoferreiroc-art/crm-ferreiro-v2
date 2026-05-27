import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { fmtFecha, fmtEur, iniciales, avatarColor, tipoBadge, TIPOS_TRABAJO } from '../../lib/utils'
import { Plus, Search, ChevronRight, Filter } from 'lucide-react'

export default function Trabajos() {
  const { user } = useAuth()
  const [trabajos, setTrabajos] = useState([])
  const [segundo, setSegundo] = useState([])
  const [loading, setLoading] = useState(true)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [filtroPago, setFiltroPago] = useState('Todos')
  const [busqueda, setBusqueda] = useState('')
  const [showFiltros, setShowFiltros] = useState(false)

  useEffect(() => { if (user) cargar() }, [user, anio])

  async function cargar() {
    setLoading(true)
    const [{ data: t },{ data: s }] = await Promise.all([
      supabase.from('v2_trabajos').select('id,tipo,titulo,fecha,hora_inicio,lugar,estado,estado_entrega,precio_total,cobrado,deleted_at').eq('user_id',user.id).is('deleted_at',null).gte('fecha',`${anio}-01-01`).lte('fecha',`${anio}-12-31`).order('fecha',{ascending:true}),
      supabase.from('v2_segundo_fotografo').select('id,novios,fecha,hora,lugar,estado,honorarios,cobrado,deleted_at').eq('user_id',user.id).is('deleted_at',null).gte('fecha',`${anio}-01-01`).lte('fecha',`${anio}-12-31`).order('fecha',{ascending:true}),
    ])
    setTrabajos(t||[])
    setSegundo((s||[]).map(x=>({id:x.id,tipo:'2º Fotógrafo',titulo:x.novios||'—',fecha:x.fecha,hora_inicio:x.hora,lugar:x.lugar,estado:x.estado,estado_entrega:'Entregado',precio_total:x.honorarios,cobrado:x.cobrado,_segundo:true})))
    setLoading(false)
  }

  const todos = [...trabajos,...segundo].sort((a,b)=>a.fecha?.localeCompare(b.fecha||'')||0)
  const filtrados = todos.filter(t=>{
    if (filtroTipo!=='Todos'&&t.tipo!==filtroTipo) return false
    if (filtroPago==='Cobrado'&&t.cobrado<t.precio_total) return false
    if (filtroPago==='Pendiente'&&t.cobrado>=t.precio_total) return false
    if (busqueda&&!t.titulo?.toLowerCase().includes(busqueda.toLowerCase())&&!t.lugar?.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })
  const porMes = filtrados.reduce((acc,t)=>{ if(!t.fecha) return acc; const m=t.fecha.slice(0,7); if(!acc[m]) acc[m]=[]; acc[m].push(t); return acc },{})
  const totales = { facturado:filtrados.reduce((s,t)=>s+(t.precio_total||0),0), cobrado:filtrados.reduce((s,t)=>s+(t.cobrado||0),0) }
  const mesLabel = (ym)=>{ const [y,m]=ym.split('-'); return new Date(+y,+m-1,1).toLocaleDateString('es-ES',{month:'long',year:'numeric'}) }
  const pagoClass = (t)=>{ const p=t.precio_total>0?t.cobrado/t.precio_total:0; return p>=1?'text-emerald-600':p>0?'text-amber-600':'text-red-500' }

  return (
    <div className="p-4 md:p-7">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-[15px] font-medium text-ink">Trabajos</h1>
          <select value={anio} onChange={e=>setAnio(+e.target.value)} className="select text-sm w-20 py-1">
            {[2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setShowFiltros(!showFiltros)} className="btn-ghost md:hidden py-1.5 px-2"><Filter size={15}/></button>
          <Link to="/trabajos/nuevo" className="btn-primary py-1.5 px-3 text-sm"><Plus size={14}/><span className="hidden sm:inline"> Nuevo</span></Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {[
          { l:'Trabajos', v:filtrados.length },
          { l:'Facturado', v:fmtEur(totales.facturado), hi:true },
          { l:'Cobrado', v:fmtEur(totales.cobrado) },
          { l:'Pendiente', v:fmtEur(totales.facturado-totales.cobrado), warn:true },
        ].map(k=>(
          <div key={k.l} className="card px-3 py-2.5">
            <p className="text-[10px] text-ink-3 mb-1">{k.l}</p>
            <p className={`font-serif text-[20px] md:text-[22px] leading-none ${k.hi?'text-brand':k.warn?'text-amber-600':'text-ink'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className={`${showFiltros?'flex':'hidden'} md:flex flex-wrap gap-2 mb-4`}>
        <div className="relative flex-1 min-w-[160px]">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3"/>
          <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} className="input pl-8 text-sm w-full py-1.5" placeholder="Buscar…"/>
        </div>
        <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)} className="select text-sm py-1.5 flex-shrink-0">
          <option value="Todos">Todos los tipos</option>
          {TIPOS_TRABAJO.map(t=><option key={t}>{t}</option>)}
          <option value="2º Fotógrafo">2º Fotógrafo</option>
        </select>
        <select value={filtroPago} onChange={e=>setFiltroPago(e.target.value)} className="select text-sm py-1.5 flex-shrink-0">
          <option value="Todos">Todos pagos</option>
          <option value="Cobrado">Cobrado</option>
          <option value="Pendiente">Pendiente</option>
        </select>
      </div>

      {/* Lista */}
      {loading ? <p className="text-sm text-ink-3 text-center py-10">Cargando…</p>
        : filtrados.length===0 ? <p className="text-sm text-ink-3 text-center py-10">Sin trabajos</p>
        : Object.entries(porMes).map(([mes,items])=>(
          <div key={mes} className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-medium text-ink-2 capitalize">{mesLabel(mes)}</span>
              <span className="text-[10px] text-ink-3">{items.length}</span>
            </div>
            <div className="card overflow-hidden">
              {items.map((t,i)=>(
                <Link key={t.id} to={t._segundo?`/trabajos/segundo/${t.id}`:`/trabajos/${t.id}`}
                  className={`flex items-center gap-2.5 px-3 md:px-4 py-2.5 hover:bg-brand/[.03] transition-colors ${i<items.length-1?'border-b border-cream-dark':''}`}>
                  <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[9px] md:text-[10px] font-medium flex-shrink-0 ${avatarColor(t.tipo)}`}>{iniciales(t.titulo)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] md:text-[13.5px] text-ink truncate">{t.titulo}</p>
                    <p className="text-[10px] text-ink-3">{fmtFecha(t.fecha)}{t.hora_inicio?` · ${t.hora_inicio}`:''}{t.lugar?` · ${t.lugar}`:''}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${tipoBadge(t.tipo)} hidden sm:inline`}>{t.tipo}</span>
                  <div className="text-right flex-shrink-0 hidden sm:block min-w-[90px]">
                    <p className={`text-sm font-medium ${pagoClass(t)}`}>{fmtEur(t.cobrado)}<span className="text-ink-3 font-normal"> / {fmtEur(t.precio_total)}</span></p>
                    <div className="h-1 bg-cream-dark rounded-full mt-0.5 overflow-hidden w-full">
                      <div className="h-full bg-emerald-500 rounded-full" style={{width:`${t.precio_total>0?Math.min(100,(t.cobrado/t.precio_total)*100):0}%`}}/>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 hidden md:inline ${t.estado_entrega==='Entregado'?'bg-emerald-100 text-emerald-700':t.estado_entrega==='Editando'?'bg-amber-100 text-amber-700':'bg-cream-dark text-ink-3'}`}>{t.estado_entrega||'Pendiente'}</span>
                  <ChevronRight size={14} className="text-ink-3 flex-shrink-0"/>
                </Link>
              ))}
            </div>
          </div>
        ))
      }
    </div>
  )
}
