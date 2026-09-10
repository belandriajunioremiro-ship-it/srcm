import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, MapPin, User, FileText, Building2, Ruler, AlertCircle, Check, Clock, Compass, Calendar, Hash, MapPinned } from 'lucide-react'
import { Icon } from '@iconify/react'
import * as turf from '@turf/turf'
import QRCode from 'qrcode'
import { api } from '@/lib/api'
import { centroide, formatCoord, formatDMS, getVertices, resumenVertices } from '@/lib/geo'
import { pdf } from '@react-pdf/renderer'
import FichaPDF from '@/components/pdf/FichaPDF'
import PlanoCartograficoPDF from '@/components/pdf/PlanoCartograficoPDF'
import MapaFicha from '@/components/map/MapaFicha'
import type { Inmueble } from '@/types'

const tipoColores: Record<string, string> = {
  residencial: '#1E3A8A',
  comercial: '#8C7B68',
  industrial: '#475569',
  rural: '#166534',
  mixto: '#7c3aed',
}

const tipoIconos: Record<string, string> = {
  residencial: 'mdi:home',
  comercial: 'mdi:store',
  industrial: 'mdi:factory',
  rural: 'mdi:sprout',
  mixto: 'mdi:city',
}

export default function FichaCatastral() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [inmueble, setInmueble] = useState<Inmueble | null>(null)
  const [parametros, setParametros] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [downloadingPlano, setDownloadingPlano] = useState(false)

  useEffect(() => {
    (async () => {
      if (!id) return
      try {
        const [data, paramsData] = await Promise.all([
          api.getInmueble(id),
          api.getParametros().catch(() => null)
        ])
        setInmueble(data)
        setParametros(paramsData)
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const handleDownloadPDF = async () => {
    if (!inmueble) return
    setDownloading(true)
    try {
      // Generar QR Code con datos de verificación
      const qrPayload = `CEDULA-CATASTRAL|${inmueble.codigo_catastral}|EXP-${new Date().getFullYear()}-${inmueble.codigo_catastral.split('-').pop()}|${new Date().toISOString().split('T')[0]}`
      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 120,
        margin: 1,
        color: { dark: '#13233C', light: '#ffffff' }
      })

      const blob = await pdf(
        <FichaPDF inmueble={inmueble} parametros={parametros} qrDataUrl={qrDataUrl} />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cedula_catastral_${inmueble.codigo_catastral}.pdf`
      a.click()
    } catch (error) {
      console.error('Error generating PDF', error)
      alert('Error generando la ficha en PDF.')
    } finally {
      setDownloading(false)
    }
  }

  const handleDownloadPlano = async () => {
    if (!inmueble) return
    setDownloadingPlano(true)
    try {
      // 1. Obtener todos los inmuebles para buscar colindancias
      const allInmuebles = await api.getInmuebles()
      
      // 2. FILTRO INTELIGENTE CON TURF.JS: Detectar qué predios tocan realmente el nuestro
      const vecinosReales: Inmueble[] = []
      const mainFeature = turf.feature(inmueble.geom)
      
      for (const v of allInmuebles) {
        if (v.id === inmueble.id || !v.geom) continue
        try {
          const vecinoFeature = turf.feature(v.geom)
          // booleanIntersects devuelve true si los polígonos se tocan o se cruzan
          if (turf.booleanIntersects(mainFeature, vecinoFeature)) {
            // 3. Enriquecer SOLAMENTE a los vecinos reales con datos de propietarios
            try {
              const vFull = await api.getInmueble(v.id)
              vecinosReales.push(vFull)
            } catch(e) {
              vecinosReales.push(v) // Si falla el fetch, usamos el dato básico
            }
          }
        } catch (e) {
          console.error('Error verificando intersección', e)
        }
      }

      // 4. Generar el PDF con el polígono principal y sus vecinos reales
      const blob = await pdf(
        <PlanoCartograficoPDF inmueble={inmueble} vecinos={vecinosReales} />
      ).toBlob()
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `plano_topografico_${inmueble.codigo_catastral}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    } finally {
      setDownloadingPlano(false)
    }
  }

  if (loading) {
    return <div className="p-4 md:p-6 text-institutional-slate animate-pulse">Cargando ficha...</div>
  }

  if (!inmueble) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-institutional-slate">No se encontró el inmueble</p>
          <button onClick={() => navigate('/mapa')} className="mt-4 text-institutional-navy text-sm font-medium hover:underline">
            Volver al mapa
          </button>
        </div>
      </div>
    )
  }

  const color = tipoColores[inmueble.tipo_inmueble] ?? '#475569'
  const iconName = tipoIconos[inmueble.tipo_inmueble] ?? 'mdi:map-marker'

  const estadoInfo = {
    synced: { icon: Check, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', label: 'Sincronizado' },
    pendiente: { icon: Clock, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Pendiente de sincronización' },
    conflicto: { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', label: 'Conflicto de sincronización' },
  }
  const Estado = estadoInfo[inmueble.estado_sync]
  const EstadoIcon = Estado.icon

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/mapa')}
            className="p-2 hover:bg-background-lighter rounded-lg transition text-text-charcoal"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold text-text-main">{inmueble.codigo_catastral}</h1>
              <span
                className="px-2.5 py-0.5 rounded-full flex items-center gap-1 text-xs font-medium text-white capitalize shadow-sm"
                style={{ backgroundColor: color }}
              >
                <Icon icon={iconName} className="w-3.5 h-3.5" /> {inmueble.tipo_inmueble}
              </span>
            </div>
            <p className="text-sm text-institutional-slate mt-0.5">{inmueble.direccion}</p>
          </div>
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <button
            onClick={handleDownloadPlano}
            disabled={downloadingPlano}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-institutional-gold hover:bg-[#7a6a57] text-white px-3 md:px-4 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 shadow-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4" /> {downloadingPlano ? 'Generando...' : 'Plano Topográfico'}
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-institutional-navy hover:bg-[#152c6b] text-white px-3 md:px-4 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 shadow-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4" /> {downloading ? 'Generando...' : 'Cédula Catastral'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        {/* Left Column */}
        <div className="md:col-span-12 lg:col-span-6 space-y-4 md:space-y-6">
          {/* Map */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-institutional-navy" />
              <h2 className="text-sm font-semibold text-text-charcoal">Ubicación Geográfica</h2>
            </div>
            <MapaFicha inmueble={inmueble} />
          </div>

          {/* Galería de Fotos */}
          {inmueble.fotos && inmueble.fotos.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon icon="mdi:camera" className="w-4 h-4 text-institutional-navy" />
                <h2 className="text-sm font-semibold text-text-charcoal">Galería Fotográfica</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {inmueble.fotos.map((foto, i) => (
                  <a key={i} href={foto.url} target="_blank" rel="noreferrer" className="block aspect-square rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition">
                    <img src={foto.url} alt={`Foto ${i+1}`} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Construcciones */}
          {inmueble.construcciones && inmueble.construcciones.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-institutional-navy" />
                <h2 className="text-sm font-semibold text-text-charcoal">Construcciones ({inmueble.construcciones.length})</h2>
              </div>
              <div className="space-y-3">
                {inmueble.construcciones.map((cons, i) => (
                  <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border border-gray-100 bg-background-light gap-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-md shadow-sm border border-gray-200 text-institutional-navy">
                        <Icon icon={tipoIconos[cons.tipo_construccion] ?? 'mdi:home'} className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-main capitalize">{cons.tipo_construccion}</p>
                        <p className="text-[10px] text-institutional-slate uppercase">
                          Estado {cons.estado_construccion.replace('_', ' ')} • {cons.material_predominante ?? 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 md:gap-4 md:text-right text-left text-xs">
                      <div>
                        <p className="text-[10px] text-institutional-slate">Área</p>
                        <p className="font-semibold text-text-main">{cons.area_construida_m2} m²</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-institutional-slate">Niveles</p>
                        <p className="font-semibold text-text-main">{cons.niveles}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-institutional-slate">Año</p>
                        <p className="font-semibold text-text-main">{cons.anio_construccion ?? '—'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="md:col-span-12 lg:col-span-6 space-y-4">
          {/* Datos del predio */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-institutional-navy" />
              <h2 className="text-sm font-semibold text-text-charcoal">Datos del Predio</h2>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-institutional-slate" />
                <div>
                  <dt className="text-xs text-institutional-slate">Código Catastral</dt>
                  <dd className="text-sm font-medium text-text-main">{inmueble.codigo_catastral}</dd>
                </div>
              </div>
              <div>
                <dt className="text-xs text-institutional-slate">Tipo</dt>
                <dd className="text-sm font-medium flex items-center gap-1 text-text-main capitalize"><Icon icon={iconName} className="w-4 h-4 text-institutional-slate" /> {inmueble.tipo_inmueble}</dd>
              </div>
              <div>
                <dt className="text-xs text-institutional-slate">Barrio</dt>
                <dd className="text-sm font-medium text-text-main">{inmueble.barrio ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-institutional-slate">Zona</dt>
                <dd className="text-sm font-medium text-text-main">{inmueble.zona ?? '—'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-institutional-slate">Dirección</dt>
                <dd className="text-sm font-medium text-text-main">{inmueble.direccion}</dd>
              </div>
            </dl>
          </div>

          {/* Superficies */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Ruler className="w-4 h-4 text-institutional-navy" />
              <h2 className="text-sm font-semibold text-text-charcoal">Superficie y Perímetro</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <div className="bg-background-light border border-gray-100 rounded-lg p-2 md:p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-institutional-navy mb-1">
                  <Building2 className="w-3 md:w-3.5 h-3 md:h-3.5" />
                  <span className="text-[10px] md:text-xs font-medium">Declarada</span>
                </div>
                <p className="text-base md:text-lg font-bold text-text-main">{inmueble.superficie_m2 ?? '—'}</p>
                <p className="text-[10px] md:text-xs text-institutional-slate">m²</p>
              </div>
              <div className="bg-background-light border border-gray-100 rounded-lg p-2 md:p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-institutional-slate mb-1">
                  <Ruler className="w-3 md:w-3.5 h-3 md:h-3.5" />
                  <span className="text-[10px] md:text-xs font-medium">GIS</span>
                </div>
                <p className="text-base md:text-lg font-bold text-text-main">{inmueble.superficie_gis_m2?.toFixed(2) ?? '—'}</p>
                <p className="text-[10px] md:text-xs text-institutional-slate">m²</p>
              </div>
              <div className="bg-background-light border border-gray-100 rounded-lg p-2 md:p-3 text-center">
                <div className="flex items-center justify-center gap-1.5 text-institutional-gold mb-1">
                  <Ruler className="w-3 md:w-3.5 h-3 md:h-3.5" />
                  <span className="text-[10px] md:text-xs font-medium">Perímetro</span>
                </div>
                <p className="text-base md:text-lg font-bold text-text-main">{inmueble.perimetro_gis_m?.toFixed(2) ?? '—'}</p>
                <p className="text-[10px] md:text-xs text-institutional-slate">m</p>
              </div>
            </div>
            {/* Diferencia */}
            {inmueble.superficie_m2 && inmueble.superficie_gis_m2 && (
              <div className="mt-3 flex flex-wrap items-center gap-1 md:gap-2 text-[10px] md:text-xs">
                <span className="text-institutional-slate">Diferencia declarada vs GIS:</span>
                <span className={`font-semibold ${Math.abs(inmueble.superficie_m2 - inmueble.superficie_gis_m2) < 5 ? 'text-green-700' : 'text-orange-700'}`}>
                  {Math.abs(inmueble.superficie_m2 - inmueble.superficie_gis_m2).toFixed(2)} m²
                  ({((Math.abs(inmueble.superficie_m2 - inmueble.superficie_gis_m2) / inmueble.superficie_m2) * 100).toFixed(1)}%)
                </span>
              </div>
            )}
          </div>

          {/* Linderos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Compass className="w-4 h-4 text-institutional-navy" />
              <h2 className="text-sm font-semibold text-text-charcoal">Linderos</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background-light border border-gray-100 rounded-lg p-3">
                <dt className="text-xs text-institutional-slate flex items-center gap-1">Norte ↑</dt>
                <dd className="text-xs text-text-main mt-1 font-mono">{inmueble.norte ?? '—'}</dd>
              </div>
              <div className="bg-background-light border border-gray-100 rounded-lg p-3">
                <dt className="text-xs text-institutional-slate flex items-center gap-1">Sur ↓</dt>
                <dd className="text-xs text-text-main mt-1 font-mono">{inmueble.sur ?? '—'}</dd>
              </div>
              <div className="bg-background-light border border-gray-100 rounded-lg p-3">
                <dt className="text-xs text-institutional-slate flex items-center gap-1">Este →</dt>
                <dd className="text-xs text-text-main mt-1 font-mono">{inmueble.este ?? '—'}</dd>
              </div>
              <div className="bg-background-light border border-gray-100 rounded-lg p-3">
                <dt className="text-xs text-institutional-slate flex items-center gap-1">Oeste ←</dt>
                <dd className="text-xs text-text-main mt-1 font-mono">{inmueble.oeste ?? '—'}</dd>
              </div>
            </div>
          </div>

          {/* Propietarios Actuales */}
          {inmueble.propietarios && inmueble.propietarios.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-institutional-navy" />
                <h2 className="text-sm font-semibold text-text-charcoal">Copropietarios Actuales</h2>
              </div>
              <div className="space-y-3">
                {inmueble.propietarios.map((prop, i) => (
                  <div key={i} className="bg-background-light border border-gray-100 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-bold text-text-main">{prop.nombre} {prop.apellido}</p>
                      <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                        {prop.porcentaje_propiedad}% - {prop.tipo_tenencia.replace('_', ' ')}
                      </span>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div><dt className="text-[10px] text-institutional-slate">Cédula</dt><dd className="text-xs text-text-main">{prop.cedula}</dd></div>
                      <div><dt className="text-[10px] text-institutional-slate">Teléfono</dt><dd className="text-xs text-text-main">{prop.telefono ?? '—'}</dd></div>
                    </dl>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tradición Legal (Historial) */}
          {inmueble.historial && inmueble.historial.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-institutional-navy" />
                <h2 className="text-sm font-semibold text-text-charcoal">Tradición Legal (Historial)</h2>
              </div>
              <div className="relative border-l-2 border-gray-200 ml-3 space-y-4">
                {inmueble.historial.map((hist, i) => (
                  <div key={i} className="pl-4 relative">
                    <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${hist.fecha_fin ? 'bg-gray-300' : 'bg-green-500'}`} />
                    <p className="text-xs font-bold text-text-charcoal">
                      {hist.propietario?.nombre} {hist.propietario?.apellido}
                    </p>
                    <p className="text-[10px] text-institutional-slate mt-0.5">
                      Desde: {new Date(hist.fecha_inicio).toLocaleDateString()} {hist.fecha_fin ? `— Hasta: ${new Date(hist.fecha_fin).toLocaleDateString()}` : '— (Actual)'}
                    </p>
                    {hist.documento_soporte && (
                      <a href={hist.documento_soporte} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline mt-1 inline-block">Ver Escritura/Documento</a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estado */}
          <div className={`rounded-xl border p-4 flex items-center gap-3 ${Estado.bg} ${Estado.border}`}>
            <EstadoIcon className={`w-5 h-5 flex-shrink-0 ${Estado.color}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${Estado.color}`}>{Estado.label}</p>
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 mt-1">
                {inmueble.created_at && (
                  <p className="text-[10px] md:text-xs text-institutional-slate flex items-center gap-1 truncate">
                    <Calendar className="w-3 h-3 flex-shrink-0" /> Creado: {new Date(inmueble.created_at).toLocaleDateString('es-EC')}
                  </p>
                )}
                {inmueble.updated_at && (
                  <p className="text-[10px] md:text-xs text-institutional-slate flex items-center gap-1 truncate">
                    <Calendar className="w-3 h-3 flex-shrink-0" /> Actualizado: {new Date(inmueble.updated_at).toLocaleDateString('es-EC')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}