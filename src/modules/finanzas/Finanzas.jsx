import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { fmtEur } from '../../lib/utils'
import { Plus, Trash2 } from 'lucide-react'

const CATEGORIAS_GASTO = ['Equipo', 'Software', 'Formación', 'Seguros', 'Cuota Autónomo', 'Desplazamiento', 'Marketing', 'Gestoría', 'Otro']
const TRIMESTRES = ['T1 (Ene–Mar)', 'T2 (Abr–Jun)', 'T3 (Jul–Sep)', 'T4 (Oct–Dic)']

export default function Finanzas() {
  const { user } = useAuth()
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [trabajos, setTrabajos] = useState([])
  const [segundo, setSegundo] = useState([])
  const [gastos, setGastos] = useState([])
  const [config, setConfig] = useState({ objetivo_anual: 80000, irpf_pct: 15, iva_pct: 21, cuota_autonomo: 300 })
  const [loading, setLoading] = useState(true)
  const [modalGasto, setModalGasto] = useState(false)
  const [nuevoGasto, setNuevoGasto] = useState({ concepto: '', categoria: 'Otro', importe: '', fecha: new Date().toISOString().split('T')[0], es_recurrente: false })
  const [tab, setTab] = useState('resumen') // resumen | trimestral | gastos

  useEffect(() => { if (user) cargar() }, [user, anio])

  async function cargar() {
    setLoading(true)
    const [{ data: t }, { data: s }, { data: g }, { data: c }] = await Promise.all([
      supabase.from('v2_trabajos').select('tipo,precio_total,cobrado,gasto_segundo,gasto_album,gasto_desplaz,gasto_material,fecha,estado')
        .eq('user_id', user.id).is('deleted_at', null)
        .gte('fecha', `${anio}-01-01`).lte('fecha', `${anio}-12-31`)
        .neq('estado', 'Cancelado'),
      supabase.from('v2_segundo_fotografo').select('honorarios,cobrado,gastos,fecha,estado')
        .eq('user_id', user.id).is('deleted_at', null)
        .gte('fecha', `${anio}-01-01`).lte('fecha', `${anio}-12-31`)
        .neq('estado', 'Cancelado'),
      supabase.from('v2_gastos_generales').select('*').eq('user_id', user.id)
        .gte('fecha', `${anio}-01-01`).lte('fecha', `${anio}-12-31`)
        .order('fecha', { ascending: false }),
      supabase.from('v2_config').select('*').eq('user_id', user.id).single(),
    ])
    setTrabajos(t || [])
    setSegundo(s || [])
    setGastos(g || [])
    if (c) setConfig(c)
    setLoading(false)
  }

  // Cálculos principales
  const ingresosTrabajos = trabajos.reduce((s, t) => s + (t.precio_total || 0), 0)
  const ingresosSegundo = segundo.reduce((s, t) => s + (t.honorarios || 0), 0)
  const ingresosTotales = ingresosTrabajos + ingresosSegundo

  const cobradoTrabajos = trabajos.reduce((s, t) => s + (t.cobrado || 0), 0)
  const cobradoSegundo = segundo.reduce((s, t) => s + (t.cobrado || 0), 0)
  const cobradoTotal = cobradoTrabajos + cobradoSegundo

  const gastosDirectos = trabajos.reduce((s, t) =>
    s + (t.gasto_segundo||0) + (t.gasto_album||0) + (t.gasto_desplaz||0) + (t.gasto_material||0), 0)
  const gastosGeneralesTotal = gastos.reduce((s, g) => s + (g.importe || 0), 0)
  const gastosTotal = gastosDirectos + gastosGeneralesTotal
    + (config.cuota_autonomo * 12)

  const benefBruto = ingresosTotales - gastosDirectos
  const benefNeto = ingresosTotales - gastosTotal

  const baseIRPF = ingresosTotales * (1 - 1 / (1 + config.iva_pct / 100))
  const ivaRepercutido = ingresosTotales - (ingresosTotales / (1 + config.iva_pct / 100))
  const ivaDeducible = gastosDirectos * (config.iva_pct / 100)
  const ivaPagar = ivaRepercutido - ivaDeducible
  const irpf = (ingresosTotales / (1 + config.iva_pct / 100)) * (config.irpf_pct / 100)

  // Por tipo
  const porTipo = trabajos.reduce((acc, t) => {
    const tipo = t.tipo || 'Otros'
    if (!acc[tipo]) acc[tipo] = { ingresos: 0, cobrado: 0, count: 0 }
    acc[tipo].ingresos += t.precio_total || 0
    acc[tipo].cobrado += t.cobrado || 0
    acc[tipo].count++
    return acc
  }, {})
  if (ingresosSegundo > 0) porTipo['2º Fotógrafo'] = { ingresos: ingresosSegundo, cobrado: cobradoSegundo, count: segundo.length }

  // Por trimestre
  const porTrimestre = [1,2,3,4].map(q => {
    const meses = [(q-1)*3+1, (q-1)*3+2, q*3]
    const t = trabajos.filter(x => x.fecha && meses.includes(new Date(x.fecha).getMonth() + 1))
    const s = segundo.filter(x => x.fecha && meses.includes(new Date(x.fecha).getMonth() + 1))
    const ing = t.reduce((a,x) => a+(x.precio_total||0),0) + s.reduce((a,x) => a+(x.honorarios||0),0)
    const cob = t.reduce((a,x) => a+(x.cobrado||0),0) + s.reduce((a,x) => a+(x.cobrado||0),0)
    const gDir = t.reduce((a,x) => a+(x.gasto_segundo||0)+(x.gasto_album||0)+(x.gasto_desplaz||0)+(x.gasto_material||0),0)
    const gGen = gastos.filter(x => x.fecha && meses.includes(new Date(x.fecha).getMonth() + 1)).reduce((a,x)=>a+(x.importe||0),0)
    return { q, ing, cob, gastos: gDir + gGen, benef: ing - gDir - gGen }
  })

  async function addGasto(e) {
    e.preventDefault()
    await supabase.from('v2_gastos_generales').insert({
      user_id: user.id,
      concepto: nuevoGasto.concepto,
      categoria: nuevoGasto.categoria,
      importe: parseFloat(nuevoGasto.importe) || 0,
      fecha: nuevoGasto.fecha,
      es_recurrente: nuevoGasto.es_recurrente,
    })
    setModalGasto(false)
    setNuevoGasto({ concepto: '', categoria: 'Otro', importe: '', fecha: new Date().toISOString().split('T')[0], es_recurrente: false })
    cargar()
  }

  async function deleteGasto(id) {
    await supabase.from('v2_gastos_generales').delete().eq('id', id)
    setGastos(g => g.filter(x => x.id !== id))
  }

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setTab(id)}
      className={`px-4 py-2 text-sm border-b-2 transition-all ${tab === id ? 'border-brand text-brand font-medium' : 'border-transparent text-ink-3 hover:text-ink'}`}>
      {label}
    </button>
  )

  if (loading) return <div className="flex items-center justify-center h-64 text-ink-3 text-sm">Cargando…</div>

  return (
    <div className="p-4 md:p-7">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-[15px] font-medium text-ink">Finanzas</h1>
          <select value={anio} onChange={e => setAnio(+e.target.value)} className="select text-sm w-24 py-1.5">
            {[2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { l: 'Facturado', v: fmtEur(ingresosTotales), hi: true },
          { l: 'Cobrado', v: fmtEur(cobradoTotal) },
          { l: 'Pendiente cobro', v: fmtEur(ingresosTotales - cobradoTotal), warn: true },
          { l: 'Gastos totales', v: fmtEur(gastosTotal), red: true },
          { l: 'Beneficio neto', v: fmtEur(benefNeto), hi: true },
        ].map(k => (
          <div key={k.l} className="card p-4">
            <p className="text-[10px] text-ink-3 mb-2">{k.l}</p>
            <p className={`font-serif text-2xl leading-none ${k.hi ? 'text-brand' : k.warn ? 'text-amber-600' : k.red ? 'text-red-600' : 'text-ink'}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-cream-dark mb-5">
        <TabBtn id="resumen" label="Resumen" />
        <TabBtn id="trimestral" label="Por trimestre" />
        <TabBtn id="fiscal" label="Fiscal" />
        <TabBtn id="gastos" label="Gastos generales" />
      </div>

      {/* ── RESUMEN ── */}
      {tab === 'resumen' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-5">
            <p className="text-xs font-medium text-ink-2 uppercase tracking-wide mb-4">Ingresos por tipo</p>
            <div className="space-y-3">
              {Object.entries(porTipo).sort((a,b) => b[1].ingresos - a[1].ingresos).map(([tipo, d]) => (
                <div key={tipo}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-ink">{tipo} <span className="text-ink-3 text-xs">({d.count})</span></span>
                    <span className="font-serif text-base text-brand">{fmtEur(d.ingresos)}</span>
                  </div>
                  <div className="h-1.5 bg-cream-dark rounded-full overflow-hidden">
                    <div className="h-full bg-brand/60 rounded-full" style={{ width: `${ingresosTotales > 0 ? (d.ingresos/ingresosTotales)*100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <p className="text-xs font-medium text-ink-2 uppercase tracking-wide mb-4">Cuenta de resultados</p>
            <div className="space-y-2.5">
              <Row label="Ingresos totales" value={fmtEur(ingresosTotales)} bold />
              <Row label="— Gastos directos" value={`– ${fmtEur(gastosDirectos)}`} red />
              <Row label="Beneficio bruto" value={fmtEur(benefBruto)} bold />
              <div className="border-t border-cream-dark pt-2.5 space-y-2">
                <Row label="— Gastos generales" value={`– ${fmtEur(gastosGeneralesTotal)}`} red />
                <Row label="— Cuota autónomo (anual)" value={`– ${fmtEur(config.cuota_autonomo * 12)}`} red />
              </div>
              <div className="border-t border-cream-dark pt-2.5">
                <Row label="Beneficio neto" value={fmtEur(benefNeto)} bold hi />
              </div>
              <div className="border-t border-cream-dark pt-2.5">
                <Row label="Objetivo anual" value={fmtEur(config.objetivo_anual)} />
                <div className="mt-1.5 h-1.5 bg-cream-dark rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full" style={{ width: `${Math.min(100,(ingresosTotales/config.objetivo_anual)*100)}%` }} />
                </div>
                <p className="text-xs text-ink-3 mt-1">{Math.round((ingresosTotales/config.objetivo_anual)*100)}% conseguido</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TRIMESTRAL ── */}
      {tab === 'trimestral' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {porTrimestre.map(({ q, ing, cob, gastos: g, benef }) => (
            <div key={q} className="card p-4">
              <p className="text-xs font-medium text-ink-2 uppercase tracking-wide mb-3">{TRIMESTRES[q-1]}</p>
              <div className="space-y-2.5">
                <Row label="Facturado" value={fmtEur(ing)} bold />
                <Row label="Cobrado" value={fmtEur(cob)} />
                <Row label="Gastos" value={`– ${fmtEur(g)}`} red />
                <div className="border-t border-cream-dark pt-2.5">
                  <Row label="Beneficio" value={fmtEur(benef)} bold hi />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FISCAL ── */}
      {tab === 'fiscal' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-5">
            <p className="text-xs font-medium text-ink-2 uppercase tracking-wide mb-4">IVA (21%)</p>
            <div className="space-y-2.5">
              <Row label="IVA repercutido (ingresos)" value={fmtEur(ivaRepercutido)} />
              <Row label="IVA deducible (gastos)" value={`– ${fmtEur(ivaDeducible)}`} red />
              <div className="border-t border-cream-dark pt-2.5">
                <Row label="IVA a pagar" value={fmtEur(ivaPagar)} bold hi />
              </div>
            </div>
            <div className="mt-5 bg-amber-50 rounded-lg p-3 text-xs text-amber-700">
              Pago trimestral aprox: <strong>{fmtEur(ivaPagar / 4)}</strong> / trimestre
            </div>
          </div>
          <div className="card p-5">
            <p className="text-xs font-medium text-ink-2 uppercase tracking-wide mb-4">IRPF ({config.irpf_pct}%)</p>
            <div className="space-y-2.5">
              <Row label="Base imponible" value={fmtEur(ingresosTotales / (1 + config.iva_pct/100))} />
              <Row label={`Retención ${config.irpf_pct}%`} value={`– ${fmtEur(irpf)}`} red />
            </div>
            <div className="mt-4 bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
              Retención por factura: <strong>{config.irpf_pct}%</strong> sobre base imponible
            </div>
            <div className="mt-3 border-t border-cream-dark pt-3">
              <p className="text-xs font-medium text-ink-2 uppercase tracking-wide mb-2">Cuota autónomo</p>
              <Row label="Mensual" value={fmtEur(config.cuota_autonomo)} />
              <Row label="Anual" value={fmtEur(config.cuota_autonomo * 12)} bold />
            </div>
          </div>
        </div>
      )}

      {/* ── GASTOS GENERALES ── */}
      {tab === 'gastos' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-ink-3">Total: <span className="font-serif text-base text-ink">{fmtEur(gastosGeneralesTotal)}</span></p>
            <button onClick={() => setModalGasto(true)} className="btn-primary"><Plus size={14} /> Añadir gasto</button>
          </div>
          <div className="card overflow-hidden">
            {gastos.length === 0 ? (
              <p className="text-sm text-ink-3 p-5 text-center">Sin gastos registrados</p>
            ) : gastos.map((g, i) => (
              <div key={g.id} className={`flex items-center gap-3 px-4 py-3 ${i < gastos.length-1 ? 'border-b border-cream-dark' : ''} group`}>
                <div className="flex-1">
                  <p className="text-sm text-ink">{g.concepto}</p>
                  <p className="text-xs text-ink-3">{g.categoria} · {new Date(g.fecha).toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' })}</p>
                </div>
                {g.es_recurrente && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Recurrente</span>}
                <span className="font-serif text-base text-ink">{fmtEur(g.importe)}</span>
                <button onClick={() => deleteGasto(g.id)} className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-red-500 transition-all ml-1">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal nuevo gasto */}
      {modalGasto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="font-medium text-ink mb-4">Nuevo gasto</h3>
            <form onSubmit={addGasto} className="space-y-3">
              <div>
                <label className="label">Concepto</label>
                <input value={nuevoGasto.concepto} onChange={e => setNuevoGasto(g => ({...g, concepto: e.target.value}))} className="input text-sm" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Categoría</label>
                  <select value={nuevoGasto.categoria} onChange={e => setNuevoGasto(g => ({...g, categoria: e.target.value}))} className="select text-sm">
                    {CATEGORIAS_GASTO.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Importe (€)</label>
                  <input type="number" value={nuevoGasto.importe} onChange={e => setNuevoGasto(g => ({...g, importe: e.target.value}))} className="input text-sm" required />
                </div>
              </div>
              <div>
                <label className="label">Fecha</label>
                <input type="date" value={nuevoGasto.fecha} onChange={e => setNuevoGasto(g => ({...g, fecha: e.target.value}))} className="input text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                <input type="checkbox" checked={nuevoGasto.es_recurrente} onChange={e => setNuevoGasto(g => ({...g, es_recurrente: e.target.checked}))} className="rounded" />
                Gasto recurrente
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalGasto(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
                <button type="submit" className="btn-primary flex-1 justify-center">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, bold, hi, red }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? 'font-medium text-ink' : 'text-ink-2'}`}>{label}</span>
      <span className={`font-serif text-base ${hi ? 'text-brand' : red ? 'text-red-600' : 'text-ink'}`}>{value}</span>
    </div>
  )
}
