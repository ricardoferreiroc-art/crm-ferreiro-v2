import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useAuth } from './context/AuthContext'
import {
  LayoutDashboard, Filter, Camera, Calendar,
  BarChart2, Users, Building2, Bell, LogOut, Settings,
} from 'lucide-react'

const NAV = [
  { to: '/dashboard',   label: 'Dashboard',    Icon: LayoutDashboard },
  { to: '/leads',       label: 'Leads',        Icon: Filter },
  { to: '/trabajos',    label: 'Trabajos',     Icon: Camera },
  { to: '/calendario',  label: 'Calendario',   Icon: Calendar },
  { to: '/finanzas',    label: 'Finanzas',     Icon: BarChart2 },
  { to: '/clientes',    label: 'Clientes',     Icon: Users },
  { to: '/proveedores', label: 'Proveedores',  Icon: Building2 },
  { to: '/settings',    label: 'Ajustes',      Icon: Settings },
]

export default function Shell() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const initiales = user?.email?.[0]?.toUpperCase() ?? 'R'

  return (
    <div className="min-h-screen flex flex-col bg-cream">

      {/* NAV */}
      <nav className="bg-brand h-[54px] flex items-center px-6 gap-0 sticky top-0 z-50">

        {/* Logo — Rexton + Baskerville SOLO aquí */}
        <div className="flex flex-col items-center justify-center gap-[3px] px-4 py-[7px] border border-white/20 rounded-[3px] mr-5 flex-shrink-0">
          <span className="font-rexton text-white tracking-[.28em] text-[13.5px] uppercase leading-none pr-[.28em]">
            Ferreiro
          </span>
          <span className="font-baskerville italic text-white/60 text-[9.5px] tracking-wide leading-none">
            capturing moments
          </span>
        </div>

        <div className="w-px h-5 bg-white/15 mx-1.5" />

        {/* Items de navegación */}
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-[5px] px-2.5 py-1.5 rounded-md text-[12px] transition-all cursor-pointer whitespace-nowrap
               ${isActive
                 ? 'bg-white/15 text-white font-medium'
                 : 'text-white/48 hover:bg-white/9 hover:text-white/82'}`
            }
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}

        <div className="flex-1" />

        {/* Alertas */}
        <NavLink
          to="/alertas"
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/55 hover:bg-white/10 transition-all relative"
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-400 rounded-full border border-brand" />
        </NavLink>

        {/* Avatar */}
        <div className="w-[30px] h-[30px] rounded-full bg-white/16 flex items-center justify-center text-white text-[11px] font-medium ml-2 cursor-pointer">
          {initiales}
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="ml-2 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10 transition-all"
          title="Cerrar sesión"
        >
          <LogOut size={14} />
        </button>
      </nav>

      {/* Contenido */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
