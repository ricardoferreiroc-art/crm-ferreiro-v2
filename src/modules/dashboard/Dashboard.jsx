import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { fmtFecha, fmtEur, diasHasta, iniciales, avatarColor, tipoBadge } from '../../lib/utils'
import { AlertTriangle, Coins, PenLine, Image, ArrowRight, Plus } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState({
    kpis: { facturado: 0, cobrado: 0, bodas: 0, leads: 0, objetivo: 80000 },
    proximos: [],
    leads: [],
    alertas: [],
    cobros: [],
  })
  const [loading, setLoading] = useState(true)
  const anio = new Date().getFullYear()

  const saludo = () => {
    const h = new Date().getHours()
    if (h < 13) return 'Buenos días'
    if (h < 21) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const fechaHoy = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  useEffect(() => {
    if (!user) return
    cargar()
  }, [user])

  async function cargar() {
    setLoading(true)
    try {
      const uid = user.id

      // Trabajos del año
      const { data: trabajos } = await supabase
        .from('v2_trabajos')
        .select('id, tipo, titulo, fecha, hora_inicio, lugar, ciudad, estado, precio_total, cobrado, deleted_at')
        .eq('user_id', uid)
        .is('deleted_at', null)
        .gte('fecha', `${anio}-01-01`)
        .order('fecha', { ascending: true })

      // 2º fotógrafo del año
      const { data: segundo } = await supabase
        .from('v2_segundo_fotografo')
        .select('id, novios, fecha, hora, lugar, honorarios, cobrado, estado, deleted_at')
        .eq('user_id', uid)
        .is('deleted_at', null)
        .gte('fecha', `${anio}-01-01`)
        .order('fecha', { ascending: true })

      // Leads activos
      const { data: leads } = await supabase
        .from('v2_leads')
        .select('id, nombre, tipo_trabajo, fecha_evento, estado, precio_acordado, created_at, deleted_at')
        .eq('user_id', uid)
        .is('deleted_at', null)
        .not('estado', 'in', '(Confirmado,Descartado)')
        .order('created_at', { ascending: false })
        .limit(5)

      // Alertas activas
      const { data: alertas } = await supabase
        .from('v2_alertas')
        .select('*')
        .eq('user_id', uid)
        .eq('completada', false)
        .order('fecha_alerta', { ascending: true })
        .limit(6)

      // Config objetivo
      const { data: config } = await supabase
        .from('v2_config')
        .select('objetivo_anual')
        .eq('user_id', uid)
        .single()

      const hoy = new Date().toISOString().split('T')[0]

      const proximos = [
        ...(trabajos || []).filter(t => t.fecha >= hoy).slice(0, 5).map(t => ({ ...t, _tipo: 'trabajo' })),
        ...(segundo || []).filter(s => s.fecha >= hoy).slice(0, 3).map(s => ({
          id: s.id, titulo: s.novios || 'Sin nombre', tipo: '2º Fotógrafo',
          fecha: s.fecha, hora_inicio: s.hora, lugar: s.lugar, cobrado: s.cobrado,
          precio_total: s.honorarios, estado: s.estado, _tipo: 'segundo'
        })),
      ].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 7)

      const facturado = (trabajos || []).reduce((s, t) => s + (t.precio_total || 0), 0)
        + (segundo || []).reduce((s, t) => s + (t.honorarios || 0), 0)
      const cobrado = (trabajos || []).reduce((s, t) => s + (t.cobrado || 0), 0)
        + (segundo || []).reduce((s, t) => s + (t.cobrado || 0), 0)

      // Cobros próximos (trabajo con precio - cobrado > 0 y fecha próxima)
      const cobros = (trabajos || [])
        .filter(t => t.fecha >= hoy && (t.precio_total - t.cobrado) > 0)
        .slice(0, 4)

      setData({
        kpis: {
          facturado,
          cobrado,
          bodas: (trabajos || []).filter(t => ['Boda', 'Elopement'].includes(t.tipo)).length,
          leads: (leads || []).length,
          objetivo: config?.objetivo_anual || 80000,
        },
        proximos,
        leads: leads || [],
        alertas: alertas || [],
        cobros,
      })
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const { kpis, proximos, leads, alertas, cobros } = data
  const pct = Math.min(100, Math.round((kpis.facturado / kpis.objetivo) * 100))

  const alertaIcon = (tipo) => {
    const m = {
      cobro: <Coins size={13} />,
      entrega: <Image size={13} />,
      contrato: <PenLine size={13} />,
      recordatorio: <AlertTriangle size={13} />,
    }
    return m[tipo] || <AlertTriangle size={13} />
  }

  const alertaColor = (prioridad) => ({
    critica: 'danger', alta: 'warn', normal: 'info',
  }[prioridad] || 'info')

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-ink-3 text-sm">
      Cargando…
    </div>
  )

  return (
    <div className="grid grid-cols-[1fr_282px] min-h-[calc(100vh-54px)]">

      {/* MAIN */}
      <div className="p-7 flex flex-col gap-5">

        {/* Saludo */}
        <div className="flex items-baseline justify-between">
          <span className="font-serif italic text-[23px] text-ink">{saludo()}, Ricardo</span>
          <span className="text-[11px] text-ink-3 capitalize">{fechaHoy}</span>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-2.5">
          <div className="card p-4">
            <p className="text-[10.5px] text-ink-3 mb-2">Facturado {anio}</p>
            <p className="font-serif text-[28px] text-brand leading-none">{fmtEur(kpis.facturado)}</p>
            <p className="text-[11px] text-ink-3 mt-1.5">{pct}% del objetivo</p>
          </div>
          <div className="card p-4">
            <p className="text-[10.5px] text-ink-3 mb-2">Cobrado</p>
            <p className="font-serif text-[28px] text-ink leading-none">{fmtEur(kpis.cobrado)}</p>
            <p className="text-[11px] text-ink-3 mt-1.5">{fmtEur(kpis.facturado - kpis.cobrado)} pendiente</p>
          </div>
          <div className="card p-4">
            <p className="text-[10.5px] text-ink-3 mb-2">Bodas confirmadas</p>
            <p className="font-serif text-[28px] text-ink leading-none">{kpis.bodas}</p>
            <p className="text-[11px] text-ink-3 mt-1.5">en {anio}</p>
          </div>
          <div className="card p-4">
            <p className="text-[10.5px] text-ink-3 mb-2">Leads activos</p>
            <p className="font-serif text-[28px] text-ink leading-none">{kpis.leads}</p>
            <p className="text-[11px] text-ink-3 mt-1.5">en pipeline</p>
          </div>
        </div>

        {/* Próximos trabajos */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-medium text-ink-2">Próximos trabajos</span>
            <Link to="/trabajos" className="btn-ghost text-[11px]">
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          <div className="card overflow-hidden">
            {proximos.length === 0 ? (
              <p className="text-sm text-ink-3 p-5 text-center">No hay trabajos próximos</p>
            ) : proximos.map((t, i) => {
              const dias = diasHasta(t.fecha)
              return (
                <Link
                  key={t.id + (t._tipo || '')}
                  to={t._tipo === 'segundo' ? `/trabajos/segundo/${t.id}` : `/trabajos/${t.id}`}
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-brand/[.03] transition-colors cursor-pointer
                    ${i < proximos.length - 1 ? 'border-b border-cream-dark' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0 ${avatarColor(t.tipo)}`}>
                    {iniciales(t.titulo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] text-ink truncate">{t.titulo}</p>
                    <p className="text-[10.5px] text-ink-3">
                      {fmtFecha(t.fecha)}{t.hora_inicio ? ` · ${t.hora_inicio}` : ''}
                    </p>
                  </div>
                  {t.lugar && (
                    <span className="text-[10.5px] text-ink-3 text-right pr-2.5 flex-1 truncate">{t.lugar}</span>
                  )}
                  <span className={`text-[10.5px] px-2.5 py-0.5 rounded-full ${tipoBadge(t.tipo)} flex-shrink-0`}>
                    {t.tipo}
                  </span>
                  <span className={`text-[10.5px] min-w-[28px] text-right font-medium flex-shrink-0
                    ${dias !== null && dias <= 3 ? 'text-red-600' : 'text-ink-3'}`}>
                    {dias !== null ? `${dias}d` : '—'}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Pipeline leads (resumen) */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-medium text-ink-2">Leads activos</span>
            <Link to="/leads" className="btn-ghost text-[11px]">
              Pipeline <ArrowRight size={12} />
            </Link>
          </div>
          {leads.length === 0 ? (
            <div className="card p-5 text-center text-sm text-ink-3">Sin leads activos</div>
          ) : (
            <div className="card overflow-hidden">
              {leads.map((l, i) => (
                <Link
                  key={l.id}
                  to={`/leads/${l.id}`}
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-brand/[.03] transition-colors
                    ${i < leads.length - 1 ? 'border-b border-cream-dark' : ''}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0 ${avatarColor(l.tipo_trabajo)}`}>
                    {iniciales(l.nombre)}
                  </div>
                  <p className="text-[13px] text-ink flex-1">{l.nombre}</p>
                  <span className="text-[10.5px] text-ink-3">{l.tipo_trabajo}</span>
                  <span className={`text-[10.5px] px-2.5 py-0.5 rounded-full ml-2 flex-shrink-0
                    ${l.estado === 'Contrato enviado' || l.estado === 'Firmado' ? 'bg-brand/10 text-brand' : 'bg-cream-dark text-ink-3'}`}>
                    {l.estado}
                  </span>
                  {l.precio_acordado && (
                    <span className="font-serif text-[13px] text-brand ml-2 flex-shrink-0">
                      {fmtEur(l.precio_acordado)}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ASIDE */}
      <div className="border-l border-brand/[.08] p-5 flex flex-col gap-4">

        {/* Alertas */}
        <div>
          <div className="flex items-center mb-2.5">
            <span className="text-[11px] font-medium text-ink-2">Alertas</span>
            {alertas.filter(a => a.prioridad === 'critica').length > 0 && (
              <span className="ml-2 bg-brand text-white text-[9px] font-medium px-2 py-0.5 rounded-full">
                {alertas.filter(a => a.prioridad === 'critica').length} críticas
              </span>
            )}
          </div>
          {alertas.length === 0 ? (
            <div className="bg-emerald-50 text-emerald-700 text-xs rounded-lg px-3 py-2.5">
              Todo al día ✓
            </div>
          ) : alertas.map(a => (
            <div key={a.id} className="flex gap-2.5 py-2 border-b border-cream-dark last:border-0">
              <div className={`w-[27px] h-[27px] rounded-[6px] flex items-center justify-center flex-shrink-0 mt-0.5
                ${alertaColor(a.prioridad) === 'danger' ? 'bg-red-100 text-red-700' :
                  alertaColor(a.prioridad) === 'warn' ? 'bg-amber-100 text-amber-700' :
                  'bg-brand/10 text-brand'}`}>
                {alertaIcon(a.tipo)}
              </div>
              <div>
                <p className="text-[12px] text-ink leading-snug">{a.titulo}</p>
                {a.descripcion && (
                  <p className="text-[10.5px] text-ink-3 mt-0.5">{a.descripcion}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Cobros próximos */}
        <div className="border-t border-brand/[.07] pt-4">
          <span className="text-[11px] font-medium text-ink-2 block mb-2.5">Cobros próximos</span>
          {cobros.length === 0 ? (
            <p className="text-xs text-ink-3">Sin cobros pendientes próximos</p>
          ) : cobros.map(t => (
            <div key={t.id} className="flex items-center justify-between py-2 border-b border-cream-dark last:border-0">
              <div>
                <p className="text-[12.5px] text-ink">{t.titulo}</p>
                <p className="text-[10.5px] text-ink-3">{fmtFecha(t.fecha)}</p>
              </div>
              <span className="font-serif text-[15px] text-brand">
                {fmtEur(t.precio_total - t.cobrado)}
              </span>
            </div>
          ))}
        </div>

        {/* Objetivo */}
        <div className="border-t border-brand/[.07] pt-4">
          <span className="text-[11px] font-medium text-ink-2 block mb-2.5">Objetivo {anio}</span>
          <div className="flex items-baseline justify-between mb-2">
            <span className="font-serif text-[17px] text-brand">{fmtEur(kpis.facturado)}</span>
            <span className="text-[11px] text-ink-3">de {fmtEur(kpis.objetivo)}</span>
          </div>
          <div className="bg-cream-dark rounded-full h-1 overflow-hidden">
            <div className="bg-brand h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[11px] text-ink-3 mt-1.5">{pct}% · faltan {fmtEur(kpis.objetivo - kpis.facturado)}</p>
        </div>

      </div>
    </div>
  )
}
