import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { fmtFecha, fmtEur, iniciales, avatarColor, ESTADOS_LEAD, TIPOS_TRABAJO, FUENTES_LEAD } from '../../lib/utils'
import { Plus, Check, Clock, Signature, X, ChevronRight, FileText, Send } from 'lucide-react'
import ModalLead from './ModalLead'
import LeadDetalle from './LeadDetalle'

const DOC_ICON = {
  'Nuevo':                  <Clock size={11} className="text-ink-3" />,
  'Contactado':             <Send size={11} className="text-brand" />,
  'Presupuestado':          <Check size={11} className="text-brand" />,
  'Cuestionario enviado':   <Clock size={11} className="text-amber-600" />,
  'Contrato enviado':       <FileText size={11} className="text-brand" />,
  'Firmado':                <Check size={11} className="text-emerald-600" />,
}

const DOC_LABEL = {
  'Nuevo':                'Sin contactar',
  'Contactado':           'Dossier enviado',
  'Presupuestado':        'Precio acordado',
  'Cuestionario enviado': 'Esperando datos',
  'Contrato enviado':     'Firma pendiente',
  'Firmado':              'Listo para confirmar',
}

export default function Leads() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [filtroTipo, setFiltroTipo] = useState('Todos')

  useEffect(() => { if (user) cargar() }, [user])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('v2_leads')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .not('estado', 'eq', 'Confirmado')
      .order('created_at', { ascending: false })
    setLeads(data || [])
    setLoading(false)
  }

  const leadsActivos = leads.filter(l => l.estado !== 'Descartado')
  const leadsDescartados = leads.filter(l => l.estado === 'Descartado')

  const porEstado = (estado) =>
    leadsActivos.filter(l => l.estado === estado && (filtroTipo === 'Todos' || l.tipo_trabajo === filtroTipo))

  return (
    <div className="flex h-[calc(100vh-54px)]">

      {/* KANBAN */}
      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-medium text-ink">Pipeline de leads</h1>
            <span className="text-[11px] text-ink-3 bg-cream-dark px-2 py-0.5 rounded-full">
              {leadsActivos.length} activos
            </span>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
              className="select text-sm w-auto py-1.5"
            >
              <option>Todos</option>
              {TIPOS_TRABAJO.map(t => <option key={t}>{t}</option>)}
            </select>
            <button onClick={() => setModalOpen(true)} className="btn-primary">
              <Plus size={15} /> Nuevo lead
            </button>
          </div>
        </div>

        {/* Columnas kanban */}
        <div className="grid grid-cols-7 gap-2 min-h-[400px]">
          {ESTADOS_LEAD.map(estado => {
            const col = porEstado(estado)
            const esCritico = ['Contrato enviado'].includes(estado)
            return (
              <div key={estado} className={`rounded-lg p-2 ${esCritico ? 'border border-brand/20 bg-brand/[.03]' : 'bg-cream-dark'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-medium ${esCritico ? 'text-brand' : 'text-ink-3'}`}>
                    {estado}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full
                    ${esCritico ? 'bg-brand/10 text-brand' : 'bg-white/60 text-ink-3'}`}>
                    {col.length}
                  </span>
                </div>

                {col.map(lead => (
                  <button
                    key={lead.id}
                    onClick={() => setSelected(lead.id)}
                    className={`w-full text-left bg-white border border-brand/[.08] rounded-lg p-2.5 mb-1.5 last:mb-0
                      hover:border-brand/20 hover:bg-brand/[.02] transition-all cursor-pointer
                      ${selected === lead.id ? 'border-brand/30 bg-brand/[.03]' : ''}`}
                  >
                    <p className="text-[12.5px] text-ink font-medium leading-snug">{lead.nombre}</p>
                    <p className="text-[10px] text-ink-3 mt-1">
                      {lead.tipo_trabajo}
                      {lead.fecha_evento ? ` · ${new Date(lead.fecha_evento + 'T00:00').toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}` : ''}
                    </p>
                    {lead.precio_acordado && (
                      <p className="font-serif text-[13px] text-brand mt-1.5">{fmtEur(lead.precio_acordado)}</p>
                    )}
                    <div className={`flex items-center gap-1.5 mt-2 pt-2 border-t border-cream-dark text-[10px]
                      ${estado === 'Cuestionario enviado' ? 'text-amber-600' :
                        estado === 'Firmado' ? 'text-emerald-600' : 'text-ink-3'}`}>
                      {DOC_ICON[estado]}
                      <span>{DOC_LABEL[estado]}</span>
                    </div>
                  </button>
                ))}
              </div>
            )
          })}

          {/* Descartados */}
          <div className="rounded-lg p-2 bg-cream-dark opacity-60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium text-ink-3">Descartado</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/60 text-ink-3">
                {leadsDescartados.length}
              </span>
            </div>
            {leadsDescartados.slice(0, 3).map(lead => (
              <button
                key={lead.id}
                onClick={() => setSelected(lead.id)}
                className="w-full text-left bg-white/50 border border-brand/[.05] rounded-lg p-2.5 mb-1.5 last:mb-0 cursor-pointer hover:bg-white/70 transition-all"
              >
                <p className="text-[12px] text-ink-3 leading-snug">{lead.nombre}</p>
                {lead.motivo_descarte && (
                  <p className="text-[10px] text-ink-3 mt-0.5">{lead.motivo_descarte}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PANEL DETALLE */}
      {selected && (
        <div className="w-[380px] border-l border-brand/[.08] overflow-auto">
          <LeadDetalle
            leadId={selected}
            onClose={() => setSelected(null)}
            onUpdate={cargar}
            onConfirmar={(id) => navigate(`/trabajos/nuevo?lead=${id}`)}
          />
        </div>
      )}

      {/* MODAL NUEVO LEAD */}
      {modalOpen && (
        <ModalLead
          onClose={() => setModalOpen(false)}
          onSave={() => { setModalOpen(false); cargar() }}
        />
      )}
    </div>
  )
}
