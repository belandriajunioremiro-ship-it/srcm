import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import MapaGeneral from '@/pages/MapaGeneral'
import RegistrarInmueble from '@/pages/RegistrarInmueble'
import FichaCatastral from '@/pages/FichaCatastral'
import Estadisticas from '@/pages/Estadisticas'
import OperacionesEspaciales from '@/pages/OperacionesEspaciales'
import AvaluosConfig from '@/pages/AvaluosConfig'
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>
  
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

import NotificationsSystem, { atalhoTheme, NotificationsProvider, setUpNotifications, useNotifications } from 'reapop'

setUpNotifications({
  defaultProps: {
    position: 'top-right',
    dismissible: true,
    dismissAfter: 4000
  }
})

function NotificationWrapper() {
  const { notifications, dismissNotification } = useNotifications()
  return (
    <NotificationsSystem
      notifications={notifications || []}
      dismissNotification={(id) => dismissNotification(id)}
      theme={atalhoTheme}
    />
  )
}

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Pequeño delay para que el CSS de leaflet cargue limpiamente
    const t = setTimeout(() => setReady(true), 100)
    return () => clearTimeout(t)
  }, [])

  if (!ready) return null

  return (
    <NotificationsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/mapa" element={<MapaGeneral />} />
            <Route path="/registrar" element={<RegistrarInmueble />} />
            <Route path="/ficha/:id" element={<FichaCatastral />} />
            <Route path="/estadisticas" element={<Estadisticas />} />
            <Route path="/operaciones" element={<OperacionesEspaciales />} />
            <Route path="/avaluos" element={<AvaluosConfig />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      <NotificationWrapper />
    </NotificationsProvider>
  )
}
