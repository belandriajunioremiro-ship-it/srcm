import { useEffect, useRef } from 'react'
import { renderToString } from 'react-dom/server'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, GeoJSON as LeafletGeoJSON, useMap, LayersControl } from 'react-leaflet'
import { Icon } from '@iconify/react'
import { Home, Store, Factory, Leaf, Building } from 'lucide-react'
import type { Inmueble } from '@/types'
import { centroide, formatCoord, formatDMS, getVertices, resumenVertices } from '@/lib/geo'

interface Props {
  inmueble: Inmueble
}

const tipoColores: Record<string, string> = {
  residencial: '#1E3A8A', // Institutional navy
  comercial: '#8C7B68',   // Institutional gold
  industrial: '#475569',  // Institutional slate
  rural: '#166534',       // Dark green
  mixto: '#7c3aed',       // Serious purple
}

const tipoIconos: Record<string, string> = {
  residencial: 'mdi:home',
  comercial: 'mdi:store',
  industrial: 'mdi:factory',
  rural: 'mdi:sprout',
  mixto: 'mdi:city',
}

function getTipoIconNode(tipo: string) {
  switch (tipo) {
    case 'residencial': return <Home size={18} />
    case 'comercial': return <Store size={18} />
    case 'industrial': return <Factory size={18} />
    case 'rural': return <Leaf size={18} />
    case 'mixto': return <Building size={18} />
    default: return <Home size={18} />
  }
}

function FitToPolygon({ inmueble }: { inmueble: Inmueble }) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    const coords = inmueble.geom.coordinates[0]
    const bounds = L.latLngBounds(coords.map(([lo, la]) => [la, lo] as [number, number]))
    map.fitBounds(bounds, { padding: [50, 50] })
    done.current = true
  }, [inmueble, map])
  return null
}

function CenterIconMarker({ inmueble, lat, lon }: { inmueble: Inmueble; lat: number; lon: number }) {
  const map = useMap()
  
  useEffect(() => {
    const color = tipoColores[inmueble.tipo_inmueble] ?? '#1E3A8A'
    const iconHtml = renderToString(getTipoIconNode(inmueble.tipo_inmueble))
    
    const icon = L.divIcon({
      className: 'center-property-marker',
      html: `
        <div style="
          width: 36px; height: 36px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        ">
          ${iconHtml}
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    })
    
    const marker = L.marker([lat, lon], { icon, interactive: false }).addTo(map)
    return () => { marker.remove() }
  }, [inmueble, lat, lon, map])
  
  return null
}

function VertexMarkers({ inmueble }: { inmueble: Inmueble }) {
  const map = useMap()
  const markersRef = useRef<L.Marker[]>([])

  useEffect(() => {
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const vertices = getVertices(inmueble.geom)
    vertices.forEach((v) => {
      const icon = L.divIcon({
        className: 'vertex-marker',
        html: `
          <div style="
            width: 24px; height: 24px;
            background: white;
            border: 2px solid #2563eb;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 10px; font-weight: bold; color: #1e3a8a;
            box-shadow: 0 2px 4px rgba(0,0,0,0.4);
          ">${v.index + 1}</div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })
      const marker = L.marker([v.lat, v.lon], { icon }).addTo(map)
      marker.bindTooltip(`V${v.index + 1}: ${formatDMS(v.lat, v.lon)}`, { direction: 'top', offset: [0, -10] })
      markersRef.current.push(marker)
    })

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
    }
  }, [inmueble, map])

  return null
}

export default function MapaFicha({ inmueble }: Props) {
  const [lat, lon] = centroide(inmueble.geom)
  const color = tipoColores[inmueble.tipo_inmueble] ?? '#1E3A8A'
  const iconName = tipoIconos[inmueble.tipo_inmueble] ?? 'mdi:map-marker'
  const vertices = getVertices(inmueble.geom)
  const resumen = resumenVertices(inmueble.geom)

  return (
    <div>
      <div className="h-[350px] rounded-lg overflow-hidden relative shadow-sm border border-gray-200">
        <MapContainer
          center={[lat, lon]}
          zoom={16}
          className="h-full w-full z-0"
          style={{ minHeight: '350px' }}
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Satélite (Esri)">
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='&copy; Esri'
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Mapa (OpenStreetMap)">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
            </LayersControl.BaseLayer>
          </LayersControl>
          <LeafletGeoJSON
            data={{ type: 'Feature', geometry: inmueble.geom, properties: {} }}
            style={{
              color: '#3b82f6',
              weight: 4,
              fillColor: color,
              fillOpacity: 0.3,
            }}
          />
          <FitToPolygon inmueble={inmueble} />
          <CenterIconMarker inmueble={inmueble} lat={lat} lon={lon} />
          <VertexMarkers inmueble={inmueble} />
        </MapContainer>
      </div>

      {/* Coordinate info */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="bg-background-light border border-gray-100 rounded-lg p-3">
          <p className="text-xs font-semibold text-institutional-slate mb-1">Centroide del Predio</p>
          <p className="text-xs font-mono text-text-main">{formatCoord(lat, lon)}</p>
          <p className="text-xs font-mono text-institutional-slate mt-0.5">{formatDMS(lat, lon)}</p>
        </div>
        <div className="bg-background-light border border-gray-100 rounded-lg p-3">
          <p className="text-xs font-semibold text-institutional-slate mb-1">Tipo de Inmueble</p>
          <p className="text-sm flex items-center gap-1 text-text-main"><Icon icon={iconName} className="w-4 h-4 text-institutional-slate" /> <span className="capitalize">{inmueble.tipo_inmueble}</span></p>
        </div>
      </div>

      {/* Vertices table */}
      {vertices.length > 0 && (
        <div className="mt-3 bg-background-light border border-gray-100 rounded-lg p-3">
          <p className="text-xs font-semibold text-institutional-slate mb-2">Vértices y Linderos del Polígono</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 px-2 font-medium text-institutional-slate">Vértice</th>
                  <th className="text-left py-1.5 px-2 font-medium text-institutional-slate">Coordenadas (DMS)</th>
                  <th className="text-right py-1.5 px-2 font-medium text-institutional-slate">Distancia</th>
                  <th className="text-right py-1.5 px-2 font-medium text-institutional-slate">Rumbo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vertices.map((v) => {
                  const r = resumen[v.index]
                  return (
                    <tr key={v.index} className="hover:bg-white transition-colors">
                      <td className="py-1.5 px-2 font-semibold text-text-charcoal">V{v.index + 1}</td>
                      <td className="py-1.5 px-2 font-mono text-institutional-slate">{formatDMS(v.lat, v.lon)}</td>
                      <td className="py-1.5 px-2 text-right text-institutional-slate">{r ? `${r.distancia.toFixed(1)} m` : '—'}</td>
                      <td className="py-1.5 px-2 text-right text-institutional-slate">{r ? `${r.azimut.toFixed(0)}° ${r.cardinal}` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
