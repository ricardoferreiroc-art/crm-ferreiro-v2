import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { fmtFecha, fmtEur, diasHasta, iniciales, avatarColor, tipoBadge } from '../../lib/utils'
import { AlertTriangle, Coins, Image, FileText, Bell, ArrowRight } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const [d, setD] = useState({ kpis:{facturado:0,cobrado:0,bodas:0,leads:0,objetivo:80000}, proximos:[], leads:[], alertas:[], cobros:[] })
  const [loading, setLoading] = useState(true)
  const anio = new Date().getFullYear()

  const saludo = () => { const h = new Date().getHours(); return h<13?'Buenos días':h<21?'Buenas tardes':'Buenas noches' }
  const fechaHoy = new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'})

  useEffect(() => { if (user) cargar() }, [user])

  async function cargar() {
    setLoading(true)
    try {
      const hoy = new Date().toISOString().split('T')[0]
      const uid = user.id
      const [{ data: trabajos },{ data: segundo },{ data: leads },{ data: alertas },{ data: config }] = await Promise.all([
        supabase.from('v2_trabajos').select('id,tipo,titulo,fecha,hora_inicio,lugar,estado,precio_total,cobrado,estado_entrega,deleted_at').eq('user_id',uid).is('deleted_at',null).gte('fecha',`${anio}-01-01`).order('fecha',{ascending:true}),
        supabase.from('v2_segundo_fotografo').select('id,novios,fecha,hora,lugar,honorarios,cobrado,estado,deleted_at').eq('user_id',uid).is('deleted_at',null).gte('fecha',`${anio}-01-01`).order('fecha',{ascending:true}),
        supabase.from('v2_leads').select('id,nombre,tipo_trabajo,fecha_evento,estado,precio_acordado,created_at,deleted_at').eq('user_id',uid).is('deleted_at',null).not('estado','in','(Confirmado,Descartado)').order('created_at',{ascending:false}).limit(6),
        supabase.from('v2_alertas').select('id,titulo,descripcion,tipo,prioridad,fecha_alerta,completada,trabajo_id,lead_id').eq('user_id',uid).eq('completada',false).order('fecha_alerta',{ascending:true}).limit(6),
        supabase.from('v2_config').select('objetivo_anual').eq('user_id',uid).single(),
      ])
      const proximos = [
        ...(trabajos||[]).filter(t=>t.fecha>=hoy).slice(0,5).map(t=>({...t,_k:'trabajo'})),
        ...(segundo||[]).filter(s=>s.fecha>=hoy).slice(0,3).map(s=>({id:s.id,titulo:s.novios||'—',tipo:'2º Fotógrafo',fecha:s.fecha,hora_inicio:s.hora,lugar:s.lugar,cobrado:s.cobrado,precio_total:s.honorarios,_k:'segundo'})),
      ].sort((a,b)=>a.fecha.localeCompare(b.fecha)).slice(0,7)
      const facturado = (trabajos||[]).reduce((s,t)=>s+(t.precio_total||0),0)+(segundo||[]).reduce((s,t)=>s+(t.honorarios||0),0)
      const cobrado = (trabajos||[]).reduce((s,t)=>s+(t.cobrado||0),0)+(segundo||[]).reduce((s,t)=>s+(t.cobrado||0),0)
      const cobros = (trabajos||[]).filter(t=>t.fecha>=hoy&&(t.precio_total-t.cobrado)>0).slice(0,4)
      setD({ kpis:{facturado,cobrado,bodas:(trabajos||[]).filter(t=>['Boda','Elopement'].includes(t.tipo)).length,leads:(leads||[]).length,objetivo:config?.objetivo_anual||80000}, proximos,leads:leads||[],alertas:alertas||[],cobros })
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const pct = Math.min(100,Math.round((d.kpis.facturado/d.kpis.objetivo)*100))
  const ICONO = { cobro:<Coins size={12}/>, entrega:<Image size={12}/>, contrato:<FileText size={12}/>, recordatorio:<Bell size={12}/> }
  const PRIO = { critica:'bg-red-100 text-red-700', alta:'bg-amber-100 text-amber-700', normal:'bg-brand/10 text-brand', baja:'bg-cream-dark text-ink-3' }

  if (loading) return <div className="flex items-center justify-center h-64 text-ink-3 text-sm">Cargando…</div>

  return (
    <div className="p-4 md:p-0 md:grid md:grid-cols-[1fr_290px] min-h-[calc(100vh-54px)]">

      {/* MAIN */}
      <div className="md:p-7 flex flex-col gap-4 md:gap-5">

        {/* Saludo — oculto en móvil */}
        <div className="hidden md:flex items-baseline justify-between">
          <span className="font-serif italic text-[23px] text-ink">{saludo()}, Ricardo</span>
          <span className="text-[11px] text-ink-3 capitalize">{fechaHoy}</span>
        </div>

        {/* KPIs — scroll horizontal en móvil */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-2.5">
          {[
            { l:`Facturado ${anio}`, v:fmtEur(d.kpis.facturado), s:`${pct}% del objetivo`, hi:true },
            { l:'Cobrado', v:fmtEur(d.kpis.cobrado), s:`${fmtEur(d.kpis.facturado-d.kpis.cobrado)} pend.` },
            { l:'Bodas', v:d.kpis.bodas, s:`en ${anio}` },
            { l:'Leads', v:d.kpis.leads, s:'activos' },
          ].map(k=>(
            <div key={k.l} className="card p-3 md:p-4">
              <p className="text-[10px] text-ink-3 mb-1.5">{k.l}</p>
              <p className={`font-serif text-[22px] md:text-[28px] leading-none ${k.hi?'text-brand':'text-ink'}`}>{k.v}</p>
              <p className="text-[10px] text-ink-3 mt-1">{k.s}</p>
            </div>
          ))}
        </div>

        {/* Próximos trabajos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-ink-2">Próximos trabajos</span>
            <Link to="/trabajos" className="btn-ghost text-[11px]">Ver todos <ArrowRight size={12}/></Link>
          </div>
          <div className="card overflow-hidden">
            {d.proximos.length===0
              ? <p className="text-sm text-ink-3 p-4 text-center">No hay trabajos próximos</p>
              : d.proximos.map((t,i)=>{
                const dias=diasHasta(t.fecha)
                return (
                  <Link key={t.id+(t._k||'')} to={t._k==='segundo'?`/trabajos/segundo/${t.id}`:`/trabajos/${t.id}`}
                    className={`flex items-center gap-2.5 px-3 md:px-4 py-2.5 hover:bg-brand/[.03] transition-colors ${i<d.proximos.length-1?'border-b border-cream-dark':''}`}>
                    <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[9px] md:text-[10px] font-medium flex-shrink-0 ${avatarColor(t.tipo)}`}>{iniciales(t.titulo)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] md:text-[13px] text-ink truncate">{t.titulo}</p>
                      <p className="text-[10px] text-ink-3">{fmtFecha(t.fecha)}{t.hora_inicio?` · ${t.hora_inicio}`:''}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${tipoBadge(t.tipo)} hidden sm:inline`}>{t.tipo}</span>
                    <span className={`text-[10.5px] min-w-[24px] text-right flex-shrink-0 font-medium ${dias!==null&&dias<=3?'text-red-600':'text-ink-3'}`}>{dias!==null?`${dias}d`:'—'}</span>
                  </Link>
                )
              })
            }
          </div>
        </div>

        {/* Leads */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-ink-2">Leads activos</span>
            <Link to="/leads" className="btn-ghost text-[11px]">Pipeline <ArrowRight size={12}/></Link>
          </div>
          {d.leads.length===0
            ? <div className="card p-4 text-center text-sm text-ink-3">Sin leads activos</div>
            : <div className="card overflow-hidden">
                {d.leads.map((l,i)=>(
                  <Link key={l.id} to="/leads"
                    className={`flex items-center gap-2.5 px-3 md:px-4 py-2.5 hover:bg-brand/[.03] transition-colors ${i<d.leads.length-1?'border-b border-cream-dark':''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-medium flex-shrink-0 ${avatarColor(l.tipo_trabajo)}`}>{iniciales(l.nombre)}</div>
                    <p className="text-[12px] md:text-[13px] text-ink flex-1 truncate">{l.nombre}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${['Contrato enviado','Firmado'].includes(l.estado)?'bg-brand/10 text-brand':'bg-cream-dark text-ink-3'}`}>{l.estado}</span>
                    {l.precio_acordado&&<span className="font-serif text-[12px] md:text-[13px] text-brand ml-1 flex-shrink-0 hidden sm:block">{fmtEur(l.precio_acordado)}</span>}
                  </Link>
                ))}
              </div>
          }
        </div>

        {/* Alertas + cobros en móvil (aquí, no en aside) */}
        <div className="md:hidden space-y-4">
          <div>
            <div className="flex items-center mb-2">
              <span className="text-[11px] font-medium text-ink-2">Alertas</span>
              {d.alertas.filter(a=>a.prioridad==='critica').length>0&&<span className="ml-2 bg-red-600 text-white text-[9px] px-2 py-0.5 rounded-full">{d.alertas.filter(a=>a.prioridad==='critica').length} críticas</span>}
              <Link to="/alertas" className="ml-auto text-[10px] text-brand">Ver todas</Link>
            </div>
            {d.alertas.length===0
              ? <div className="bg-emerald-50 text-emerald-700 text-xs rounded-lg px-3 py-2.5">Todo al día ✓</div>
              : <div className="card overflow-hidden">
                  {d.alertas.slice(0,4).map((a,i)=>(
                    <div key={a.id} className={`flex gap-2.5 px-3 py-2.5 ${i<Math.min(d.alertas.length,4)-1?'border-b border-cream-dark':''}`}>
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${PRIO[a.prioridad]||PRIO.normal}`}>{ICONO[a.tipo]||<Bell size={12}/>}</div>
                      <div>
                        <p className="text-[12px] text-ink leading-snug">{a.titulo}</p>
                        {a.descripcion&&<p className="text-[10px] text-ink-3 mt-0.5">{a.descripcion}</p>}
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
          <div className="border-t border-brand/[.07] pt-4">
            <span className="text-[11px] font-medium text-ink-2 block mb-2">Objetivo {anio}</span>
            <div className="flex items-baseline justify-between mb-2">
              <span className="font-serif text-[16px] text-brand">{fmtEur(d.kpis.facturado)}</span>
              <span className="text-[11px] text-ink-3">de {fmtEur(d.kpis.objetivo)}</span>
            </div>
            <div className="bg-cream-dark rounded-full h-1.5 overflow-hidden">
              <div className="bg-brand h-full rounded-full" style={{width:`${pct}%`}}/>
            </div>
            <p className="text-[11px] text-ink-3 mt-1.5">{pct}% · faltan {fmtEur(d.kpis.objetivo-d.kpis.facturado)}</p>
          </div>
        </div>
      </div>

      {/* ASIDE — solo desktop */}
      <div className="hidden md:flex border-l border-brand/[.08] p-5 flex-col gap-4">
        <div>
          <div className="flex items-center mb-2.5">
            <span className="text-[11px] font-medium text-ink-2">Alertas</span>
            {d.alertas.filter(a=>a.prioridad==='critica').length>0&&<span className="ml-2 bg-red-600 text-white text-[9px] font-medium px-2 py-0.5 rounded-full">{d.alertas.filter(a=>a.prioridad==='critica').length} críticas</span>}
            <Link to="/alertas" className="ml-auto text-[10px] text-brand">Ver todas</Link>
          </div>
          {d.alertas.length===0
            ? <div className="bg-emerald-50 text-emerald-700 text-xs rounded-lg px-3 py-2.5">Todo al día ✓</div>
            : <div className="space-y-0">
                {d.alertas.map((a,i)=>(
                  <div key={a.id} className={`flex gap-2.5 py-2 ${i<d.alertas.length-1?'border-b border-cream-dark':''}`}>
                    <div className={`w-[26px] h-[26px] rounded-[6px] flex items-center justify-center flex-shrink-0 mt-0.5 ${PRIO[a.prioridad]||PRIO.normal}`}>{ICONO[a.tipo]||<Bell size={12}/>}</div>
                    <div>
                      <p className="text-[11.5px] text-ink leading-snug">{a.titulo}</p>
                      {a.descripcion&&<p className="text-[10px] text-ink-3 mt-0.5">{a.descripcion}</p>}
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
        <div className="border-t border-brand/[.07] pt-4">
          <span className="text-[11px] font-medium text-ink-2 block mb-2.5">Cobros próximos</span>
          {d.cobros.length===0?<p className="text-xs text-ink-3">Sin cobros pendientes próximos</p>
            :d.cobros.map(t=>(
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-cream-dark last:border-0">
                <div><p className="text-[12.5px] text-ink">{t.titulo}</p><p className="text-[10.5px] text-ink-3">{fmtFecha(t.fecha)}</p></div>
                <span className="font-serif text-[15px] text-brand">{fmtEur(t.precio_total-t.cobrado)}</span>
              </div>
            ))
          }
        </div>
        <div className="border-t border-brand/[.07] pt-4">
          <span className="text-[11px] font-medium text-ink-2 block mb-2.5">Objetivo {anio}</span>
          <div className="flex items-baseline justify-between mb-2">
            <span className="font-serif text-[17px] text-brand">{fmtEur(d.kpis.facturado)}</span>
            <span className="text-[11px] text-ink-3">de {fmtEur(d.kpis.objetivo)}</span>
          </div>
          <div className="bg-cream-dark rounded-full h-1 overflow-hidden">
            <div className="bg-brand h-full rounded-full transition-all" style={{width:`${pct}%`}}/>
          </div>
          <p className="text-[11px] text-ink-3 mt-1.5">{pct}% · faltan {fmtEur(d.kpis.objetivo-d.kpis.facturado)}</p>
        </div>
      </div>
    </div>
  )
}
