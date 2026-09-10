import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'
import { MapContainer, TileLayer, useMap, LayersControl } from 'react-leaflet'
import { superficieM2Preview, perimetroMPreview, getVertices, formatCoord, resumenVertices } from '@/lib/geo'

interface Props {
  onPolygon: (geom: GeoJSON.Polygon) => void
  initialGeom?: GeoJSON.Polygon | null
  center?: [number, number]
  userPosition?: [number, number] | null
}

function createUserIcon(): L.DivIcon {
  return L.divIcon({
    className: 'user-marker',
    html: `
      <div style="position: relative;">
        <div style="
          width: 18px; height: 18px; background: #2563eb;
          border: 3px solid white; border-radius: 50%;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.3), 0 2px 6px rgba(0,0,0,0.3);
        "></div>
        <div style="
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 50px; height: 50px;
          border: 2px solid rgba(37, 99, 235, 0.4); border-radius: 50%;
          animation: pulse 2s ease-out infinite;
        "></div>
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

function DrawControl({
  onPolygon,
  initialGeom,
  userPosition,
}: {
  onPolygon: (geom: GeoJSON.Polygon) => void
  initialGeom?: GeoJSON.Polygon | null
  userPosition?: [number, number] | null
}) {
  const map = useMap()
  const drawnRef = useRef<L.LayerGroup | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const [info, setInfo] = useState<{ area: number; perimetro: number; vertices: number } | null>(null)
  const [vertices, setVertices] = useState<{ lat: number; lon: number; index: number }[]>([])
  const [resumen, setResumen] = useState<{ index: number; distancia: number; azimut: number; cardinal: string }[]>([])

  useEffect(() => {
    drawnRef.current = L.layerGroup().addTo(map)

    if (initialGeom && initialGeom.coordinates.length > 0 && drawnRef.current) {
      const layer = L.geoJSON(initialGeom as GeoJSON.Geometry, {
        style: { color: '#2563eb', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.2 },
      })
      drawnRef.current.addLayer(layer)
      const area = superficieM2Preview(initialGeom)
      const per = perimetroMPreview(initialGeom)
      const verts = getVertices(initialGeom)
      setInfo({ area, perimetro: per, vertices: verts.length })
      setVertices(verts)
      setResumen(resumenVertices(initialGeom))
    }

    map.on(L.Draw.Event.CREATED, (e: L.LeafletEvent) => {
      const layer = (e as unknown as { layer: L.Layer }).layer
      drawnRef.current?.clearLayers()
      drawnRef.current?.addLayer(layer)
      const geojson = (layer as L.Polygon).toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>
      const geom = geojson.geometry
      onPolygon(geom)
      const area = superficieM2Preview(geom)
      const per = perimetroMPreview(geom)
      const verts = getVertices(geom)
      setInfo({ area, perimetro: per, vertices: verts.length })
      setVertices(verts)
      setResumen(resumenVertices(geom))
    })

    return () => {
      map.off(L.Draw.Event.CREATED)
      drawnRef.current?.remove()
    }
  }, [map, onPolygon, initialGeom])

  // User marker
  useEffect(() => {
    if (userMarkerRef.current) {
      userMarkerRef.current.remove()
      userMarkerRef.current = null
    }
    if (userPosition) {
      const icon = createUserIcon()
      const marker = L.marker(userPosition, { icon, zIndexOffset: 1000 }).addTo(map)
      marker.bindPopup(`<div style="font-family: system-ui;"><p style="font-weight: 600; margin: 0;">📍 Mi ubicación</p><p style="font-size: 12px; color: #6b7280; margin: 4px 0 0;">${formatCoord(userPosition[0], userPosition[1])}</p></div>`)
      userMarkerRef.current = marker
    }
  }, [userPosition, map])

  const startDraw = () => {
    drawnRef.current?.clearLayers()
    setInfo(null)
    setVertices([])
    setResumen([])
    // @ts-expect-error leaflet-draw runtime
    new L.Draw.Polygon(map, {
      shapeOptions: { color: '#2563eb', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.2 },
    }).enable()
  }

  const clearAll = () => {
    drawnRef.current?.clearLayers()
    setInfo(null)
    setVertices([])
    setResumen([])
    onPolygon({ type: 'Polygon', coordinates: [] } as GeoJSON.Polygon)
  }

  const flyToUser = () => {
    if (userPosition) {
      map.setView(userPosition, 18, { animate: true })
    }
  }

  return (
    <>
      {/* Floating controls */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        <button
          onClick={startDraw}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          Dibujar polígono
        </button>
        <button
          onClick={clearAll}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition"
        >
          Limpiar
        </button>
        {userPosition && (
          <button
            onClick={flyToUser}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Ir a mi ubicación
          </button>
        )}
      </div>

      {/* Info panel */}
      {info && info.vertices > 0 && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur rounded-lg shadow-lg px-4 py-3 text-sm max-w-md">
          <div className="flex items-center gap-4 mb-2">
            <div>
              <p className="text-xs text-gray-500">Superficie</p>
              <p className="font-bold text-gray-900">{info.area.toFixed(2)} m²</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Perímetro</p>
              <p className="font-bold text-gray-900">{info.perimetro.toFixed(2)} m</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Vértices</p>
              <p className="font-bold text-gray-900">{info.vertices}</p>
            </div>
          </div>
          {vertices.length > 0 && (
            <div className="border-t border-gray-100 pt-2 mt-1 max-h-32 overflow-y-auto">
              <p className="text-xs font-semibold text-gray-600 mb-1">Coordenadas de vértices:</p>
              {vertices.map((v) => (
                <p key={v.index} className="text-xs text-gray-500 font-mono">
                  V{v.index + 1}: {formatCoord(v.lat, v.lon)}
                </p>
              ))}
              {resumen.length > 0 && (
                <div className="mt-2 border-t border-gray-100 pt-2">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Linderos (distancia / rumbo):</p>
                  {resumen.map((r) => (
                    <p key={r.index} className="text-xs text-gray-500 font-mono">
                      V{r.index + 1} → V{r.index + 2 > vertices.length ? 1 : r.index + 2}: {r.distancia.toFixed(1)} m — {r.azimut.toFixed(0)}° ({r.cardinal})
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default function DibujarPoligono({ onPolygon, initialGeom, center = [-0.1807, -78.4678], userPosition }: Props) {
  return (
    <div className="relative h-full w-full">
      <MapContainer center={center} zoom={15} className="h-full w-full rounded-xl z-0" style={{ minHeight: '350px' }}>
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
        <DrawControl onPolygon={onPolygon} initialGeom={initialGeom} userPosition={userPosition} />
      </MapContainer>
    </div>
  )
}
