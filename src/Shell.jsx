import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useAuth } from './context/AuthContext'
import {
  LayoutDashboard, Filter, Camera, Calendar,
  BarChart2, Users, Building2, Bell, LogOut, Settings,
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

  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <nav className="bg-brand h-[54px] flex items-center px-5 gap-0.5 sticky top-0 z-50">

        {/* Logo — SIN recuadro, texto directo sobre el fondo azul */}
        <div className="flex flex-col items-center justify-center gap-[2px] mr-5 flex-shrink-0">
          <span className="font-rexton text-white tracking-[.28em] text-[13px] uppercase leading-none pr-[.28em]">
            Ferreiro
          </span>
          <span className="font-baskerville italic text-white/55 text-[9px] tracking-wide leading-none">
            capturing moments
          </span>
        </div>

        <div className="w-px h-5 bg-white/15 mx-1.5" />

        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-[5px] px-2.5 py-1.5 rounded-md text-[11.5px] transition-all cursor-pointer whitespace-nowrap
               ${isActive
                 ? 'bg-white text-brand font-semibold shadow-sm'
                 : 'text-white/60 hover:bg-white/12 hover:text-white'}`
            }
          >
            <Icon size={14} />
            {label}
          </NavLink>
        ))}

        <div className="flex-1" />

        <NavLink
          to="/alertas"
          className={({ isActive }) =>
            `w-8 h-8 rounded-full flex items-center justify-center transition-all relative
             ${isActive ? 'bg-white text-brand' : 'text-white/55 hover:bg-white/12'}`
          }
        >
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-400 rounded-full border border-brand" />
        </NavLink>

        <button
          onClick={logout}
          className="ml-1 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/12 transition-all"
          title="Cerrar sesión"
        >
          <LogOut size={14} />
        </button>
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
