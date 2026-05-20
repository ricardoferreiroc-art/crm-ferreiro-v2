import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { TIPOS_TRABAJO, FUENTES_LEAD, ADDONS } from '../../lib/utils'
import { X } from 'lucide-react'

export default function ModalLead({ onClose, onSave, leadInicial }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre: leadInicial?.nombre || '',
    email: leadInicial?.email || '',
    telefono: leadInicial?.telefono || '',
    tipo_trabajo: leadInicial?.tipo_trabajo || 'Boda',
    fecha_evento: leadInicial?.fecha_evento || '',
    lugar: leadInicial?.lugar || '',
    ciudad: leadInicial?.ciudad || '',
    n_invitados: leadInicial?.n_invitados || '',
    presupuesto_cliente: leadInicial?.presupuesto_cliente || '',
    fuente: leadInicial?.fuente || '',
    idioma: leadInicial?.idioma || 'es',
    notas: leadInicial?.notas || '',
    add_ons: leadInicial?.add_ons || [],
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleAddon = (a) => {
    set('add_ons', form.add_ons.includes(a)
      ? form.add_ons.filter(x => x !== a)
      : [...form.add_ons, a]
    )
  }

  async function guardar(e) {
    e.preventDefault()
    if (!form.nombre.trim()) return
    setLoading(true)

    const payload = {
      user_id: user.id,
      nombre: form.nombre.trim(),
      email: form.email || null,
      telefono: form.telefono || null,
      tipo_trabajo: form.tipo_trabajo,
      fecha_evento: form.fecha_evento || null,
      lugar: form.lugar || null,
      ciudad: form.ciudad || null,
      n_invitados: form.n_invitados ? parseInt(form.n_invitados) : null,
      presupuesto_cliente: form.presupuesto_cliente ? parseFloat(form.presupuesto_cliente) : null,
      fuente: form.fuente || null,
      idioma: form.idioma,
      notas: form.notas || null,
      add_ons: form.add_ons,
      estado: 'Nuevo',
    }

    const { error } = await supabase.from('v2_leads').insert(payload)
    if (!error) onSave()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto shadow-2xl">

        <div className="flex items-center justify-between px-6 py-4 border-b border-cream-dark">
          <h2 className="font-medium text-ink">Nuevo lead</h2>
          <button onClick={onClose} className="text-ink-3 hover:text-ink transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={guardar} className="px-6 py-5 space-y-4">

          {/* Nombre */}
          <div>
            <label className="label">Nombre de la pareja *</label>
            <input
              value={form.nombre}
              onChange={e => set('nombre', e.target.value)}
              className="input"
              placeholder="Ana & Juanlu"
              required
            />
          </div>

          {/* Tipo + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo de trabajo</label>
              <select value={form.tipo_trabajo} onChange={e => set('tipo_trabajo', e.target.value)} className="select">
                {TIPOS_TRABAJO.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Fecha del evento</label>
              <input type="date" value={form.fecha_evento} onChange={e => set('fecha_evento', e.target.value)} className="input" />
            </div>
          </div>

          {/* Contacto */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input" placeholder="correo@ejemplo.com" />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input type="tel" value={form.telefono} onChange={e => set('telefono', e.target.value)} className="input" placeholder="+34 600 000 000" />
            </div>
          </div>

          {/* Lugar */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Lugar / Finca</label>
              <input value={form.lugar} onChange={e => set('lugar', e.target.value)} className="input" placeholder="Hacienda El Vizir" />
            </div>
            <div>
              <label className="label">Ciudad</label>
              <input value={form.ciudad} onChange={e => set('ciudad', e.target.value)} className="input" placeholder="Sevilla" />
            </div>
          </div>

          {/* Presupuesto + Invitados + Fuente */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Presupuesto cliente</label>
              <input type="number" value={form.presupuesto_cliente} onChange={e => set('presupuesto_cliente', e.target.value)} className="input" placeholder="€" />
            </div>
            <div>
              <label className="label">Invitados</label>
              <input type="number" value={form.n_invitados} onChange={e => set('n_invitados', e.target.value)} className="input" placeholder="150" />
            </div>
            <div>
              <label className="label">Fuente</label>
              <select value={form.fuente} onChange={e => set('fuente', e.target.value)} className="select">
                <option value="">—</option>
                {FUENTES_LEAD.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>

          {/* Idioma */}
          <div>
            <label className="label">Idioma</label>
            <div className="flex gap-2">
              {['es', 'en', 'fr', 'it', 'de', 'pt'].map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => set('idioma', l)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all
                    ${form.idioma === l ? 'bg-brand text-white border-brand' : 'border-brand/20 text-ink-2 hover:border-brand/40'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Add-ons */}
          <div>
            <label className="label">Add-ons de interés</label>
            <div className="flex flex-wrap gap-2">
              {ADDONS.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAddon(a)}
                  className={`px-3 py-1 rounded-full text-xs border transition-all
                    ${form.add_ons.includes(a) ? 'bg-brand text-white border-brand' : 'border-brand/20 text-ink-2 hover:border-brand/40'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="label">Notas</label>
            <textarea
              value={form.notas}
              onChange={e => set('notas', e.target.value)}
              className="input resize-none"
              rows={2}
              placeholder="Observaciones iniciales…"
            />
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-60">
              {loading ? 'Guardando…' : 'Crear lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
