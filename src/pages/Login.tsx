import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, User, IdCard, ChevronRight, Shield, LogIn, UserPlus } from 'lucide-react'
import { useNotifications } from 'reapop'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { supabase } from '@/lib/supabase'

type AuthMode = 'login' | 'register'

export default function Login() {
  const navigate = useNavigate()
  const { notify } = useNotifications()
  const [mode, setMode] = useState<AuthMode>('login')
  const [loading, setLoading] = useState(false)
  const [clickCount, setClickCount] = useState(0)

  // Campos
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [cedula, setCedula] = useState('')
  const [rol, setRol] = useState('inspector')

  // Huevo de pascua: 6 clics para registrar admin
  const handleSecretClick = () => {
    if (mode !== 'login') return
    const newCount = clickCount + 1
    setClickCount(newCount)
    if (newCount >= 6) {
      setMode('register')
      setClickCount(0)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      notify('Bienvenido al sistema', 'success')
      navigate('/mapa')
    } catch (err: any) {
      notify(err.message || 'Error al iniciar sesión', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre,
            apellido,
            cedula,
            rol,
          },
        },
      })
      if (error) throw error
      
      notify('Cuenta creada exitosamente', 'success')
      navigate('/mapa')
    } catch (err: any) {
      notify(err.message || 'Error al registrar usuario', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex w-full">
      {/* Lado Izquierdo: Imagen (Oculta en móviles muy pequeños) */}
      <div className="hidden md:flex w-1/2 bg-institutional-navy relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-black/20 z-10" />
        <img 
          src="/assets/images/imagenlogin.png" 
          alt="Mapa Catastral" 
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
        />
        <div className="relative z-20 p-12 flex flex-col h-full text-white w-full bg-gradient-to-r from-black/80 to-transparent">
          {/* Logo anclado arriba */}
          <div>
            <img src="/assets/logos/logo.png" alt="Logo" className="w-16 h-auto brightness-0 invert opacity-90" />
          </div>

          {/* Contenedor flexible para centrar el bloque principal de texto */}
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-4xl font-bold tracking-tight max-w-lg leading-tight">
              Sistema de Registro Catastral Municipal
            </h1>
            <p className="mt-4 text-lg text-gray-300 max-w-md leading-relaxed">
              Plataforma oficial para la organización territorial, el registro de propiedades y el desarrollo urbano del Municipio Torbes.
            </p>
          </div>

          {/* Footer del lado izquierdo */}
          <div className="text-sm text-gray-400 mt-8">
            &copy; {new Date().getFullYear()} Alcaldía del Municipio Torbes. Todos los derechos reservados.
          </div>
        </div>
      </div>

      {/* Lado Derecho: Formulario Minimalista */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 md:p-16 bg-white">
        <div className="w-full max-w-md">
          {/* Cabecera del form */}
          <div className="mb-8" onClick={handleSecretClick}>
            {/* Logo y título visibles SOLO en móvil */}
            <div className="flex lg:hidden flex-col items-center text-center mb-6">
              <img src="/assets/logos/logo.png" alt="Logo" className="w-20 h-auto mb-3" />
              <h1 className="text-xl font-bold text-institutional-navy leading-tight">
                Sistema de Registro Catastral Municipal
              </h1>
            </div>

            {/* Versión de escritorio (solo las siglas SRCM como título) */}
            <div className="hidden lg:flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-institutional-navy text-white rounded-lg flex items-center justify-center font-bold text-xl select-none cursor-default">
                S
              </div>
              <h2 className="text-2xl font-bold text-gray-900 select-none cursor-default">SRCM</h2>
            </div>
            
            <p className="text-sm text-gray-500 text-center lg:text-left">
              {mode === 'login' && 'Ingresa tus credenciales para continuar.'}
              {mode === 'register' && 'Registro de Personal Autorizado.'}
            </p>
          </div>



          {/* Formulario de Login */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5 animate-fade-in">
              <Input
                label="Correo Electrónico"
                icon={<Mail size={18} />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Contraseña"
                type="password"
                icon={<Lock size={18} />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-institutional-navy focus:ring-institutional-navy" />
                  Recordarme
                </label>
                <a href="#" className="text-institutional-navy hover:underline font-medium">¿Olvidaste tu clave?</a>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-institutional-navy hover:bg-[#152c6b] text-white py-3 rounded-lg font-medium transition disabled:opacity-50 mt-2"
              >
                {loading ? 'Accediendo...' : 'Iniciar Sesión'} <LogIn className="w-5 h-5" />
              </button>
            </form>
          )}

          {/* Formulario de Registro (Secreto) */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nombre" icon={<User size={18} />} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                <Input label="Apellido" icon={<User size={18} />} value={apellido} onChange={(e) => setApellido(e.target.value)} required />
              </div>
              <Input label="Cédula de Identidad" icon={<IdCard size={18} />} value={cedula} onChange={(e) => setCedula(e.target.value)} required />
              <Input label="Correo Institucional" type="email" icon={<Mail size={18} />} value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input label="Crear Contraseña" type="password" icon={<Lock size={18} />} value={password} onChange={(e) => setPassword(e.target.value)} required />
              <Select
                label="Rol del Sistema"
                icon={<Shield size={18} />}
                value={rol}
                onChange={(e) => setRol(e.target.value)}
                options={[
                  { value: 'administrador', label: 'Administrador' },
                  { value: 'topografo', label: 'Ingeniero / Topógrafo' },
                  { value: 'inspector', label: 'Inspector' },
                ]}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-institutional-gold hover:bg-[#7a6a57] text-white py-3 rounded-lg font-medium transition disabled:opacity-50 mt-4"
              >
                {loading ? 'Registrando y Entrando...' : 'Crear Cuenta'} <UserPlus className="w-5 h-5" />
              </button>
              <button type="button" onClick={() => setMode('login')} className="w-full text-center text-sm text-gray-500 hover:text-gray-900 mt-2">
                Volver al login
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
