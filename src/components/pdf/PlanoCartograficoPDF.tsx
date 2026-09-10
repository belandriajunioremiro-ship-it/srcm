import { Document, Page, Text, View, StyleSheet, Svg, Polygon, Circle, Line, G, Rect, Path, Image } from '@react-pdf/renderer'
import type { Inmueble } from '@/types'
import { getVertices, resumenVertices, toUTM, toRumboTopografico, toDMS, centroide } from '@/lib/geo'

const s = StyleSheet.create({
  page: { padding: 15, backgroundColor: '#fff', fontFamily: 'Helvetica' },
  outerBorder: { border: '2pt solid #000', flex: 1, flexDirection: 'row' },
  drawArea: { flex: 1, borderRight: '2pt solid #000', position: 'relative' },
  cajetin: { width: 220, flexDirection: 'column' },
  cRow: { borderBottom: '1pt solid #000', padding: 5 },
  cRowSplit: { borderBottom: '1pt solid #000', flexDirection: 'row' },
  cLabel: { fontSize: 6, color: '#555', marginBottom: 1 },
  cVal: { fontSize: 8, fontWeight: 'bold' },
  cValSm: { fontSize: 7 },
  vtxTable: { position: 'absolute', top: 8, left: 8, zIndex: 10 },
  vtxRow: { flexDirection: 'row', borderBottom: '0.5pt solid #888' },
  vtxH: { fontSize: 5, fontWeight: 'bold', width: 40, paddingVertical: 1.5, paddingHorizontal: 2, borderRight: '0.5pt solid #888', textAlign: 'center', backgroundColor: '#f5f5f5' },
  vtxC: { fontSize: 4.5, width: 40, paddingVertical: 1.5, paddingHorizontal: 2, borderRight: '0.5pt solid #888', textAlign: 'right' },
  geoTable: { position: 'absolute', bottom: 8, left: 8, right: 8, zIndex: 10 },
  geoRow: { flexDirection: 'row', borderBottom: '0.5pt solid #aaa' },
  geoH: { fontSize: 4.5, fontWeight: 'bold', paddingVertical: 1, paddingHorizontal: 2, backgroundColor: '#eee', borderRight: '0.5pt solid #aaa', textAlign: 'center' },
  geoC: { fontSize: 4.5, paddingVertical: 1, paddingHorizontal: 2, borderRight: '0.5pt solid #aaa', textAlign: 'center' },
})

interface Props {
  inmueble: Inmueble
  vecinos?: Inmueble[]
}

// Proyección unificada que incluye al predio y a sus vecinos para dar contexto
function projectAllToSvg(mainGeom: GeoJSON.Polygon, vecinos: Inmueble[] | undefined, svgW: number, svgH: number) {
  const allCoords = [...mainGeom.coordinates[0]]
  vecinos?.forEach(v => {
    if (v.geom) allCoords.push(...v.geom.coordinates[0])
  })

  const lons = allCoords.map(c => c[0])
  const lats = allCoords.map(c => c[1])
  const minLon = Math.min(...lons), maxLon = Math.max(...lons)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  
  const lonR = (maxLon - minLon) || 0.001
  const latR = (maxLat - minLat) || 0.001
  const pad = 0.15 // 15% de padding para que no quede pegado al borde
  
  const pMinLon = minLon - lonR * pad
  const pMaxLon = maxLon + lonR * pad
  const pMinLat = minLat - latR * pad
  const pMaxLat = maxLat + latR * pad
  const pLonR = pMaxLon - pMinLon
  const pLatR = pMaxLat - pMinLat
  
  const scale = Math.min(svgW / pLonR, svgH / pLatR)
  const offX = (svgW - pLonR * scale) / 2
  const offY = (svgH - pLatR * scale) / 2
  
  const project = (lon: number, lat: number) => ({
    x: offX + (lon - pMinLon) * scale,
    y: offY + (pMaxLat - lat) * scale,
  })
  
  return { project, bounds: { minLon: pMinLon, maxLon: pMaxLon, minLat: pMinLat, maxLat: pMaxLat, scale } }
}

