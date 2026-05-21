import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ArrowLeft, Plus, Trash2, GripVertical, Clock, MapPin, User, Save, Check } from 'lucide-react'

const CATEGORIAS_EVENTO = ['Preparativos novia', 'Preparativos novio', 'Traslado', 'Ceremonia', 'Cóctel', 'Banquete', 'Baile', 'Detalles', 'Familia', 'Pareja', 'Fin de fiesta', 'Otro']

const EVENTO_VACIO = () => ({
  tempId: Date.now() + Math.random(),
  hora: '',
  titulo: '',
  lugar: '',
  notas: '',
  categoria: 'Otro',
  duracion_min: 30,
})

export default function Timing() {
  const { id } = useParams()
  const { user } = useAuth()
  const [trabajo, setTrabajo] = useState(null)
  const [eventos, setEventos] = useState([])
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [timingId, setTimingId] = useState(null)

  useEffect(() => { if (user && id) cargar() }, [user, id])

  async function cargar() {
    setLoading(true)
    const [{ data: t }, { data: tim }] = await Promise.all([
      supabase.from('v2_trabajos').select('id,titulo,tipo,fecha,hora_inicio,lugar,tipo_ceremonia,lugar_ceremonia,hora_ceremonia,n_invitados,segundo_nombre,wedding_planner,videografo').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('v2_timings').select('*').eq('trabajo_id', id).single(),
    ])
    setTrabajo(t)
    if (tim) {
      setTimingId(tim.id)
      setEventos((tim.eventos || []).map(e => ({ ...e, tempId: Date.now() + Math.random() })))
      setNotas(tim.notas || '')
    } else {
      // Crear timing vacío con estructura base de una boda
      setEventos(plantillaBase(t))
    }
    setLoading(false)
  }

  function plantillaBase(t) {
    const items = []
    if (t?.tipo === 'Boda' || t?.tipo === 'Elopement') {
      items.push(
        { tempId: 1, hora: '10:00', titulo: 'Preparativos novia', lugar: '', notas: '', categoria: 'Preparativos novia', duracion_min: 120 },
        { tempId: 2, hora: '11:00', titulo: 'Preparativos novio', lugar: '', notas: '', categoria: 'Preparativos novio', duracion_min: 60 },
        { tempId: 3, hora: t?.hora_ceremonia || '13:00', titulo: 'Ceremonia', lugar: t?.lugar_ceremonia || '', notas: '', categoria: 'Ceremonia', duracion_min: 45 },
        { tempId: 4, hora: '14:00', titulo: 'Cóctel', lugar: t?.lugar || '', notas: '', categoria: 'Cóctel', duracion_min: 90 },
        { tempId: 5, hora: '15:30', titulo: 'Banquete', lugar: t?.lugar || '', notas: '', categoria: 'Banquete', duracion_min: 180 },
        { tempId: 6, hora: '19:00', titulo: 'Baile nupcial', lugar: '', notas: '', categoria: 'Baile', duracion_min: 30 },
        { tempId: 7, hora: '20:00', titulo: 'Pareja — sesión exterior', lugar: '', notas: '', categoria: 'Pareja', duracion_min: 45 },
      )
    }
    return items
  }

  async function guardar() {
    setGuardando(true)
    const payload = {
      trabajo_id: parseInt(id),
      user_id: user.id,
      eventos: eventos.map(({ tempId, ...e }) => e),
      notas,
    }
    if (timingId) {
      await supabase.from('v2_timings').update(payload).eq('id', timingId)
    } else {
      const { data } = await supabase.from('v2_timings').insert(payload).select().single()
      if (data) setTimingId(data.id)
    }
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
    setGuardando(false)
  }

  function addEvento() {
    setEventos(e => [...e, EVENTO_VACIO()])
  }

  function updateEvento(tempId, campo, valor) {
    setEventos(evs => evs.map(e => e.tempId === tempId ? { ...e, [campo]: valor } : e))
  }

  function removeEvento(tempId) {
    setEventos(evs => evs.filter(e => e.tempId !== tempId))
  }

  function moverArriba(idx) {
    if (idx === 0) return
    setEventos(evs => { const arr = [...evs]; [arr[idx-1], arr[idx]] = [arr[idx], arr[idx-1]]; return arr })
  }

  function moverAbajo(idx) {
    setEventos(evs => { if (idx >= evs.length - 1) return evs; const arr = [...evs]; [arr[idx], arr[idx+1]] = [arr[idx+1], arr[idx]]; return arr })
  }

  // Ordenar por hora para visualización
  const eventosOrdenados = [...eventos].sort((a, b) => {
    if (!a.hora) return 1
    if (!b.hora) return -1
    return a.hora.localeCompare(b.hora)
  })

  const CAT_COLOR = {
    'Preparativos novia': 'bg-pink-100 text-pink-700 border-pink-200',
    'Preparativos novio': 'bg-blue-100 text-blue-700 border-blue-200',
    'Traslado':           'bg-gray-100 text-gray-600 border-gray-200',
    'Ceremonia':          'bg-brand/10 text-brand border-brand/20',
    'Cóctel':             'bg-amber-100 text-amber-700 border-amber-200',
    'Banquete':           'bg-orange-100 text-orange-700 border-orange-200',
    'Baile':              'bg-purple-100 text-purple-700 border-purple-200',
    'Detalles':           'bg-teal-100 text-teal-700 border-teal-200',
    'Familia':            'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Pareja':             'bg-rose-100 text-rose-700 border-rose-200',
    'Fin de fiesta':      'bg-indigo-100 text-indigo-700 border-indigo-200',
    'Otro':               'bg-cream-dark text-ink-3 border-cream-dark',
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-ink-3 text-sm">Cargando…</div>

  return (
    <div className="flex h-[calc(100vh-54px)]">

      {/* COLUMNA IZQUIERDA — edición */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-cream-dark bg-white">
          <div className="flex items-center gap-3">
            <Link to={`/trabajos/${id}`} className="text-ink-3 hover:text-ink"><ArrowLeft size={16}/></Link>
            <div>
              <h1 className="text-[14px] font-medium text-ink">{trabajo?.titulo}</h1>
              <p className="text-xs text-ink-3">Timing del día · {trabajo?.fecha ? new Date(trabajo.fecha+'T00:00:00').toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={addEvento} className="btn-ghost text-sm"><Plus size={14}/> Añadir evento</button>
            <button onClick={guardar} disabled={guardando}
              className={`btn-primary ${guardado ? 'bg-emerald-600' : ''}`}>
              {guardado ? <><Check size={14}/> Guardado</> : <><Save size={14}/> {guardando ? 'Guardando…' : 'Guardar'}</>}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-2">
          {eventos.map((ev, idx) => (
            <div key={ev.tempId} className="card p-3 flex gap-3 items-start group">
              {/* Orden */}
              <div className="flex flex-col items-center gap-1 mt-1 flex-shrink-0">
                <button onClick={() => moverArriba(idx)} className="text-ink-3 hover:text-ink opacity-0 group-hover:opacity-100 transition-all p-0.5 text-[10px]">▲</button>
                <GripVertical size={14} className="text-ink-3"/>
                <button onClick={() => moverAbajo(idx)} className="text-ink-3 hover:text-ink opacity-0 group-hover:opacity-100 transition-all p-0.5 text-[10px]">▼</button>
              </div>

              {/* Hora */}
              <input type="time" value={ev.hora}
                onChange={e => updateEvento(ev.tempId, 'hora', e.target.value)}
                className="input text-sm font-mono w-[90px] flex-shrink-0 py-1.5"/>

              {/* Contenido */}
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input value={ev.titulo} onChange={e => updateEvento(ev.tempId, 'titulo', e.target.value)}
                  className="input text-sm" placeholder="Título del evento"/>
                <select value={ev.categoria} onChange={e => updateEvento(ev.tempId, 'categoria', e.target.value)}
                  className="select text-sm">
                  {CATEGORIAS_EVENTO.map(c => <option key={c}>{c}</option>)}
                </select>
                <input value={ev.lugar || ''} onChange={e => updateEvento(ev.tempId, 'lugar', e.target.value)}
                  className="input text-sm" placeholder="Lugar (opcional)"/>
                <input value={ev.notas || ''} onChange={e => updateEvento(ev.tempId, 'notas', e.target.value)}
                  className="input text-sm" placeholder="Notas (opcional)"/>
              </div>

              <button onClick={() => removeEvento(ev.tempId)}
                className="text-ink-3 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 mt-1 flex-shrink-0">
                <Trash2 size={14}/>
              </button>
            </div>
          ))}

          {eventos.length === 0 && (
            <div className="text-center py-10">
              <p className="text-sm text-ink-3 mb-3">Sin eventos en el timing</p>
              <button onClick={addEvento} className="btn-primary mx-auto"><Plus size={14}/> Añadir primer evento</button>
            </div>
          )}

          {/* Notas globales */}
          <div className="card p-4 mt-4">
            <label className="label mb-2">Notas generales del día</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)}
              className="input resize-none text-sm w-full" rows={3}
              placeholder="Observaciones para el día de la boda, logística, puntos de encuentro…"/>
          </div>
        </div>
      </div>

      {/* COLUMNA DERECHA — preview del timing */}
      <div className="w-72 border-l border-brand/[.08] flex flex-col bg-white">
        <div className="px-5 py-4 border-b border-cream-dark">
          <p className="text-[11px] font-medium text-ink-2 uppercase tracking-wide">Vista del día</p>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {/* Info general */}
          {trabajo && (
            <div className="space-y-1.5 mb-4 pb-4 border-b border-cream-dark">
              {trabajo.lugar && <div className="flex items-center gap-2 text-xs text-ink-2"><MapPin size={11} className="text-ink-3"/>{trabajo.lugar}</div>}
              {trabajo.tipo_ceremonia && <div className="flex items-center gap-2 text-xs text-ink-2"><span className="text-ink-3">Ceremonia:</span> {trabajo.tipo_ceremonia}</div>}
              {trabajo.n_invitados && <div className="flex items-center gap-2 text-xs text-ink-2"><User size={11} className="text-ink-3"/>{trabajo.n_invitados} invitados</div>}
              {trabajo.segundo_nombre && <div className="text-xs text-ink-2"><span className="text-ink-3">2º fotógrafo:</span> {trabajo.segundo_nombre}</div>}
              {trabajo.wedding_planner && <div className="text-xs text-ink-2"><span className="text-ink-3">Wedding planner:</span> {trabajo.wedding_planner}</div>}
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-1">
            {eventosOrdenados.length === 0 ? (
              <p className="text-xs text-ink-3 text-center py-4">Añade eventos para ver el timeline</p>
            ) : eventosOrdenados.map((ev, i) => (
              <div key={ev.tempId} className="flex gap-2.5 group">
                <div className="flex flex-col items-center flex-shrink-0">
                  <span className="text-[11px] font-mono font-medium text-ink w-10 text-right pt-0.5">
                    {ev.hora || '—'}
                  </span>
                </div>
                <div className="flex flex-col items-center flex-shrink-0 mx-1">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 border ${CAT_COLOR[ev.categoria] || CAT_COLOR['Otro']}`}/>
                  {i < eventosOrdenados.length - 1 && <div className="w-px flex-1 bg-cream-dark mt-1"/>}
                </div>
                <div className={`flex-1 px-2.5 py-1.5 rounded-lg mb-1 border text-xs ${CAT_COLOR[ev.categoria] || CAT_COLOR['Otro']}`}>
                  <p className="font-medium leading-snug">{ev.titulo || '—'}</p>
                  {ev.lugar && <p className="opacity-70 mt-0.5 flex items-center gap-1"><MapPin size={9}/>{ev.lugar}</p>}
                  {ev.notas && <p className="opacity-60 mt-0.5 italic">{ev.notas}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
