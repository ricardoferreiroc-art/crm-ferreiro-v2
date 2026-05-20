import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { fmtEur } from '../../lib/utils'
import { Save, Check, User, Euro, FileText, RefreshCw } from 'lucide-react'

const SECCIONES = [
  { id: 'negocio', label: 'Negocio', Icon: User },
  { id: 'fiscal', label: 'Fiscal', Icon: Euro },
  { id: 'cuenta', label: 'Cuenta', Icon: FileText },
]

export default function Settings() {
  const { user } = useAuth()
  const [seccion, setSeccion] = useState('negocio')
  const [form, setForm] = useState({
    nombre_negocio: 'Ricardo Ferreiro',
    nif: '',
    direccion_fiscal: '',
    ciudad_fiscal: '',
    cp_fiscal: '',
    objetivo_anual: 80000,
    irpf_pct: 15,
    iva_pct: 21,
    cuota_autonomo: 300,
  })
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [cambioPass, setCambioPass] = useState({ actual: '', nueva: '', confirmar: '' })
  const [cambiandoPass, setCambiandoPass] = useState(false)
  const [errorPass, setErrorPass] = useState('')
  const [okPass, setOkPass] = useState(false)

  useEffect(() => { if (user) cargar() }, [user])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('v2_config')
      .select('*')
      .eq('user_id', user.id)
      .single()
    if (data) setForm(f => ({ ...f, ...data }))
    setLoading(false)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    const payload = {
      user_id: user.id,
      nombre_negocio: form.nombre_negocio,
      nif: form.nif || null,
      direccion_fiscal: form.direccion_fiscal || null,
      ciudad_fiscal: form.ciudad_fiscal || null,
      cp_fiscal: form.cp_fiscal || null,
      objetivo_anual: parseFloat(form.objetivo_anual) || 80000,
      irpf_pct: parseFloat(form.irpf_pct) || 15,
      iva_pct: parseFloat(form.iva_pct) || 21,
      cuota_autonomo: parseFloat(form.cuota_autonomo) || 300,
    }
    const { error } = await supabase.from('v2_config').upsert(payload)
    if (!error) {
      setGuardado(true)
      setTimeout(() => setGuardado(false), 2500)
    }
    setGuardando(false)
  }

  async function cambiarContrasena(e) {
    e.preventDefault()
    setErrorPass('')
    if (cambioPass.nueva !== cambioPass.confirmar) {
      setErrorPass('Las contraseñas no coinciden')
      return
    }
    if (cambioPass.nueva.length < 8) {
      setErrorPass('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setCambiandoPass(true)
    const { error } = await supabase.auth.updateUser({ password: cambioPass.nueva })
    if (error) {
      setErrorPass(error.message)
    } else {
      setOkPass(true)
      setCambioPass({ actual: '', nueva: '', confirmar: '' })
      setTimeout(() => setOkPass(false), 3000)
    }
    setCambiandoPass(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-ink-3 text-sm">Cargando…</div>
  )

  return (
    <div className="flex h-[calc(100vh-54px)]">

      {/* Sidebar de secciones */}
      <div className="w-52 border-r border-brand/[.08] p-4">
        <p className="text-[10px] font-medium text-ink-3 uppercase tracking-wide mb-3 px-2">Ajustes</p>
        <nav className="space-y-1">
          {SECCIONES.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setSeccion(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all
                ${seccion === id
                  ? 'bg-brand text-white font-medium'
                  : 'text-ink-2 hover:bg-brand/[.06] hover:text-ink'}`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-lg">

          {/* ── NEGOCIO ── */}
          {seccion === 'negocio' && (
            <form onSubmit={guardar} className="space-y-5">
              <div>
                <h2 className="text-[15px] font-medium text-ink mb-1">Datos del negocio</h2>
                <p className="text-sm text-ink-3">Se usan en contratos, facturas y el portal del cliente.</p>
              </div>

              <div className="card p-5 space-y-4">
                <div>
                  <label className="label">Nombre del negocio / Autónomo</label>
                  <input
                    value={form.nombre_negocio}
                    onChange={e => set('nombre_negocio', e.target.value)}
                    className="input text-sm"
                    placeholder="Ricardo Ferreiro Photography"
                  />
                </div>
                <div>
                  <label className="label">NIF / DNI</label>
                  <input
                    value={form.nif || ''}
                    onChange={e => set('nif', e.target.value)}
                    className="input text-sm"
                    placeholder="12345678A"
                  />
                </div>
                <div>
                  <label className="label">Dirección fiscal</label>
                  <input
                    value={form.direccion_fiscal || ''}
                    onChange={e => set('direccion_fiscal', e.target.value)}
                    className="input text-sm"
                    placeholder="Calle, número, piso"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Ciudad</label>
                    <input
                      value={form.ciudad_fiscal || ''}
                      onChange={e => set('ciudad_fiscal', e.target.value)}
                      className="input text-sm"
                      placeholder="Sevilla"
                    />
                  </div>
                  <div>
                    <label className="label">Código postal</label>
                    <input
                      value={form.cp_fiscal || ''}
                      onChange={e => set('cp_fiscal', e.target.value)}
                      className="input text-sm"
                      placeholder="41001"
                    />
                  </div>
                </div>
              </div>

              <BtnGuardar guardando={guardando} guardado={guardado} />
            </form>
          )}

          {/* ── FISCAL ── */}
          {seccion === 'fiscal' && (
            <form onSubmit={guardar} className="space-y-5">
              <div>
                <h2 className="text-[15px] font-medium text-ink mb-1">Configuración fiscal</h2>
                <p className="text-sm text-ink-3">Estos valores se usan en el módulo de Finanzas.</p>
              </div>

              <div className="card p-5 space-y-4">
                <div>
                  <label className="label">Objetivo anual de facturación (€)</label>
                  <input
                    type="number"
                    value={form.objetivo_anual}
                    onChange={e => set('objetivo_anual', e.target.value)}
                    className="input text-sm"
                  />
                  <p className="text-xs text-ink-3 mt-1">Aparece en el dashboard como barra de progreso</p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label">IVA (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.iva_pct}
                      onChange={e => set('iva_pct', e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="label">IRPF (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.irpf_pct}
                      onChange={e => set('irpf_pct', e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="label">Cuota autónomo (€/mes)</label>
                    <input
                      type="number"
                      value={form.cuota_autonomo}
                      onChange={e => set('cuota_autonomo', e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Resumen fiscal */}
              <div className="card p-5 bg-cream">
                <p className="text-xs font-medium text-ink-2 uppercase tracking-wide mb-3">Resumen con estos valores</p>
                <div className="space-y-2 text-sm">
                  {[
                    { l: 'IVA sobre ingresos', v: `${form.iva_pct}% sobre base imponible` },
                    { l: 'Retención IRPF en facturas', v: `${form.irpf_pct}% sobre base imponible` },
                    { l: 'Cuota autónomo anual', v: fmtEur(form.cuota_autonomo * 12) },
                    { l: 'Objetivo anual', v: fmtEur(form.objetivo_anual) },
                  ].map(r => (
                    <div key={r.l} className="flex justify-between">
                      <span className="text-ink-3">{r.l}</span>
                      <span className="font-medium text-ink">{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <BtnGuardar guardando={guardando} guardado={guardado} />
            </form>
          )}

          {/* ── CUENTA ── */}
          {seccion === 'cuenta' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-[15px] font-medium text-ink mb-1">Cuenta</h2>
                <p className="text-sm text-ink-3">Ajustes de acceso y seguridad.</p>
              </div>

              {/* Info cuenta */}
              <div className="card p-5 space-y-3">
                <p className="text-xs font-medium text-ink-2 uppercase tracking-wide">Sesión activa</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center text-sm font-medium">
                    RF
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{user?.email}</p>
                    <p className="text-xs text-ink-3">Autónomo · España</p>
                  </div>
                </div>
              </div>

              {/* Cambiar contraseña */}
              <div className="card p-5">
                <p className="text-xs font-medium text-ink-2 uppercase tracking-wide mb-4">Cambiar contraseña</p>
                <form onSubmit={cambiarContrasena} className="space-y-3">
                  <div>
                    <label className="label">Nueva contraseña</label>
                    <input
                      type="password"
                      value={cambioPass.nueva}
                      onChange={e => setCambioPass(p => ({ ...p, nueva: e.target.value }))}
                      className="input text-sm"
                      placeholder="Mínimo 8 caracteres"
                    />
                  </div>
                  <div>
                    <label className="label">Confirmar nueva contraseña</label>
                    <input
                      type="password"
                      value={cambioPass.confirmar}
                      onChange={e => setCambioPass(p => ({ ...p, confirmar: e.target.value }))}
                      className="input text-sm"
                    />
                  </div>
                  {errorPass && (
                    <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{errorPass}</p>
                  )}
                  {okPass && (
                    <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg flex items-center gap-1.5">
                      <Check size={12} /> Contraseña actualizada correctamente
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={cambiandoPass || !cambioPass.nueva || !cambioPass.confirmar}
                    className="btn-primary w-full justify-center disabled:opacity-60"
                  >
                    {cambiandoPass ? <><RefreshCw size={13} className="animate-spin" /> Actualizando…</> : 'Cambiar contraseña'}
                  </button>
                </form>
              </div>

              {/* Info del proyecto */}
              <div className="card p-5 bg-cream space-y-2">
                <p className="text-xs font-medium text-ink-2 uppercase tracking-wide mb-2">Sistema</p>
                <div className="text-xs text-ink-3 space-y-1.5">
                  <div className="flex justify-between"><span>CRM</span><span className="text-ink">Ferreiro v2</span></div>
                  <div className="flex justify-between"><span>Base de datos</span><span className="text-ink">Supabase</span></div>
                  <div className="flex justify-between"><span>Entorno</span><span className="text-ink">Producción</span></div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function BtnGuardar({ guardando, guardado }) {
  return (
    <button
      type="submit"
      disabled={guardando}
      className={`btn-primary w-full justify-center transition-all ${guardado ? 'bg-emerald-600' : ''}`}
    >
      {guardado
        ? <><Check size={14} /> Guardado</>
        : guardando
        ? <><RefreshCw size={14} className="animate-spin" /> Guardando…</>
        : <><Save size={14} /> Guardar cambios</>
      }
    </button>
  )
}
