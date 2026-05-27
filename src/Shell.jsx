import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from './lib/supabase'
import { useAuth } from './context/AuthContext'
import {
  LayoutDashboard, Filter, Camera, Calendar,
  BarChart2, Users, Building2, Bell, LogOut, Settings, Menu, X,
} from 'lucide-react'

const NAV = [
  { to: '/dashboard',   label: 'Dashboard',   Icon: LayoutDashboard },
  { to: '/leads',       label: 'Leads',       Icon: Filter },
  { to: '/trabajos',    label: 'Trabajos',    Icon: Camera },
  { to: '/calendario',  label: 'Calendario',  Icon: Calendar },
  { to: '/finanzas',    label: 'Finanzas',    Icon: BarChart2 },
  { to: '/clientes',    label: 'Clientes',    Icon: Users },
  { to: '/proveedores', label: 'Proveedores', Icon: Building2 },
  { to: '/settings',    label: 'Ajustes',     Icon: Settings },
]

export default function Shell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const currentLabel = NAV.find(n => location.pathname.startsWith(n.to))?.label || 'CRM'

  return (
    <div className="min-h-screen flex flex-col bg-cream">

      {/* ── NAV DESKTOP ── */}
      <nav className="bg-brand h-[54px] items-center px-5 gap-0.5 sticky top-0 z-50 hidden md:flex">
        <div className="flex flex-col items-center justify-center gap-[2px] mr-5 flex-shrink-0">
          <span className="font-rexton text-white tracking-[.28em] text-[13px] uppercase leading-none pr-[.28em]">Ferreiro</span>
          <span className="font-baskerville italic text-white/55 text-[9px] tracking-wide leading-none">capturing moments</span>
        </div>
        <div className="w-px h-5 bg-white/15 mx-1.5" />
        {NAV.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-[5px] px-2.5 py-1.5 rounded-md text-[11.5px] transition-all cursor-pointer whitespace-nowrap
               ${isActive ? 'bg-white text-brand font-semibold shadow-sm' : 'text-white/60 hover:bg-white/12 hover:text-white'}`
            }>
            <Icon size={14} />{label}
          </NavLink>
        ))}
        <div className="flex-1" />
        <NavLink to="/alertas"
          className={({ isActive }) =>
            `w-8 h-8 rounded-full flex items-center justify-center transition-all relative
             ${isActive ? 'bg-white text-brand' : 'text-white/55 hover:bg-white/12'}`
          }>
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-400 rounded-full border border-brand" />
        </NavLink>
        <button onClick={logout}
          className="ml-1 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/12 transition-all">
          <LogOut size={14} />
        </button>
      </nav>

      {/* ── NAV MÓVIL — barra superior ── */}
      <nav className="bg-brand h-[52px] flex items-center px-4 sticky top-0 z-50 md:hidden">
        <div className="flex flex-col justify-center gap-[2px] flex-1">
          <span className="font-rexton text-white tracking-[.22em] text-[12px] uppercase leading-none pr-[.22em]">Ferreiro</span>
          <span className="font-baskerville italic text-white/50 text-[8.5px] tracking-wide leading-none">capturing moments</span>
        </div>
        <span className="text-white/70 text-sm flex-1 text-center">{currentLabel}</span>
        <div className="flex items-center gap-1 flex-1 justify-end">
          <NavLink to="/alertas"
            className={({ isActive }) =>
              `w-8 h-8 rounded-full flex items-center justify-center relative
               ${isActive ? 'bg-white text-brand' : 'text-white/60'}`
            }>
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-400 rounded-full border border-brand" />
          </NavLink>
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:bg-white/15 transition-all">
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* ── MENÚ MÓVIL DESPLEGABLE ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute top-[52px] left-0 right-0 bg-brand border-t border-white/10 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="grid grid-cols-4 gap-px bg-white/10 p-px">
              {NAV.map(({ to, label, Icon }) => (
                <NavLink key={to} to={to} onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1.5 py-4 px-2 text-center transition-all
                     ${isActive ? 'bg-white text-brand' : 'bg-brand text-white/70 hover:bg-white/10 hover:text-white'}`
                  }>
                  <Icon size={20} />
                  <span className="text-[10px] font-medium leading-none">{label}</span>
                </NavLink>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-white/50 text-xs">{user?.email}</span>
              <button onClick={logout} className="flex items-center gap-2 text-white/60 text-xs hover:text-white">
                <LogOut size={14} /> Salir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTENIDO ── */}
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>

      {/* ── NAV INFERIOR MÓVIL (accesos rápidos) ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-brand border-t border-white/10 z-40 md:hidden">
        <div className="flex">
          {NAV.slice(0, 5).map(({ to, label, Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-2.5 transition-all
                 ${isActive ? 'text-white' : 'text-white/40'}`
              }>
              <Icon size={18} />
              <span className="text-[9px] leading-none">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Espacio para nav inferior en móvil */}
      <div className="h-[56px] md:hidden" />
    </div>
  )
}
