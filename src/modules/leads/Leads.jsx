import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { fmtFecha, fmtEur, iniciales, avatarColor, ESTADOS_LEAD, TIPOS_TRABAJO } from '../../lib/utils'
import { Plus, Check, Clock, X, FileText, Send, ChevronLeft } from 'lucide-react'
import ModalLead from './ModalLead'
import LeadDetalle from './LeadDetalle'

const DOC_ICON = {
  'Nuevo': <Clock size={11} className="text-ink-3"/>,
  'Contactado': <Send size={11} className="text-brand"/>,
  'Presupuestado': <Check size={11} className="text-brand"/>,
  'Cuestionario enviado': <Clock size={11} className="text-amber-600"/>,
  'Contrato enviado': <FileText size={11} className="text-brand"/>,
  'Firmado': <Check size={11} className="text-emerald-600"/>,
}
const DOC_LABEL = {
  'Nuevo': 'Sin contactar', 'Contactado': 'Dossier enviado',
  'Presupuestado': 'Precio acordado', 'Cuestionario enviado': 'Esperando datos',
  'Contrato enviado': 'Firma pendiente', 'Firmado': 'Listo para confirmar',
}

export default function Leads() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [vistaMovil, setVistaMovil] = useState('kanban') // 'kanban' | 'detalle'

  useEffect(() => { if (user) cargar() }, [user])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('v2_leads').select('*').eq('user_id',user.id).is('deleted_at',null).not('estado','eq','Confirmado').order('created_at',{ascending:false})
    setLeads(data||[])
    setLoading(false)
  }

  const leadsActivos = leads.filter(l=>l.estado!=='Descartado')
  const leadsDescartados = leads.filter(l=>l.estado==='Descartado')
  const porEstado = (estado) => leadsActivos.filter(l=>l.estado===estado&&(filtroTipo==='Todos'||l.tipo_trabajo===filtroTipo))

  const handleSelect = (id) => {
    setSelected(id)
    setVistaMovil('detalle')
  }

  const handleClose = () => {
    setSelected(null)
    setVistaMovil('kanban')
  }

  return (
    <div className="flex h-[calc(100vh-54px-56px)] md:h-[calc(100vh-54px)] overflow-hidden">

      {/* KANBAN — oculto en móvil cuando hay detalle abierto */}
      <div className={`flex-1 overflow-auto p-4 md:p-6 ${selected&&vistaMovil==='detalle'?'hidden md:block':''}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-[14px] md:text-[15px] font-medium text-ink">Leads</h1>
            <span className="text-[11px] text-ink-3 bg-cream-dark px-2 py-0.5 rounded-full">{leadsActivos.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)} className="select text-sm w-auto py-1 hidden sm:block">
              <option>Todos</option>
              {TIPOS_TRABAJO.map(t=><option key={t}>{t}</option>)}
            </select>
            <button onClick={()=>setModalOpen(true)} className="btn-primary py-1.5 px-3 text-sm"><Plus size={14}/><span className="hidden sm:inline"> Nuevo</span></button>
          </div>
        </div>

        {/* Kanban — scroll horizontal en móvil */}
        <div className="flex md:grid md:grid-cols-7 gap-2 overflow-x-auto pb-2 md:overflow-visible md:pb-0 snap-x snap-mandatory">
          {ESTADOS_LEAD.map(estado=>{
            const col = porEstado(estado)
            const esCritico = estado==='Contrato enviado'
            return (
              <div key={estado} className={`rounded-lg p-2 flex-shrink-0 w-[180px] md:w-auto snap-start ${esCritico?'border border-brand/20 bg-brand/[.03]':'bg-cream-dark'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[9.5px] md:text-[10px] font-medium ${esCritico?'text-brand':'text-ink-3'}`}>{estado}</span>
                  <span className={`text-[9.5px] px-1.5 py-0.5 rounded-full ${esCritico?'bg-brand/10 text-brand':'bg-white/60 text-ink-3'}`}>{col.length}</span>
                </div>
                {col.map(lead=>(
                  <button key={lead.id} onClick={()=>handleSelect(lead.id)}
                    className={`w-full text-left bg-white border border-brand/[.08] rounded-lg p-2.5 mb-1.5 last:mb-0 hover:border-brand/20 hover:bg-brand/[.02] transition-all
                      ${selected===lead.id?'border-brand/30 bg-brand/[.03]':''}`}>
                    <p className="text-[12px] md:text-[12.5px] text-ink font-medium leading-snug truncate">{lead.nombre}</p>
                    <p className="text-[9.5px] md:text-[10px] text-ink-3 mt-1">
                      {lead.tipo_trabajo}
                      {lead.fecha_evento?` · ${new Date(lead.fecha_evento+'T00:00').toLocaleDateString('es-ES',{month:'short',year:'numeric'})}`:''}</p>
                    {lead.precio_acordado&&<p className="font-serif text-[12px] md:text-[13px] text-brand mt-1.5">{fmtEur(lead.precio_acordado)}</p>}
                    <div className={`flex items-center gap-1.5 mt-2 pt-2 border-t border-cream-dark text-[10px] ${estado==='Cuestionario enviado'?'text-amber-600':estado==='Firmado'?'text-emerald-600':'text-ink-3'}`}>
                      {DOC_ICON[estado]}<span className="truncate">{DOC_LABEL[estado]}</span>
                    </div>
                  </button>
                ))}
              </div>
            )
          })}
          {/* Descartados */}
          <div className="rounded-lg p-2 bg-cream-dark opacity-60 flex-shrink-0 w-[160px] md:w-auto snap-start">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9.5px] font-medium text-ink-3">Descartado</span>
              <span className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-white/60 text-ink-3">{leadsDescartados.length}</span>
            </div>
            {leadsDescartados.slice(0,2).map(lead=>(
              <button key={lead.id} onClick={()=>handleSelect(lead.id)}
                className="w-full text-left bg-white/50 border border-brand/[.05] rounded-lg p-2.5 mb-1.5 last:mb-0 cursor-pointer">
                <p className="text-[11.5px] text-ink-3 truncate">{lead.nombre}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PANEL DETALLE */}
      {selected && (
        <div className={`${vistaMovil==='detalle'?'flex-1':'w-[380px]'} md:w-[380px] border-l border-brand/[.08] overflow-auto`}>
          {/* Botón volver en móvil */}
          <div className="flex items-center gap-2 px-4 py-2 bg-cream-dark border-b border-brand/[.08] md:hidden">
            <button onClick={handleClose} className="flex items-center gap-1.5 text-sm text-ink-2">
              <ChevronLeft size={16}/> Volver al pipeline
            </button>
          </div>
          <LeadDetalle leadId={selected} onClose={handleClose} onUpdate={cargar} onConfirmar={(id)=>navigate(`/trabajos/nuevo?lead=${id}`)}/>
        </div>
      )}

      {modalOpen&&<ModalLead onClose={()=>setModalOpen(false)} onSave={()=>{setModalOpen(false);cargar()}}/>}
    </div>
  )
}
