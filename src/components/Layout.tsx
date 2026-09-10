import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Map, Home, BarChart3, LogOut, Wifi, WifiOff, CloudUpload, Scissors, User as UserIcon, ShieldAlert, Users, UserCog, Calculator } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnline'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Layout() {
  const online = useOnlineStatus()
  const navigate = useNavigate()
  const location = useLocation()
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  
  const [userProfile, setUserProfile] = useState<{
    nombre: string
    apellido: string
    rol: string
    email: string
  } | null>(null)

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Consultar la tabla de usuarios
        const { data: profile, error } = await supabase
          .from('usuarios')
          .select('nombre, apellido, rol')
          .eq('id', user.id)
          .single()

        if (profile && !error) {
          setUserProfile({
            nombre: profile.nombre,
            apellido: profile.apellido,
            rol: profile.rol,
            email: user.email || ''
          })
        } else {
          // Fallback a metadata
          const meta = user.user_metadata
          setUserProfile({
            nombre: meta.nombre || 'Usuario',
            apellido: meta.apellido || '',
            rol: meta.rol || 'inspector',
            email: user.email || ''
          })
        }
      }
    }
    loadUser()
  }, [])

  const handleSync = async () => {
    if (!online || syncing) return
    setSyncing(true)
    try {
      await new Promise(r => setTimeout(r, 1000))
      setSyncMsg(`Sincronización completa: Base de datos Supabase en línea.`)
    } catch {
      setSyncMsg('Error al sincronizar')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(null), 4000)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const isPrivileged = userProfile?.rol === 'administrador' || userProfile?.rol === 'topografo'

  const navItems = [
    { to: '/mapa', icon: Map, label: 'Mapa General', mobileLabel: 'Mapa' },
    ...(isPrivileged ? [{ to: '/registrar', icon: Home, label: 'Registrar Inmueble', mobileLabel: 'Registrar' }] : []),
    { to: '/estadisticas', icon: BarChart3, label: 'Estadísticas', mobileLabel: 'Métricas' },
    ...(isPrivileged ? [{ to: '/operaciones', icon: Scissors, label: 'Actualización de Parcelas', mobileLabel: 'Parcelas' }] : []),
    ...(isPrivileged ? [{ to: '/propietarios', icon: Users, label: 'Directorio de Propietarios', mobileLabel: 'Propietarios' }] : []),
    ...(userProfile?.rol === 'administrador' ? [{ to: '/usuarios', icon: UserCog, label: 'Gestión de Usuarios', mobileLabel: 'Usuarios' }] : []),
    ...(userProfile?.rol === 'administrador' ? [{ to: '/avaluos', icon: Calculator, label: 'Avalúos y Tasas', mobileLabel: 'Avalúos' }] : []),
  ]

  const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'bg-institutional-navy text-white shadow-md shadow-institutional-navy/20'
        : 'text-text-charcoal hover:bg-background-lighter'
    }`



  return (
    <div className="min-h-screen bg-background-light flex flex-col md:flex-row pb-16 md:pb-0 font-sans">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-5 py-3 bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 safe-top shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2.5">
          <img src="/assets/logos/logo.png" alt="Logo" className="w-8 h-auto object-contain" />
          <div className="flex flex-col justify-center">
            <h1 className="text-[15px] font-black text-institutional-navy leading-none tracking-tight">SRCM</h1>
            <span className="text-[10px] font-semibold text-institutional-slate mt-0.5">Gestión Catastral</span>
          </div>
        </div>
        <div className="flex items-center">
          {userProfile && (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-institutional-navy to-[#1a3686] text-white flex items-center justify-center text-xs font-bold uppercase shadow-sm ring-2 ring-gray-50">
              {userProfile.nombre.charAt(0)}{userProfile.apellido.charAt(0)}
            </div>
          )}
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 bg-white border-r border-gray-200 flex-col fixed h-full z-50 shadow-sm">
        {/* Header / Logo */}
        <div className="px-5 py-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img src="/assets/logos/logo.png" alt="Logo" className="w-12 h-auto object-contain" />
            <div>
              <h1 className="text-lg font-bold text-text-main tracking-tight leading-tight">SRCM</h1>
              <p className="text-xs text-institutional-slate font-medium">Gestión Predial Torbes</p>
            </div>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="px-5 py-5 border-b border-gray-100 bg-background-light">
          {userProfile ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-institutional-navy text-white flex items-center justify-center text-sm font-bold uppercase shadow-inner border-2 border-white">
                {userProfile.nombre.charAt(0)}{userProfile.apellido.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text-main truncate">
                  {userProfile.nombre} {userProfile.apellido}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <ShieldAlert className="w-3 h-3 text-institutional-gold" />
                  <p className="text-[10px] font-semibold text-institutional-gold uppercase tracking-wider">
                    {userProfile.rol}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          <p className="px-4 text-[10px] font-bold text-institutional-slate uppercase tracking-wider mb-3">
            Navegación Principal
          </p>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={desktopLinkClass}>
              <item.icon className="w-4 h-4" /> 
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer / Status */}
        <div className="px-4 py-4 border-t border-gray-100 space-y-3 bg-white">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold ${
            online ? 'bg-green-50/50 border border-green-100' : 'bg-red-50/50 border border-red-100'
          }`}>
            {online ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-green-600" />
                <span className="text-green-700">Sistema en línea</span>
                <span className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-red-600" />
                <span className="text-red-700">Sin conexión local</span>
              </>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition shadow-sm"
          >
            <LogOut className="w-4 h-4 text-white" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-72 w-full h-full relative bg-[#f8fafc]">
        {syncMsg && (
          <div className="fixed top-16 md:top-4 right-4 md:right-4 z-[1000] bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm text-text-charcoal animate-fade-in">
            {syncMsg}
          </div>
        )}
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 z-50 safe-bottom h-[68px] overflow-x-auto shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.1)]">
        <div className="flex min-w-max h-full px-2 gap-1 items-center justify-between" style={{ minWidth: '100%' }}>
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink key={item.to} to={item.to} className="relative flex flex-col items-center justify-center flex-1 h-full pt-1 tap-highlight-transparent min-w-[70px]">
                <div className={`
                  relative z-10 flex items-center justify-center transition-all duration-300 ease-out rounded-full
                  ${isActive 
                    ? '-translate-y-4 bg-institutional-navy text-white shadow-lg shadow-institutional-navy/40 w-[42px] h-[42px] border-[3px] border-white' 
                    : 'text-institutional-slate w-8 h-8 bg-transparent'
                  }
                `}>
                  <item.icon className={isActive ? 'w-[22px] h-[22px]' : 'w-6 h-6'} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`absolute bottom-2 text-[10px] font-bold transition-all duration-300 
                  ${isActive ? 'text-institutional-navy opacity-100' : 'text-institutional-slate opacity-100'}`}
                >
                  {item.mobileLabel}
                </span>
              </NavLink>
            );
          })}
          
          {/* Botón Cerrar Sesión Móvil */}
          <button 
            onClick={handleLogout}
            className="relative flex flex-col items-center justify-center flex-1 h-full pt-1 tap-highlight-transparent min-w-[70px] pr-2"
          >
            <div className="relative z-10 flex items-center justify-center transition-all duration-300 ease-out rounded-full text-red-500 w-8 h-8 bg-transparent">
              <LogOut className="w-6 h-6" strokeWidth={2} />
            </div>
            <span className="absolute bottom-2 text-[10px] font-bold transition-all duration-300 text-red-500 opacity-100">
              Salir
            </span>
          </button>
        </div>
      </nav>
    </div>
  )
}
