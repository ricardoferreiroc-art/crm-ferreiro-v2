import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { fmtEur, fmtFecha } from '../../lib/utils'
import { Plus, Trash2, Download, Send, ArrowLeft, FileText, Receipt, ClipboardList, Check, X } from 'lucide-react'

const TIPOS = {
  factura:     { label: 'Factura',     prefix: 'RF', icon: FileText,     color: 'bg-brand/10 text-brand' },
  recibo:      { label: 'Recibo',      prefix: 'REC', icon: Receipt,     color: 'bg-emerald-100 text-emerald-700' },
  presupuesto: { label: 'Presupuesto', prefix: 'PRE', icon: ClipboardList, color: 'bg-amber-100 text-amber-700' },
}

const LINEA_VACIA = () => ({
  tempId: Date.now() + Math.random(),
  concepto: '',
  cantidad: 1,
  precio_unitario: 0,
  iva_pct: 21,
  irpf_pct: 15,
})

export default function Documentos() {
  const { id } = useParams()
  const { user } = useAuth()
  const [trabajo, setTrabajo] = useState(null)
  const [docs, setDocs] = useState([])
  const [config, setConfig] = useState({})
  const [loading, setLoading] = useState(true)
  const [docActivo, setDocActivo] = useState(null) // doc en edición/vista
  const [modo, setModo] = useState('lista') // lista | nuevo | ver
  const [tipo, setTipo] = useState('factura')
  const [lineas, setLineas] = useState([LINEA_VACIA()])
  const [form, setForm] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [generandoPdf, setGenerandoPdf] = useState(false)

  useEffect(() => { if (user && id) cargar() }, [user, id])

  async function cargar() {
    setLoading(true)
    const [{ data: t }, { data: d }, { data: c }] = await Promise.all([
      supabase.from('v2_trabajos').select('*').eq('id', id).single(),
      supabase.from('v2_documentos').select('*').eq('trabajo_id', id).eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('v2_config').select('*').eq('user_id', user.id).single(),
    ])
    setTrabajo(t)
    setDocs(d || [])
    setConfig(c || {})
    setLoading(false)
  }

  function calcularTotales(lns) {
    let subtotal = 0, iva_total = 0, irpf_total = 0
    for (const l of lns) {
      const base = (l.cantidad || 1) * (l.precio_unitario || 0)
      subtotal += base
      iva_total += base * (l.iva_pct || 0) / 100
      irpf_total += base * (l.irpf_pct || 0) / 100
    }
    return { subtotal, iva_total, irpf_total, total: subtotal + iva_total - irpf_total }
  }

  function updateLinea(tempId, campo, valor) {
    setLineas(ls => ls.map(l => l.tempId === tempId ? { ...l, [campo]: campo === 'concepto' ? valor : parseFloat(valor) || 0 } : l))
  }

  async function nuevoDoc(tipoDoc) {
    setTipo(tipoDoc)
    setDocActivo(null)
    // Línea por defecto según tipo
    const precio = trabajo?.precio_total || 0
    setLineas([{
      ...LINEA_VACIA(),
      concepto: tipoDoc === 'presupuesto' ? 'Reportaje fotográfico' :
                tipoDoc === 'recibo' ? 'Pago recibido' :
                'Servicios de fotografía',
      precio_unitario: tipoDoc === 'recibo' ? (trabajo?.reserva || precio) : precio,
      iva_pct: config.iva_pct || 21,
      irpf_pct: tipoDoc === 'recibo' ? 0 : (config.irpf_pct || 15),
    }])
    setForm({
      cliente_nombre: trabajo?.titulo || '',
      cliente_email: '',
      cliente_direccion: '',
      fecha: new Date().toISOString().split('T')[0],
    })
    setModo('nuevo')
  }

  async function guardarDoc() {
    setGuardando(true)
    const tots = calcularTotales(lineas)
    const { data: numData } = await supabase.rpc('v2_siguiente_numero_doc', {
      p_user_id: user.id, p_tipo: tipo, p_anio: new Date().getFullYear()
    })

    const payload = {
      user_id: user.id,
      trabajo_id: parseInt(id),
      tipo,
      numero: numData || `${TIPOS[tipo].prefix}-${new Date().getFullYear()}-001`,
      fecha: form.fecha,
      cliente_nombre: form.cliente_nombre,
      cliente_email: form.cliente_email || null,
      cliente_nif: form.cliente_nif || null,
      cliente_direccion: form.cliente_direccion || null,
      cliente_ciudad: form.cliente_ciudad || null,
      cliente_cp: form.cliente_cp || null,
      emisor_nombre: config.nombre_negocio || 'Ricardo Ferreiro',
      emisor_nif: config.nif || null,
      emisor_direccion: config.direccion_fiscal || null,
      emisor_ciudad: config.ciudad_fiscal || null,
      emisor_cp: config.cp_fiscal || null,
      lineas: lineas.map(({ tempId, ...l }) => l),
      ...tots,
      notas: form.notas || null,
      estado: 'borrador',
    }
    const { data } = await supabase.from('v2_documentos').insert(payload).select().single()
    if (data) {
      setDocs(d => [data, ...d])
      setDocActivo(data)
      setModo('ver')
    }
    setGuardando(false)
  }

  async function generarPDF(doc) {
    setGenerandoPdf(true)
    // Abrimos ventana con HTML para imprimir/guardar como PDF
    const win = window.open('', '_blank', 'width=900,height=700')
    win.document.write(htmlFactura(doc))
    win.document.close()
    setTimeout(() => { win.print(); setGenerandoPdf(false) }, 500)
  }

  function htmlFactura(doc) {
    const lns = doc.lineas || []
    const tipoLabel = TIPOS[doc.tipo]?.label || doc.tipo
    const esRecibo = doc.tipo === 'recibo'

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${tipoLabel} ${doc.numero}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color:#111; background:#fff; padding:0; }
  .page { max-width:794px; margin:0 auto; padding:48px 52px; min-height:1123px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:48px; }
  .logo-area { display:flex; flex-direction:column; gap:3px; }
  .logo-name { font-size:20px; font-weight:600; letter-spacing:.18em; text-transform:uppercase; color:#000499; }
  .logo-sub { font-style:italic; color:#888; font-size:11px; letter-spacing:.04em; }
  .doc-meta { text-align:right; }
  .doc-tipo { font-size:22px; font-weight:300; color:#000499; margin-bottom:4px; }
  .doc-num { font-size:13px; color:#555; font-weight:500; }
  .doc-fecha { font-size:12px; color:#888; margin-top:2px; }
  .divider { border:none; border-top:1px solid #eee; margin:24px 0; }
  .partes { display:grid; grid-template-columns:1fr 1fr; gap:32px; margin-bottom:36px; }
  .parte h3 { font-size:10px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:#999; margin-bottom:10px; }
  .parte p { font-size:13px; color:#333; line-height:1.6; }
  table { width:100%; border-collapse:collapse; margin-bottom:24px; }
  thead th { background:#f4f5f0; padding:10px 12px; text-align:left; font-size:11px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:#666; }
  tbody td { padding:12px; font-size:13px; color:#333; border-bottom:1px solid #f0f0f0; }
  tbody tr:last-child td { border-bottom:none; }
  td.num { text-align:right; font-variant-numeric:tabular-nums; }
  .totales { margin-left:auto; width:260px; }
  .totales-row { display:flex; justify-content:space-between; padding:5px 0; font-size:13px; color:#555; }
  .totales-row.total { font-weight:600; font-size:15px; color:#000499; border-top:1.5px solid #000499; margin-top:4px; padding-top:10px; }
  .notas { margin-top:32px; padding:14px 16px; background:#f9f9f7; border-radius:6px; font-size:12px; color:#666; line-height:1.6; }
  .footer { margin-top:48px; padding-top:16px; border-top:1px solid #eee; display:flex; justify-content:space-between; font-size:11px; color:#aaa; }
  .firma-area { margin-top:64px; display:grid; grid-template-columns:1fr 1fr; gap:48px; }
  .firma-box { border-top:1px solid #ccc; padding-top:8px; font-size:11px; color:#888; text-align:center; }
  @media print { .page { padding:32px 40px; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-area">
      <span class="logo-name">${doc.emisor_nombre || 'Ferreiro'}</span>
      <span class="logo-sub">capturing moments</span>
    </div>
    <div class="doc-meta">
      <div class="doc-tipo">${tipoLabel}</div>
      <div class="doc-num">${doc.numero}</div>
      <div class="doc-fecha">${new Date(doc.fecha).toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}</div>
    </div>
  </div>
  <hr class="divider"/>
  <div class="partes">
    <div class="parte">
      <h3>Emisor</h3>
      <p><strong>${doc.emisor_nombre || ''}</strong><br>
      ${doc.emisor_nif ? `NIF: ${doc.emisor_nif}<br>` : ''}
      ${doc.emisor_direccion ? `${doc.emisor_direccion}<br>` : ''}
      ${doc.emisor_ciudad ? doc.emisor_ciudad : ''}
      ${doc.emisor_cp ? ` · ${doc.emisor_cp}` : ''}</p>
    </div>
    <div class="parte">
      <h3>Cliente</h3>
      <p><strong>${doc.cliente_nombre || ''}</strong><br>
      ${doc.cliente_nif ? `NIF/DNI: ${doc.cliente_nif}<br>` : ''}
      ${doc.cliente_direccion ? `${doc.cliente_direccion}<br>` : ''}
      ${doc.cliente_ciudad ? doc.cliente_ciudad : ''}
      ${doc.cliente_cp ? ` · ${doc.cliente_cp}` : ''}
      ${doc.cliente_email ? `<br>${doc.cliente_email}` : ''}</p>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Concepto</th>
        <th style="width:60px;text-align:right">Uds.</th>
        <th style="width:100px;text-align:right">Precio unit.</th>
        ${!esRecibo ? `<th style="width:60px;text-align:right">IVA</th><th style="width:60px;text-align:right">IRPF</th>` : ''}
        <th style="width:100px;text-align:right">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${lns.map(l => {
        const base = (l.cantidad||1)*(l.precio_unitario||0)
        return `<tr>
          <td>${l.concepto}</td>
          <td class="num">${l.cantidad||1}</td>
          <td class="num">${(l.precio_unitario||0).toLocaleString('es-ES',{style:'currency',currency:'EUR'})}</td>
          ${!esRecibo ? `<td class="num">${l.iva_pct||0}%</td><td class="num">${l.irpf_pct||0}%</td>` : ''}
          <td class="num">${base.toLocaleString('es-ES',{style:'currency',currency:'EUR'})}</td>
        </tr>`
      }).join('')}
    </tbody>
  </table>
  <div class="totales">
    <div class="totales-row"><span>Subtotal</span><span>${(doc.subtotal||0).toLocaleString('es-ES',{style:'currency',currency:'EUR'})}</span></div>
    ${!esRecibo ? `
    <div class="totales-row"><span>IVA (${lns[0]?.iva_pct||21}%)</span><span>+ ${(doc.iva_total||0).toLocaleString('es-ES',{style:'currency',currency:'EUR'})}</span></div>
    <div class="totales-row"><span>IRPF (${lns[0]?.irpf_pct||15}%)</span><span>– ${(doc.irpf_total||0).toLocaleString('es-ES',{style:'currency',currency:'EUR'})}</span></div>
    ` : ''}
    <div class="totales-row total"><span>Total</span><span>${(doc.total||0).toLocaleString('es-ES',{style:'currency',currency:'EUR'})}</span></div>
  </div>
  ${doc.notas ? `<div class="notas"><strong>Notas:</strong> ${doc.notas}</div>` : ''}
  ${doc.tipo === 'presupuesto' ? `
  <div class="firma-area">
    <div class="firma-box">Firma del cliente / Fecha de aceptación</div>
    <div class="firma-box">Firma del fotógrafo</div>
  </div>` : ''}
  <div class="footer">
    <span>${doc.emisor_nombre || ''} · ${doc.emisor_nif || ''}</span>
    <span>${tipoLabel} ${doc.numero}</span>
  </div>
</div>
</body></html>`
  }

  const tots = calcularTotales(lineas)

  if (loading) return <div className="flex items-center justify-center h-64 text-sm text-ink-3">Cargando…</div>

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/trabajos/${id}`} className="text-ink-3 hover:text-ink"><ArrowLeft size={16}/></Link>
        <div>
          <h1 className="text-[15px] font-medium text-ink">Documentos · {trabajo?.titulo}</h1>
          <p className="text-xs text-ink-3">Facturas, recibos y presupuestos</p>
        </div>
      </div>

      {/* ── LISTA ── */}
      {modo === 'lista' && (
        <>
          <div className="flex gap-2 mb-5">
            {Object.entries(TIPOS).map(([key, t]) => (
              <button key={key} onClick={() => nuevoDoc(key)}
                className="btn-primary bg-white border border-brand/20 text-brand hover:bg-brand hover:text-white flex items-center gap-2 text-sm">
                <Plus size={14}/> Nueva {t.label.toLowerCase()}
              </button>
            ))}
          </div>

          {docs.length === 0 ? (
            <div className="card p-10 text-center text-sm text-ink-3">
              <p className="mb-1">Sin documentos aún</p>
              <p className="text-xs">Crea una factura, recibo o presupuesto arriba</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              {docs.map((doc, i) => {
                const T = TIPOS[doc.tipo] || TIPOS.factura
                return (
                  <div key={doc.id}
                    className={`flex items-center gap-4 px-5 py-4 ${i < docs.length-1 ? 'border-b border-cream-dark' : ''}`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${T.color}`}>
                      <T.icon size={16}/>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink">{doc.numero}</p>
                      <p className="text-xs text-ink-3">{T.label} · {fmtFecha(doc.fecha)}</p>
                    </div>
                    <span className="font-serif text-base text-brand">{fmtEur(doc.total)}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full ${
                      doc.estado==='pagada'?'bg-emerald-100 text-emerald-700':
                      doc.estado==='enviada'?'bg-brand/10 text-brand':
                      'bg-cream-dark text-ink-3'}`}>{doc.estado}</span>
                    <button onClick={() => { setDocActivo(doc); setModo('ver') }}
                      className="btn-ghost text-xs">Ver</button>
                    <button onClick={() => generarPDF(doc)}
                      className="btn-ghost text-xs"><Download size={13}/> PDF</button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── NUEVO DOCUMENTO ── */}
      {modo === 'nuevo' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {Object.entries(TIPOS).map(([key, t]) => (
                <button key={key} onClick={() => setTipo(key)}
                  className={`px-4 py-2 rounded-lg text-sm border transition-all ${tipo===key ? 'bg-brand text-white border-brand' : 'border-brand/20 text-ink-2 hover:border-brand/40'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModo('lista')} className="btn-ghost"><X size={14}/> Cancelar</button>
              <button onClick={guardarDoc} disabled={guardando} className="btn-primary">
                {guardando ? 'Guardando…' : 'Crear '+TIPOS[tipo].label.toLowerCase()}
              </button>
            </div>
          </div>

          {/* Datos cliente */}
          <div className="card p-5">
            <p className="text-xs font-medium text-ink-2 uppercase tracking-wide mb-4">Datos del cliente</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Nombre / Razón social</label>
                <input value={form.cliente_nombre||''} onChange={e=>setForm(f=>({...f,cliente_nombre:e.target.value}))} className="input text-sm"/></div>
              <div><label className="label">NIF / DNI</label>
                <input value={form.cliente_nif||''} onChange={e=>setForm(f=>({...f,cliente_nif:e.target.value}))} className="input text-sm"/></div>
              <div><label className="label">Email</label>
                <input value={form.cliente_email||''} onChange={e=>setForm(f=>({...f,cliente_email:e.target.value}))} className="input text-sm"/></div>
              <div><label className="label">Fecha documento</label>
                <input type="date" value={form.fecha||''} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} className="input text-sm"/></div>
              <div><label className="label">Dirección</label>
                <input value={form.cliente_direccion||''} onChange={e=>setForm(f=>({...f,cliente_direccion:e.target.value}))} className="input text-sm"/></div>
              <div><label className="label">Ciudad</label>
                <input value={form.cliente_ciudad||''} onChange={e=>setForm(f=>({...f,cliente_ciudad:e.target.value}))} className="input text-sm"/></div>
            </div>
          </div>

          {/* Líneas */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-cream-dark bg-cream">
              <div className="grid grid-cols-[1fr_60px_100px_60px_60px_90px_30px] gap-2 text-[10px] font-medium text-ink-3 uppercase tracking-wide">
                <span>Concepto</span><span className="text-right">Uds.</span><span className="text-right">Precio unit.</span>
                <span className="text-right">IVA%</span><span className="text-right">IRPF%</span><span className="text-right">Importe</span><span/>
              </div>
            </div>
            {lineas.map(l => {
              const base = l.cantidad * l.precio_unitario
              return (
                <div key={l.tempId} className="px-5 py-3 border-b border-cream-dark last:border-0">
                  <div className="grid grid-cols-[1fr_60px_100px_60px_60px_90px_30px] gap-2 items-center">
                    <input value={l.concepto} onChange={e=>updateLinea(l.tempId,'concepto',e.target.value)} className="input text-sm py-1"/>
                    <input type="number" value={l.cantidad} onChange={e=>updateLinea(l.tempId,'cantidad',e.target.value)} className="input text-sm py-1 text-right"/>
                    <input type="number" value={l.precio_unitario} onChange={e=>updateLinea(l.tempId,'precio_unitario',e.target.value)} className="input text-sm py-1 text-right"/>
                    <input type="number" value={l.iva_pct} onChange={e=>updateLinea(l.tempId,'iva_pct',e.target.value)} className="input text-sm py-1 text-right"/>
                    <input type="number" value={l.irpf_pct} onChange={e=>updateLinea(l.tempId,'irpf_pct',e.target.value)} className="input text-sm py-1 text-right"/>
                    <span className="font-serif text-sm text-right text-brand">{fmtEur(base)}</span>
                    <button onClick={()=>setLineas(ls=>ls.filter(x=>x.tempId!==l.tempId))} className="text-ink-3 hover:text-red-500"><Trash2 size={13}/></button>
                  </div>
                </div>
              )
            })}
            <div className="px-5 py-3 border-t border-cream-dark">
              <button onClick={()=>setLineas(ls=>[...ls,{...LINEA_VACIA(),iva_pct:config.iva_pct||21,irpf_pct:config.irpf_pct||15}])}
                className="btn-ghost text-sm"><Plus size={13}/> Añadir línea</button>
            </div>
          </div>

          {/* Totales */}
          <div className="flex justify-end">
            <div className="card p-4 w-64 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-ink-3">Subtotal</span><span>{fmtEur(tots.subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-ink-3">IVA</span><span>+ {fmtEur(tots.iva_total)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-ink-3">IRPF</span><span>– {fmtEur(tots.irpf_total)}</span></div>
              <div className="flex justify-between font-medium border-t border-cream-dark pt-2"><span>Total</span><span className="font-serif text-lg text-brand">{fmtEur(tots.total)}</span></div>
            </div>
          </div>

          {/* Notas */}
          <div className="card p-4">
            <label className="label mb-2">Notas (opcional)</label>
            <textarea value={form.notas||''} onChange={e=>setForm(f=>({...f,notas:e.target.value}))} className="input resize-none text-sm w-full" rows={2} placeholder="Condiciones de pago, observaciones…"/>
          </div>
        </div>
      )}

      {/* ── VER DOCUMENTO ── */}
      {modo === 'ver' && docActivo && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <button onClick={()=>setModo('lista')} className="btn-ghost"><ArrowLeft size={14}/> Volver</button>
            <div className="flex gap-2">
              <button onClick={()=>generarPDF(docActivo)} disabled={generandoPdf} className="btn-primary">
                <Download size={14}/> {generandoPdf?'Generando…':'Descargar PDF'}
              </button>
            </div>
          </div>

          {/* Preview simplificado */}
          <div className="card p-8 max-w-2xl mx-auto">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="font-rexton text-brand text-base uppercase tracking-[.2em]">Ferreiro</p>
                <p className="font-baskerville italic text-ink-3 text-xs">capturing moments</p>
                {config.nif && <p className="text-xs text-ink-3 mt-1">NIF: {config.nif}</p>}
                {config.ciudad_fiscal && <p className="text-xs text-ink-3">{config.ciudad_fiscal}</p>}
              </div>
              <div className="text-right">
                <p className="text-xl font-light text-brand">{TIPOS[docActivo.tipo]?.label}</p>
                <p className="text-sm font-medium text-ink">{docActivo.numero}</p>
                <p className="text-xs text-ink-3">{fmtFecha(docActivo.fecha)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-6 text-sm">
              <div>
                <p className="text-xs text-ink-3 uppercase tracking-wide mb-1">Emisor</p>
                <p className="font-medium">{docActivo.emisor_nombre}</p>
                {docActivo.emisor_nif && <p className="text-ink-3">NIF: {docActivo.emisor_nif}</p>}
              </div>
              <div>
                <p className="text-xs text-ink-3 uppercase tracking-wide mb-1">Cliente</p>
                <p className="font-medium">{docActivo.cliente_nombre}</p>
                {docActivo.cliente_nif && <p className="text-ink-3">NIF: {docActivo.cliente_nif}</p>}
                {docActivo.cliente_email && <p className="text-ink-3">{docActivo.cliente_email}</p>}
              </div>
            </div>

            <table className="w-full text-sm mb-6">
              <thead><tr className="border-b border-cream-dark">
                <th className="text-left pb-2 text-xs text-ink-3 uppercase tracking-wide font-medium">Concepto</th>
                <th className="text-right pb-2 text-xs text-ink-3 uppercase tracking-wide font-medium">Importe</th>
              </tr></thead>
              <tbody>
                {(docActivo.lineas||[]).map((l,i) => (
                  <tr key={i} className="border-b border-cream-dark/50">
                    <td className="py-2.5">{l.concepto}</td>
                    <td className="py-2.5 text-right font-serif text-brand">{fmtEur((l.cantidad||1)*(l.precio_unitario||0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-52 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-ink-3">Subtotal</span><span>{fmtEur(docActivo.subtotal)}</span></div>
                {docActivo.iva_total > 0 && <div className="flex justify-between"><span className="text-ink-3">IVA</span><span>+ {fmtEur(docActivo.iva_total)}</span></div>}
                {docActivo.irpf_total > 0 && <div className="flex justify-between"><span className="text-ink-3">IRPF</span><span>– {fmtEur(docActivo.irpf_total)}</span></div>}
                <div className="flex justify-between font-medium border-t border-cream-dark pt-2">
                  <span>Total</span>
                  <span className="font-serif text-lg text-brand">{fmtEur(docActivo.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
