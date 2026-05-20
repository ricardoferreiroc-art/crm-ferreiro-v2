import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Shell from './Shell'
import Login from './modules/auth/Login'
import Dashboard from './modules/dashboard/Dashboard'
import Leads from './modules/leads/Leads'
import Trabajos from './modules/trabajos/Trabajos'
import TrabajoDetalle from './modules/trabajos/TrabajoDetalle'
import Finanzas from './modules/finanzas/Finanzas'
import Clientes from './modules/clientes/Clientes'
import Proveedores from './modules/proveedores/Proveedores'

// Placeholders pendientes
const Placeholder = ({ titulo }) => (
  <div className="p-7">
    <h1 className="text-[15px] font-medium text-ink mb-2">{titulo}</h1>
    <p className="text-sm text-ink-3">Próximamente</p>
  </div>
)

function Guard({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-cream"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
  return session ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { session, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-cream"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<Guard><Shell /></Guard>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="leads" element={<Leads />} />
        <Route path="trabajos" element={<Trabajos />} />
        <Route path="trabajos/:id" element={<TrabajoDetalle />} />
        <Route path="calendario" element={<Placeholder titulo="Calendario" />} />
        <Route path="finanzas" element={<Finanzas />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="proveedores" element={<Proveedores />} />
        <Route path="alertas" element={<Placeholder titulo="Alertas" />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
