import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, Building2, Layers, LocateFixed, Navigation, Plus, User, Download, ChevronDown, Home, Store, Factory, Leaf, Building } from 'lucide-react'
import { saveAs } from 'file-saver'
import tokml from 'tokml'
// @ts-ignore
import shpWrite from 'shp-write'
import MapaCatastral from '@/components/map/MapaCatastral'
import { api } from '@/lib/api'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useOnlineStatus } from '@/hooks/useOnline'
import { formatCoord } from '@/lib/geo'
import type { Inmueble } from '@/types'

const tipoColores: Record<string, string> = {
  residencial: '#1E3A8A', // Institutional navy
  comercial: '#8C7B68',   // Institutional gold
  industrial: '#475569',  // Institutional slate
  rural: '#166534',       // Dark green
  mixto: '#7c3aed',       // Serious purple
}

const getLucideIcon = (tipo: string, props: any) => {
  switch (tipo) {
    case 'residencial': return <Home {...props} />
    case 'comercial': return <Store {...props} />
    case 'industrial': return <Factory {...props} />
    case 'rural': return <Leaf {...props} />
    case 'mixto': return <Building {...props} />
    default: return <MapPin {...props} />
  }
}

export default function MapaGeneral() {
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const geo = useGeolocation()
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [filterTipo, setFilterTipo] = useState<string | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const handleExport = (format: 'geojson' | 'kml' | 'shp') => {
    const geojson = {
      type: 'FeatureCollection',
      features: inmuebles.map(i => ({
        type: 'Feature',
        geometry: i.geom,
        properties: {
          codigo: i.codigo_catastral,
          propietario: (i.propietarios && i.propietarios.length > 0) ? `${i.propietarios[0].nombre} ${i.propietarios[0].apellido}` : (i.propietario ? `${i.propietario.nombre} ${i.propietario.apellido}` : 'Desconocido'),
          area: i.superficie_gis_m2 ?? i.superficie_m2,
          tipo: i.tipo_inmueble,
          direccion: i.direccion
        }
      }))
    }

    if (format === 'geojson') {
      const blob = new Blob([JSON.stringify(geojson)], { type: 'application/json' })
      saveAs(blob, 'catastro_torbes.geojson')
    } else if (format === 'kml') {
      // tokml only accepts FeatureCollection if it's strictly formatted.
      const kml = tokml(geojson)
      const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' })
      saveAs(blob, 'catastro_torbes.kml')
    } else if (format === 'shp') {
      try {
        shpWrite.download({
          folder: 'catastro_torbes',
          types: { polygon: 'predios' },
        }, geojson)
      } catch (err) {
        alert('Error exportando Shapefile. Intente con GeoJSON/KML.')
        console.error(err)
      }
    }
    
    setShowExportMenu(false)
  }

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getInmuebles()
        // API already returns 'propietarios' array populated if it was joined, or we can fetch them if needed.
        // For the map, we might need to fetch owners if they are not included in getInmuebles.
        // Currently getInmuebles just does select('*'). We'll just set it.
        // To fix this we can update api.getInmuebles to fetch owners or use a view later, for now we will just use it.
        const fullData = await Promise.all(data.map(async (i) => {
           try { return await api.getInmueble(i.id) } catch (e) { return i }
        }))
        setInmuebles(fullData)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = inmuebles.filter((i) => {
    if (filterTipo && i.tipo_inmueble !== filterTipo) return false
    const q = search.toLowerCase()
    return (
      i.codigo_catastral.toLowerCase().includes(q) ||
      i.direccion.toLowerCase().includes(q) ||
      (i.barrio ?? '').toLowerCase().includes(q) ||
      (i.propietario?.nombre ?? '').toLowerCase().includes(q) ||
      (i.propietario?.apellido ?? '').toLowerCase().includes(q) ||
      (i.propietario?.cedula ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="p-4 md:p-6 flex flex-col h-full md:h-screen">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 gap-4">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-text-main">Mapa Catastral</h1>
          <p className="text-sm text-institutional-slate">
            {filtered.length} predios en el mapa
            {online ? (
              <span className="ml-2 text-green-700 font-medium">· En línea</span>
            ) : (
              <span className="ml-2 text-red-700 font-medium">· Sin conexión</span>
            )}
          </p>
        </div>
        <div className="flex w-full md:w-auto items-center gap-2 md:gap-3">
          <div className="relative flex-1 md:w-64 lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar predio..."
              className="w-full pl-10 pr-4 py-2 md:py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-institutional-navy focus:border-institutional-navy outline-none transition"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 bg-institutional-gold hover:bg-[#7a6a57] text-white px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-sm font-semibold transition shadow-sm whitespace-nowrap"
            >
              <Download className="w-4 h-4" /> <span className="hidden md:inline">Exportar GIS</span> <ChevronDown className="w-3 h-3" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-[2000]">
                <button onClick={() => handleExport('kml')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-background-light">Exportar KML (Google Earth)</button>
                <button onClick={() => handleExport('geojson')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-background-light">Exportar GeoJSON</button>
                <button onClick={() => handleExport('shp')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-background-light">Exportar Shapefile (ZIP)</button>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/registrar')}
            className="flex items-center gap-2 bg-institutional-navy hover:bg-[#152c6b] text-white px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-sm font-semibold transition shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> <span className="hidden md:inline">Nuevo</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 flex-1 overflow-hidden min-h-[600px] md:min-h-0">
        {/* Map */}
        <div className="w-full md:w-2/3 h-[50vh] md:h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
          {loading ? (
            <div className="h-full flex items-center justify-center text-institutional-slate">
              <div className="animate-pulse">Cargando mapa...</div>
            </div>
          ) : (
            <>
              <MapaCatastral
                inmuebles={filtered}
                onSelect={(id) => setSelectedId(id)}
                selectedId={selectedId}
                userPosition={geo.position}
              />
              {/* GPS button overlay */}
              <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-2">
                <button
                  onClick={() => geo.requestPosition()}
                  disabled={geo.loading}
                  className="bg-white hover:bg-background-lighter text-text-charcoal p-2 md:p-2.5 rounded-lg shadow-md text-sm font-medium transition disabled:opacity-50 flex items-center gap-2 border border-gray-200"
                  title="Mi ubicación GPS"
                >
                  <LocateFixed className={`w-5 h-5 ${geo.loading ? 'animate-spin' : 'text-institutional-navy'}`} />
                </button>
                {geo.position && (
                  <div className="bg-white/95 backdrop-blur rounded-lg shadow-md px-3 py-2 text-xs border border-gray-200">
                    <p className="font-mono font-semibold text-text-main">{formatCoord(geo.position[0], geo.position[1])}</p>
                    {geo.accuracy && <p className="text-institutional-slate mt-0.5">±{geo.accuracy.toFixed(0)}m</p>}
                  </div>
                )}
              </div>
              {geo.error && (
                <div className="absolute top-3 left-16 md:left-16 z-[1000] bg-red-50 border border-red-200 rounded-lg shadow-md px-3 py-2 text-xs text-red-700 max-w-[200px] md:max-w-xs">
                  {geo.error}
                </div>
              )}
            </>
          )}
        </div>

        {/* List */}
        <div className="w-full md:w-1/3 flex-1 md:h-full bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col min-h-[300px]">
          <div className="px-4 py-3 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-xl">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-institutional-slate" />
              <h2 className="text-sm font-semibold text-text-charcoal">Listado de Predios</h2>
            </div>
            {/* Type filter chips */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilterTipo(null)}
                className={`text-[10px] md:text-xs px-2 md:px-2.5 py-1 rounded-full transition font-semibold ${
                  filterTipo === null ? 'bg-institutional-navy text-white shadow-sm' : 'bg-background-grey text-text-charcoal hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              {Object.entries(tipoColores).map(([tipo, color]) => (
                <button
                  key={tipo}
                  onClick={() => setFilterTipo(filterTipo === tipo ? null : tipo)}
                  className={`text-[10px] md:text-xs px-2 md:px-2.5 py-1 rounded-full flex items-center gap-1 transition capitalize font-semibold ${
                    filterTipo === tipo ? 'text-white shadow-sm' : 'bg-background-grey text-text-charcoal hover:bg-gray-200'
                  }`}
                  style={filterTipo === tipo ? { backgroundColor: color } : {}}
                >
                  {getLucideIcon(tipo, { className: "w-3 h-3" })} <span className="hidden md:inline">{tipo}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-100 flex-1 overflow-y-auto">
            {filtered.map((i) => (
              <button
                key={i.id}
                onClick={() => setSelectedId(i.id)}
                onDoubleClick={() => navigate(`/ficha/${i.id}`)}
                className={`w-full text-left px-4 py-3 hover:bg-background-light transition ${
                  selectedId === i.id ? 'bg-background-lighter border-l-4 border-institutional-navy' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {getLucideIcon(i.tipo_inmueble, { className: "w-4 h-4 text-institutional-slate" })}
                      <p className="text-sm font-semibold text-text-main truncate">{i.codigo_catastral}</p>
                    </div>
                    <p className="text-xs text-institutional-slate truncate mt-0.5">{i.direccion}</p>
                    <p className="text-[10px] md:text-xs text-gray-400 mt-0.5">{i.barrio} — {i.zona}</p>
                  </div>
                  <span
                    className="inline-block w-3 h-3 rounded-full flex-shrink-0 mt-1 ring-2 ring-white shadow-sm"
                    style={{ backgroundColor: tipoColores[i.tipo_inmueble] }}
                  />
                </div>
                <div className="flex items-center gap-3 mt-2 text-[10px] md:text-xs text-institutional-slate">
                  <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{i.superficie_gis_m2?.toFixed(0) ?? i.superficie_m2} m²</span>
                  {i.propietario && (
                    <span className="flex items-center gap-1 truncate"><User className="w-3 h-3 flex-shrink-0" /><span className="truncate">{i.propietario.nombre} {i.propietario.apellido}</span></span>
                  )}
                  {i.estado_sync === 'pendiente' && (
                    <span className="flex items-center gap-1 text-red-600"><Navigation className="w-3 h-3" />Pendiente</span>
                  )}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-institutional-slate">No se encontraron predios</p>
            )}
          </div>
          <div className="p-3 md:p-4 sticky bottom-0 bg-white border-t border-gray-200">
            <p className="hidden md:block text-xs text-institutional-slate mb-2">Doble clic para ver la ficha completa</p>
            {selectedId && (
              <button
                onClick={() => navigate(`/ficha/${selectedId}`)}
                className="w-full bg-institutional-navy hover:bg-[#152c6b] text-white py-2 rounded-lg text-sm font-medium transition shadow-sm"
              >
                Ver ficha catastral
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="hidden md:flex mt-4 items-center justify-between gap-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 p-2 pl-4">
        <div className="flex items-center gap-6">
          <span className="text-[11px] font-extrabold text-text-main uppercase tracking-wider">Leyenda Catastral</span>
          <div className="flex flex-wrap items-center gap-3">
            {Object.entries(tipoColores).map(([tipo, color]) => (
              <div key={tipo} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors hover:bg-background-light">
                <div className="flex items-center justify-center w-6 h-6 drop-shadow-sm">
                  <div 
                    className="w-[18px] h-[18px] flex items-center justify-center text-white border-[1.5px] border-white"
                    style={{ 
                      backgroundColor: color,
                      borderRadius: '50% 50% 50% 0',
                      transform: 'rotate(-45deg)'
                    }}
                  >
                    <div style={{ transform: 'rotate(45deg)', display: 'flex' }}>
                      {getLucideIcon(tipo, { style: { width: '10px', height: '10px' }, strokeWidth: 3 })}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-text-charcoal capitalize">{tipo}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background-light rounded-lg border border-gray-200">
          <div className="relative flex items-center justify-center w-4 h-4">
            <div className="absolute w-full h-full bg-institutional-navy rounded-full opacity-20 animate-ping" />
            <div className="w-2.5 h-2.5 bg-institutional-navy rounded-full border border-white relative z-10 shadow-sm" />
          </div>
          <span className="text-[10px] font-bold text-institutional-slate uppercase tracking-wide">Ubicación GPS</span>
        </div>
      </div>
    </div>
  )
}
