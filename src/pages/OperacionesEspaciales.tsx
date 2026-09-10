import { useState, useEffect } from 'react'
import { Scissors, Combine, Map as MapIcon, Construction, AlertTriangle, RefreshCcw } from 'lucide-react'
import { api } from '@/lib/api'
import { useNotifications } from 'reapop'

export default function OperacionesEspaciales() {
  const [activeTab, setActiveTab] = useState<'desmembrar' | 'englobar' | 'solapamientos'>('desmembrar')
  const [solapamientos, setSolapamientos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { notify } = useNotifications()

  const loadSolapamientos = async () => {
    setLoading(true)
    try {
      const data = await api.getSolapamientos()
      setSolapamientos(data || [])
    } catch (err: any) {
      notify('Error cargando los solapamientos: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'solapamientos') {
      loadSolapamientos()
    }
  }, [activeTab])

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-main">Actualización de Parcelas</h1>
        <p className="text-sm text-institutional-slate">Herramientas administrativas para dividir, unir y revisar los límites de los terrenos.</p>
      </div>

      <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px] flex-1">
        
        {/* Sidebar tools */}
        <div className="w-64 border-r border-gray-200 bg-background-light p-4 hidden md:flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab('desmembrar')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition ${
                activeTab === 'desmembrar' 
                  ? 'bg-institutional-navy text-white shadow-md' 
                  : 'bg-white text-text-charcoal hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Scissors className="w-5 h-5" /> Dividir Terreno
            </button>
            <button
              onClick={() => setActiveTab('englobar')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition ${
                activeTab === 'englobar' 
                  ? 'bg-institutional-navy text-white shadow-md' 
                  : 'bg-white text-text-charcoal hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Combine className="w-5 h-5" /> Unir Lotes
            </button>
            <button
              onClick={() => setActiveTab('solapamientos')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition ${
                activeTab === 'solapamientos' 
                  ? 'bg-red-600 text-white shadow-md' 
                  : 'bg-white text-red-600 hover:bg-red-50 border border-red-200'
              }`}
            >
              <AlertTriangle className="w-5 h-5" /> Revisar Linderos
            </button>
          </div>

          <div className="mt-auto p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <h3 className="text-xs font-bold text-blue-900 mb-1 flex items-center gap-1">
              <Construction className="w-4 h-4" /> Área Técnica
            </h3>
            <p className="text-[10px] text-blue-800 leading-tight">
              Herramientas exclusivas para el personal de catastro. Cualquier modificación en los límites requiere autorización.
            </p>
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 bg-background-grey relative flex flex-col">
          {activeTab !== 'solapamientos' ? (
            <>
              <div className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur rounded-lg shadow-sm border border-gray-200 px-4 py-3 flex items-center gap-3 z-10">
                <MapIcon className="w-5 h-5 text-institutional-navy" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-text-charcoal">
                    {activeTab === 'desmembrar' ? 'Dividir Terreno (Desmembración)' : 'Unir Lotes (Englobe)'}
                  </p>
                  <p className="text-xs text-institutional-slate">
                    {activeTab === 'desmembrar' 
                      ? 'Seleccione una propiedad en el mapa y trace una línea para dividirla en dos.' 
                      : 'Seleccione dos o más terrenos vecinos para unirlos en una sola propiedad.'}
                  </p>
                </div>
                <button className="bg-institutional-gold hover:bg-[#7a6a57] text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition">
                  Activar Edición
                </button>
              </div>

              {/* Fake Map Background */}
              <div className="flex-1 w-full h-full opacity-30 flex items-center justify-center relative" style={{
                backgroundImage: 'radial-gradient(#9ca3af 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}>
                <div className="text-center">
                  <MapIcon className="w-16 h-16 text-gray-400 mx-auto mb-2 opacity-50" />
                  <p className="text-gray-500 font-medium">Mapa de Edición</p>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 h-full flex flex-col bg-white">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
                    <AlertTriangle className="text-red-500 w-5 h-5" /> 
                    Conflictos de Linderos
                  </h2>
                  <p className="text-sm text-institutional-slate">Identifica terrenos que se están cruzando o montando uno sobre el otro.</p>
                </div>
                <button onClick={loadSolapamientos} className="flex items-center gap-2 text-sm bg-background-light border border-gray-200 hover:bg-gray-100 px-4 py-2 rounded-lg transition text-text-charcoal font-medium">
                  <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
                </button>
              </div>

              {loading ? (
                <div className="flex-1 flex items-center justify-center text-institutional-slate animate-pulse">Analizando el mapa...</div>
              ) : solapamientos.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-green-700 bg-green-50 rounded-xl border border-green-200">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                    <MapIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-bold">¡Todo en orden!</h3>
                  <p className="text-sm mt-1">No se detectaron propiedades cruzadas en el mapa.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-red-50 text-red-900 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 font-semibold rounded-tl-lg">Propiedad 1</th>
                        <th className="px-4 py-3 font-semibold">Propiedad 2</th>
                        <th className="px-4 py-3 font-semibold">Área cruzada (Error)</th>
                        <th className="px-4 py-3 font-semibold text-right rounded-tr-lg">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {solapamientos.map((s, i) => (
                        <tr key={i} className="hover:bg-red-50/50 transition">
                          <td className="px-4 py-3 font-mono font-medium text-text-main">{s.predio_a}</td>
                          <td className="px-4 py-3 font-mono font-medium text-text-main">{s.predio_b}</td>
                          <td className="px-4 py-3 font-bold text-red-600">{s.area_solape_m2} m²</td>
                          <td className="px-4 py-3 text-right">
                            <button className="text-institutional-navy hover:underline text-xs font-semibold">
                              Ver en Mapa
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