export default function PlanoCartograficoPDF({ inmueble, vecinos = [] }: Props) {
  const dateStr = new Date().toLocaleDateString('es-VE')
  const svgW = 450, svgH = 350

  const { project, bounds } = projectAllToSvg(inmueble.geom, vecinos, svgW, svgH)
  
  const mainPolyStr = inmueble.geom.coordinates[0].map(c => {
    const p = project(c[0], c[1])
    return `${p.x},${p.y}`
  }).join(' ')

  const vertices = getVertices(inmueble.geom)
  const resumen = resumenVertices(inmueble.geom)
  const utmVertices = vertices.map(v => ({ ...v, utm: toUTM(v.lat, v.lon) }))
  const area = inmueble.superficie_gis_m2 ?? inmueble.superficie_m2 ?? 0
  const [cLat, cLon] = centroide(inmueble.geom)
  const centerPt = project(cLon, cLat)

  const colindantes = [inmueble.norte ?? '', inmueble.este ?? '', inmueble.sur ?? '', inmueble.oeste ?? '']
  const edges: any[] = []
  for (let i = 0; i < vertices.length; i++) {
    const p1 = project(vertices[i].lon, vertices[i].lat)
    const next = vertices[(i + 1) % vertices.length]
    const p2 = project(next.lon, next.lat)
    const r = resumen[i]
    const dx = p2.x - p1.x, dy = p2.y - p1.y
    let angle = Math.atan2(dy, dx) * (180 / Math.PI)
    if (angle > 90 || angle < -90) angle += 180
    edges.push({
      p1, p2, midX: (p1.x + p2.x) / 2, midY: (p1.y + p2.y) / 2,
      angle, dist: r.distancia.toFixed(2), rumbo: toRumboTopografico(r.azimut),
      colindante: colindantes[i % colindantes.length],
    })
  }

  // Generar Cuadrícula (Grid) estilo CAD - Muy suave y limpia
  const gridLines = []
  const gridStep = 20 // Cuadrícula más grande y limpia
  for (let x = 0; x <= svgW; x += gridStep) {
    gridLines.push(<Line key={`gx-${x}`} x1={x} y1={0} x2={x} y2={svgH} stroke="#f5f5f5" strokeWidth={0.5} />)
  }
  for (let y = 0; y <= svgH; y += gridStep) {
    gridLines.push(<Line key={`gy-${y}`} x1={0} y1={y} x2={svgW} y2={y} stroke="#f5f5f5" strokeWidth={0.5} />)
  }

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.outerBorder}>

          {/* ÁREA DE DIBUJO */}
          <View style={s.drawArea}>
            
            {/* Tabla de Vértices */}
            <View style={s.vtxTable}>
              <View style={{ border: '0.5pt solid #888', backgroundColor: 'white' }}>
                <View style={s.vtxRow}>
                  <Text style={s.vtxH}>EST.</Text>
                  <Text style={s.vtxH}>RUMBO</Text>
                  <Text style={s.vtxH}>DIST.</Text>
                  <Text style={s.vtxH}>X (Este)</Text>
                  <Text style={[s.vtxH, { borderRight: 'none' }]}>Y (Norte)</Text>
                </View>
                {utmVertices.map((v, i) => {
                  const r = resumen[i]
                  return (
                    <View style={s.vtxRow} key={i}>
                      <Text style={s.vtxC}>E-{i + 1}</Text>
                      <Text style={s.vtxC}>{toRumboTopografico(r.azimut)}</Text>
                      <Text style={s.vtxC}>{r.distancia.toFixed(2)} m</Text>
                      <Text style={s.vtxC}>{v.utm.easting.toFixed(2)}</Text>
                      <Text style={[s.vtxC, { borderRight: 'none' }]}>{v.utm.northing.toFixed(2)}</Text>
                    </View>
                  )
                })}
              </View>
            </View>

            {/* Lienzo SVG Principal */}
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 10 }}>
              <Svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ border: '1pt solid #ddd', backgroundColor: '#ffffff' }}>
                
                {/* 1. Cuadrícula de fondo suave */}
                {gridLines}

                {/* 2. VECINOS (Contexto de manzanas) en gris claro con línea punteada */}
                {vecinos.map((vecino, i) => {
                  if (!vecino.geom) return null
                  const vStr = vecino.geom.coordinates[0].map(c => {
                    const p = project(c[0], c[1])
                    return `${p.x},${p.y}`
                  }).join(' ')
                  return <Polygon key={`vec-${i}`} points={vStr} fill="#f9f9f9" stroke="#cccccc" strokeWidth={0.8} strokeDasharray="2,2" />
                })}

                {/* 3. Polígono Principal - SIN RELLENO NARANJA, borde negro grueso */}
                <Polygon points={mainPolyStr} fill="rgba(30, 58, 138, 0.03)" stroke="#1A1A1A" strokeWidth={2} />

                {/* 4. Etiquetas de distancias (con fondo blanco para no chocar con el grid) */}
                {edges.map((e, i) => (
                  <G key={`dist-${i}`} transform={`translate(${e.midX}, ${e.midY}) rotate(${e.angle})`}>
                    <Rect x={-18} y={-6} width={36} height={9} fill="white" />
                    <Text x={0} y={1} fontSize={6} textAnchor="middle" fill="#1A1A1A" fontWeight="bold">{e.dist} m</Text>
                  </G>
                ))}

                {/* 5. Colindantes (Nombres de calles/vecinos) */}
                {edges.map((e, i) => {
                  if (!e.colindante) return null
                  const dx = e.p2.x - e.p1.x, dy = e.p2.y - e.p1.y
                  const len = Math.sqrt(dx * dx + dy * dy)
                  const nx = -dy / len * 18, ny = dx / len * 18
                  return (
                    <G key={`col-${i}`} transform={`translate(${e.midX + nx}, ${e.midY + ny}) rotate(${e.angle})`}>
                      <Text x={0} y={0} fontSize={6.5} textAnchor="middle" fill="#333333" fontWeight="bold">
                        {e.colindante.toUpperCase()}
                      </Text>
                    </G>
                  )
                })}

                {/* 6. Vértices tipo CAD (Cruces negras) */}
                {vertices.map((v, i) => {
                  const pt = project(v.lon, v.lat)
                  return (
                    <G key={`v-${i}`}>
                      <Line x1={pt.x - 4} y1={pt.y} x2={pt.x + 4} y2={pt.y} stroke="#1A1A1A" strokeWidth={1} />
                      <Line x1={pt.x} y1={pt.y - 4} x2={pt.x} y2={pt.y + 4} stroke="#1A1A1A" strokeWidth={1} />
                      <Circle cx={pt.x} cy={pt.y} r={1.5} fill="#1A1A1A" />
                      <Text x={pt.x + 6} y={pt.y - 6} fontSize={6} fill="#1A1A1A" fontWeight="bold">E-{i + 1}</Text>
                    </G>
                  )
                })}

                {/* 7. Texto Central (Azul Institucional) */}
                <Text x={centerPt.x} y={centerPt.y - 10} fontSize={9} textAnchor="middle" fill="#1E3A8A" fontWeight="bold">
                  {inmueble.tipo_inmueble.toUpperCase()}
                </Text>
                <Text x={centerPt.x} y={centerPt.y + 2} fontSize={8} textAnchor="middle" fill="#1A1A1A">
                  {area.toFixed(2)} m²
                </Text>
                <Text x={centerPt.x} y={centerPt.y + 14} fontSize={6} textAnchor="middle" fill="#555555">
                  {inmueble.codigo_catastral}
                </Text>

                {/* 8. Rosa de los Vientos Limpia */}
                <G transform={`translate(${svgW - 40}, 40)`}>
                  <Circle cx={0} cy={0} r={18} fill="white" stroke="#1A1A1A" strokeWidth={1} />
                  <Path d="M0,-15 L-3,-5 L0,-7 L3,-5 Z" fill="#1A1A1A" />
                  <Text x={0} y={-21} fontSize={8} textAnchor="middle" fill="#1A1A1A" fontWeight="bold">N</Text>
                </G>
              </Svg>
            </View>

            {/* Tabla Geo Referencial */}
            <View style={s.geoTable}>
              <View style={{ border: '0.5pt solid #aaa', marginTop: 4, backgroundColor: 'white' }}>
                <View style={s.geoRow}>
                  <Text style={[s.geoH, { width: '20%' }]}>PUNTO</Text>
                  <Text style={[s.geoH, { width: '25%' }]}>LATITUD</Text>
                  <Text style={[s.geoH, { width: '25%' }]}>LONGITUD</Text>
                  <Text style={[s.geoH, { width: '15%' }]}>ZONA UTM</Text>
                  <Text style={[s.geoH, { width: '15%', borderRight: 'none' }]}>DATUM</Text>
                </View>
                {utmVertices.slice(0, 6).map((v, i) => (
                  <View style={s.geoRow} key={i}>
                    <Text style={[s.geoC, { width: '20%' }]}>E-{i + 1}</Text>
                    <Text style={[s.geoC, { width: '25%' }]}>N{toDMS(v.lat)}</Text>
                    <Text style={[s.geoC, { width: '25%' }]}>W{toDMS(Math.abs(v.lon))}</Text>
                    <Text style={[s.geoC, { width: '15%' }]}>{v.utm.zone}N</Text>
                    <Text style={[s.geoC, { width: '15%', borderRight: 'none' }]}>WGS84</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* CAJETÍN */}
          <View style={s.cajetin}>
            <View style={[s.cRow, { alignItems: 'center', paddingVertical: 7, borderBottom: '2pt solid #000' }]}>
              <Image src="/assets/logos/logo.png" style={{ width: 35, height: 35, marginBottom: 3 }} />
              <Text style={{ fontSize: 8.5, fontWeight: 'bold', textAlign: 'center' }}>REPÚBLICA BOLIVARIANA DE VENEZUELA</Text>
              <Text style={{ fontSize: 6.5, textAlign: 'center', marginTop: 1 }}>ESTADO TÁCHIRA</Text>
              <Text style={{ fontSize: 6.5, textAlign: 'center' }}>ALCALDÍA DEL MUNICIPIO TORBES</Text>
              <Text style={{ fontSize: 6.5, textAlign: 'center', fontWeight: 'bold', marginTop: 2 }}>DIRECCIÓN DE CATASTRO MUNICIPAL</Text>
              <Text style={{ fontSize: 5, textAlign: 'center', marginTop: 2, color: '#888' }}>SRCM — Sistema de Registro Catastral Municipal</Text>
            </View>

            <View style={[s.cRow, { alignItems: 'center' }]}>
              <Text style={{ fontSize: 9, fontWeight: 'bold', textAlign: 'center' }}>PLANO INDIVIDUAL</Text>
            </View>
            <View style={s.cRow}>
              <Text style={s.cLabel}>OPERACIÓN:</Text>
              <Text style={s.cVal}>DESLINDE</Text>
            </View>
            <View style={s.cRow}>
              <Text style={s.cLabel}>DESIGNACIÓN CATASTRAL:</Text>
              <Text style={s.cVal}>{inmueble.codigo_catastral}</Text>
            </View>
            <View style={s.cRow}>
              <Text style={s.cLabel}>ESTADO:</Text>
              <Text style={s.cValSm}>TÁCHIRA</Text>
            </View>
            <View style={s.cRow}>
              <Text style={s.cLabel}>MUNICIPIO:</Text>
              <Text style={s.cValSm}>TORBES</Text>
            </View>
            <View style={s.cRow}>
              <Text style={s.cLabel}>SECTOR / BARRIO:</Text>
              <Text style={s.cValSm}>{inmueble.barrio ?? '—'}</Text>
            </View>
            <View style={s.cRow}>
              <Text style={s.cLabel}>ZONA:</Text>
              <Text style={s.cValSm}>{inmueble.zona ?? '—'}</Text>
            </View>
            <View style={s.cRow}>
              <Text style={s.cLabel}>REFERENCIAS DE UBICACIÓN:</Text>
              <Text style={{ fontSize: 5.5 }}>{inmueble.direccion}</Text>
            </View>

            <View style={s.cRowSplit}>
              <View style={{ flex: 1, borderRight: '1pt solid #000', padding: 5 }}>
                <Text style={s.cLabel}>SUPERFICIE PARCELA</Text>
                <Text style={s.cVal}>{area.toFixed(2)} M²</Text>
              </View>
              <View style={{ flex: 1, padding: 5 }}>
                <Text style={s.cLabel}>ESCALA</Text>
                <Text style={s.cVal}>1:200</Text>
              </View>
            </View>

            <View style={s.cRow}>
              <Text style={s.cLabel}>PROPIETARIO(S):</Text>
              {inmueble.propietarios && inmueble.propietarios.length > 0 ? (
                inmueble.propietarios.map((p: any, i: number) => (
                  <View key={i} style={{ marginBottom: 2, marginTop: 1 }}>
                    <Text style={s.cVal}>{`${p.nombre} ${p.apellido}`}</Text>
                    <Text style={{ fontSize: 5.5 }}>C.I: {p.cedula} - {p.porcentaje_propiedad || 100}%</Text>
                  </View>
                ))
              ) : (
                <View style={{ marginTop: 1 }}>
                  <Text style={s.cVal}>{inmueble.propietario ? `${inmueble.propietario.nombre} ${inmueble.propietario.apellido}` : 'NO REGISTRADO'}</Text>
                  <Text style={{ fontSize: 5.5 }}>C.I: {inmueble.propietario?.cedula ?? 'N/A'}</Text>
                </View>
              )}
            </View>
            <View style={s.cRow}>
              <Text style={s.cLabel}>USO DEL INMUEBLE:</Text>
              <Text style={[s.cVal, { textTransform: 'uppercase' }]}>{inmueble.tipo_inmueble}</Text>
            </View>

            <View style={[s.cRow, { flex: 1 }]}>
              <Text style={s.cLabel}>OBSERVACIONES:</Text>
              <Text style={{ fontSize: 5, marginTop: 2, lineHeight: 1.4 }}>
                Levantamiento parcelario realizado con equipo de posicionamiento satelital, por el método de levantamiento en tiempo real (RTK). Coordenadas referidas al sistema geodésico WGS84, proyección UTM Zona {utmVertices[0]?.utm.zone ?? 19}N.
              </Text>
            </View>

            <View style={s.cRowSplit}>
              <View style={{ flex: 2, borderRight: '1pt solid #000', padding: 5 }}>
                <Text style={s.cLabel}>FECHA</Text>
                <Text style={s.cValSm}>{dateStr}</Text>
              </View>
              <View style={{ flex: 1, padding: 5, alignItems: 'center' }}>
                <Text style={s.cLabel}>Nº LÁMINA</Text>
                <View style={{ flexDirection: 'row', marginTop: 2 }}>
                  <View style={{ border: '1pt solid #000', width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 7, fontWeight: 'bold' }}>1</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={{ padding: 6, alignItems: 'center', borderTop: '1pt solid #000' }}>
              <Text style={{ fontSize: 5, color: '#555', marginBottom: 2 }}>AGRIM. / ING. MUNICIPAL</Text>
              <View style={{ width: 100, borderBottom: '1pt solid #000', height: 18, marginBottom: 2 }} />
              <Text style={{ fontSize: 5, fontWeight: 'bold' }}>FECHA Y FIRMA DEL DIRECTOR</Text>
              <Text style={{ fontSize: 4.5, color: '#555', marginTop: 1 }}>DIRECCIÓN DE CATASTRO MUNICIPAL</Text>
            </View>
          </View>

        </View>
      </Page>
    </Document>
  )
}