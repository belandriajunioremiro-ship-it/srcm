import { Document, Page, Text, View, StyleSheet, Svg, Polygon, Circle, Line, G, Rect, Path, Image } from '@react-pdf/renderer'
import type { Inmueble } from '@/types'
import { getVertices, resumenVertices, toUTM, toRumboTopografico, toDMS, centroide } from '@/lib/geo'

// ─── Contorno REAL del Municipio Torbes (OpenStreetMap, simplificado a 62 pts) ───
const TORBES_BOUNDARY: [number, number][] = [
  [-72.248,7.6919],[-72.2443,7.6848],[-72.238,7.6773],[-72.23,7.6685],
  [-72.2264,7.6607],[-72.2272,7.6484],[-72.2332,7.6354],[-72.2251,7.6314],
  [-72.2155,7.6306],[-72.2102,7.6292],[-72.2037,7.6306],[-72.1968,7.6249],
  [-72.1783,7.6213],[-72.1643,7.6146],[-72.1618,7.6177],[-72.1612,7.6233],
  [-72.1588,7.6247],[-72.1567,7.625],[-72.1539,7.626],[-72.1516,7.627],
  [-72.1514,7.6293],[-72.1482,7.6308],[-72.1457,7.6314],[-72.1422,7.6332],
  [-72.1397,7.6331],[-72.1368,7.6325],[-72.1345,7.6316],[-72.1283,7.6315],
  [-72.1255,7.631],[-72.1217,7.6319],[-72.118,7.6329],[-72.1135,7.6325],
  [-72.1104,7.6298],[-72.0907,7.6334],[-72.0783,7.6389],[-72.0709,7.6492],
  [-72.0738,7.663],[-72.0815,7.6773],[-72.0766,7.6898],[-72.098,7.6854],
  [-72.1163,7.6795],[-72.12,7.6774],[-72.1232,7.675],[-72.1244,7.6723],
  [-72.1251,7.6687],[-72.1261,7.6666],[-72.1348,7.6708],[-72.1385,7.6762],
  [-72.1374,7.6831],[-72.1377,7.6888],[-72.1427,7.6884],[-72.1479,7.6842],
  [-72.2147,7.6939],[-72.2312,7.7039],[-72.2335,7.7034],[-72.2368,7.7041],
  [-72.2389,7.7052],[-72.2409,7.7046],[-72.2424,7.705],[-72.245,7.7052],
  [-72.2474,7.7018],[-72.248,7.6921],
]

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
  vtxTable: { position: 'absolute', top: 8, left: 8 },
  vtxRow: { flexDirection: 'row', borderBottom: '0.5pt solid #888' },
  vtxH: { fontSize: 5, fontWeight: 'bold', width: 40, paddingVertical: 1.5, paddingHorizontal: 2, borderRight: '0.5pt solid #888', textAlign: 'center', backgroundColor: '#f5f5f5' },
  vtxC: { fontSize: 4.5, width: 40, paddingVertical: 1.5, paddingHorizontal: 2, borderRight: '0.5pt solid #888', textAlign: 'right' },
  geoTable: { position: 'absolute', bottom: 8, left: 8, right: 8 },
  geoRow: { flexDirection: 'row', borderBottom: '0.5pt solid #aaa' },
  geoH: { fontSize: 4.5, fontWeight: 'bold', paddingVertical: 1, paddingHorizontal: 2, backgroundColor: '#eee', borderRight: '0.5pt solid #aaa', textAlign: 'center' },
  geoC: { fontSize: 4.5, paddingVertical: 1, paddingHorizontal: 2, borderRight: '0.5pt solid #aaa', textAlign: 'center' },
})

interface Props {
  inmueble: Inmueble
  vecinos?: Inmueble[]
}

function projectGeomToSvg(geom: GeoJSON.Polygon, svgW: number, svgH: number) {
  const coords = geom.coordinates[0]
  const lons = coords.map(c => c[0])
  const lats = coords.map(c => c[1])
  const minLon = Math.min(...lons), maxLon = Math.max(...lons)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const lonR = (maxLon - minLon) || 0.001
  const latR = (maxLat - minLat) || 0.001
  const pad = 0.45
  const pMinLon = minLon - lonR * pad, pMaxLon = maxLon + lonR * pad
  const pMinLat = minLat - latR * pad, pMaxLat = maxLat + latR * pad
  const pLonR = pMaxLon - pMinLon, pLatR = pMaxLat - pMinLat
  const scale = Math.min(svgW / pLonR, svgH / pLatR)
  const offX = (svgW - pLonR * scale) / 2
  const offY = (svgH - pLatR * scale) / 2
  const project = (lon: number, lat: number) => ({
    x: offX + (lon - pMinLon) * scale,
    y: offY + (pMaxLat - lat) * scale,
  })
  return { projectedPoints: coords.map(c => project(c[0], c[1])), project }
}

// Project Torbes boundary to SVG coords (independent, fills the background)
function projectTorbesBoundary(svgW: number, svgH: number): string {
  const lons = TORBES_BOUNDARY.map(c => c[0])
  const lats = TORBES_BOUNDARY.map(c => c[1])
  const minLon = Math.min(...lons), maxLon = Math.max(...lons)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const lonR = maxLon - minLon, latR = maxLat - minLat
  const pad = 0.08
  const pMinLon = minLon - lonR * pad, pMaxLon = maxLon + lonR * pad
  const pMinLat = minLat - latR * pad, pMaxLat = maxLat + latR * pad
  const pLonR = pMaxLon - pMinLon, pLatR = pMaxLat - pMinLat
  const scale = Math.min(svgW / pLonR, svgH / pLatR)
  const offX = (svgW - pLonR * scale) / 2
  const offY = (svgH - pLatR * scale) / 2
  return TORBES_BOUNDARY.map(([lon, lat]) => {
    const x = offX + (lon - pMinLon) * scale
    const y = offY + (pMaxLat - lat) * scale
    return `${x},${y}`
  }).join(' ')
}

// Locate the main parcel's position on the Torbes watermark
function projectParcelDotOnTorbes(lat: number, lon: number, svgW: number, svgH: number): { x: number; y: number } {
  const lons = TORBES_BOUNDARY.map(c => c[0])
  const lats = TORBES_BOUNDARY.map(c => c[1])
  const minLon = Math.min(...lons), maxLon = Math.max(...lons)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const lonR = maxLon - minLon, latR = maxLat - minLat
  const pad = 0.08
  const pMinLon = minLon - lonR * pad, pMaxLon = maxLon + lonR * pad
  const pMinLat = minLat - latR * pad, pMaxLat = maxLat + latR * pad
  const pLonR = pMaxLon - pMinLon, pLatR = pMaxLat - pMinLat
  const scale = Math.min(svgW / pLonR, svgH / pLatR)
  const offX = (svgW - pLonR * scale) / 2
  const offY = (svgH - pLatR * scale) / 2
  return {
    x: offX + (lon - pMinLon) * scale,
    y: offY + (pMaxLat - lat) * scale,
  }
}

export default function PlanoCartograficoPDF({ inmueble }: Props) {
  const dateStr = new Date().toLocaleDateString('es-VE')
  const svgW = 450, svgH = 350

  const { projectedPoints, project } = projectGeomToSvg(inmueble.geom, svgW, svgH)
  const polyStr = projectedPoints.map(p => `${p.x},${p.y}`).join(' ')
  const vertices = getVertices(inmueble.geom)
  const resumen = resumenVertices(inmueble.geom)
  const utmVertices = vertices.map(v => ({ ...v, utm: toUTM(v.lat, v.lon) }))
  const area = inmueble.superficie_gis_m2 ?? inmueble.superficie_m2 ?? 0

  const [cLat, cLon] = centroide(inmueble.geom)
  const centerPt = project(cLon, cLat)

  const colindantes = [
    inmueble.norte ?? '',
    inmueble.este ?? '',
    inmueble.sur ?? '',
    inmueble.oeste ?? '',
  ]

  const edges: { midX: number; midY: number; angle: number; dist: string; rumbo: string; colindante: string; p1: {x:number;y:number}; p2: {x:number;y:number} }[] = []
  for (let i = 0; i < vertices.length; i++) {
    const p1 = project(vertices[i].lon, vertices[i].lat)
    const next = vertices[(i + 1) % vertices.length]
    const p2 = project(next.lon, next.lat)
    const r = resumen[i]
    const dx = p2.x - p1.x, dy = p2.y - p1.y
    let angle = Math.atan2(dy, dx) * (180 / Math.PI)
    if (angle > 90 || angle < -90) angle += 180
    edges.push({
      p1, p2,
      midX: (p1.x + p2.x) / 2, midY: (p1.y + p2.y) / 2,
      angle,
      dist: r.distancia.toFixed(2),
      rumbo: toRumboTopografico(r.azimut),
      colindante: colindantes[i % colindantes.length],
    })
  }

  // Torbes watermark — LARGE, fills the entire drawing background
  const torbesPolyStr = projectTorbesBoundary(svgW, svgH)
  const parcelDot = projectParcelDotOnTorbes(cLat, cLon, svgW, svgH)

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.outerBorder}>

          {/* ═══ LEFT: DRAWING AREA ═══ */}
          <View style={s.drawArea}>

            {/* Vertex Table (top-left) */}
            <View style={s.vtxTable}>
              <View style={{ border: '0.5pt solid #888' }}>
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

            {/* Main SVG Canvas */}
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 55, paddingBottom: 55 }}>
              <Svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>

                {/* ═══ TORBES WATERMARK (large background) ═══ */}
                <Polygon points={torbesPolyStr} fill="#f8f8f8" stroke="#e0e0e0" strokeWidth={0.6} />
                <Text x={svgW / 2} y={svgH / 2 + 60} fontSize={6} textAnchor="middle" fill="#e0e0e0">MUNICIPIO TORBES — SAN JOSECITO, EDO. TÁCHIRA</Text>
                {/* Red dot showing parcel location on municipality */}
                <Circle cx={parcelDot.x} cy={parcelDot.y} r={4} fill="#ef4444" stroke="#fff" strokeWidth={1} opacity={0.5} />

                {/* Main Polygon (ON TOP of watermark) */}
                <Polygon points={polyStr} fill="none" stroke="#000" strokeWidth={1.5} />

                {/* Hash marks on edges */}
                {edges.map((e, i) => {
                  const dx = e.p2.x - e.p1.x, dy = e.p2.y - e.p1.y
                  const len = Math.sqrt(dx * dx + dy * dy)
                  if (len < 10) return null
                  const nx = -dy / len * 4, ny = dx / len * 4
                  const marks = []
                  const numMarks = Math.min(Math.floor(len / 20), 8)
                  for (let m = 1; m <= numMarks; m++) {
                    const t = m / (numMarks + 1)
                    const mx = e.p1.x + dx * t, my = e.p1.y + dy * t
                    marks.push(<Line key={`hm-${i}-${m}`} x1={mx - nx} y1={my - ny} x2={mx + nx} y2={my + ny} stroke="#000" strokeWidth={0.5} />)
                  }
                  return <G key={`marks-${i}`}>{marks}</G>
                })}

                {/* Distance labels */}
                {edges.map((e, i) => (
                  <G key={`dist-${i}`} transform={`translate(${e.midX}, ${e.midY}) rotate(${e.angle})`}>
                    <Text x={0} y={-5} fontSize={6} textAnchor="middle" fill="#000">{e.dist} m</Text>
                  </G>
                ))}

                {/* Colindante names (offset outward) */}
                {edges.map((e, i) => {
                  if (!e.colindante) return null
                  const dx = e.p2.x - e.p1.x, dy = e.p2.y - e.p1.y
                  const len = Math.sqrt(dx * dx + dy * dy)
                  const nx = -dy / len * 18, ny = dx / len * 18
                  return (
                    <G key={`col-${i}`} transform={`translate(${e.midX + nx}, ${e.midY + ny}) rotate(${e.angle})`}>
                      <Text x={0} y={0} fontSize={6.5} textAnchor="middle" fill="#000" fontWeight="bold">
                        {e.colindante.toUpperCase()}
                      </Text>
                    </G>
                  )
                })}

                {/* Vertex circles with labels */}
                {vertices.map((v, i) => {
                  const pt = project(v.lon, v.lat)
                  return (
                    <G key={`v-${i}`}>
                      <Circle cx={pt.x} cy={pt.y} r={2.5} fill="#fff" stroke="#000" strokeWidth={1} />
                      <Text x={pt.x + 5} y={pt.y - 5} fontSize={5.5} fill="#000" fontWeight="bold">E-{i + 1}</Text>
                    </G>
                  )
                })}

                {/* Center label */}
                <Text x={centerPt.x} y={centerPt.y - 8} fontSize={8} textAnchor="middle" fill="#000" fontWeight="bold">
                  {inmueble.tipo_inmueble.toUpperCase()}
                </Text>
                <Text x={centerPt.x} y={centerPt.y + 2} fontSize={7} textAnchor="middle" fill="#000">
                  {area.toFixed(2)} m²
                </Text>
                <Text x={centerPt.x} y={centerPt.y + 12} fontSize={5} textAnchor="middle" fill="#555">
                  {inmueble.codigo_catastral}
                </Text>

                {/* Compass Rose (top-right) */}
                <G transform={`translate(${svgW - 35}, 35)`}>
                  <Circle cx={0} cy={0} r={16} fill="none" stroke="#000" strokeWidth={0.7} />
                  <Circle cx={0} cy={0} r={13} fill="none" stroke="#000" strokeWidth={0.3} />
                  <Line x1={0} y1={-16} x2={0} y2={16} stroke="#000" strokeWidth={0.4} />
                  <Line x1={-16} y1={0} x2={16} y2={0} stroke="#000" strokeWidth={0.4} />
                  <Line x1={-11} y1={-11} x2={11} y2={11} stroke="#000" strokeWidth={0.2} />
                  <Line x1={11} y1={-11} x2={-11} y2={11} stroke="#000" strokeWidth={0.2} />
                  <Path d="M0,-13 L-2.5,-4 L0,-6 L2.5,-4 Z" fill="#000" />
                  <Text x={0} y={-19} fontSize={7} textAnchor="middle" fontWeight="bold">N</Text>
                  <Text x={0} y={24} fontSize={5} textAnchor="middle">S</Text>
                  <Text x={22} y={2} fontSize={5} textAnchor="middle">E</Text>
                  <Text x={-22} y={2} fontSize={5} textAnchor="middle">W</Text>
                </G>

                {/* Graphic Scale */}
                <G transform={`translate(30, ${svgH - 18})`}>
                  <Text x={30} y={-6} fontSize={5} textAnchor="middle">ESCALA GRÁFICA</Text>
                  <Rect x={0} y={0} width={20} height={3} fill="#000" stroke="#000" strokeWidth={0.5} />
                  <Rect x={20} y={0} width={20} height={3} fill="#fff" stroke="#000" strokeWidth={0.5} />
                  <Rect x={40} y={0} width={20} height={3} fill="#000" stroke="#000" strokeWidth={0.5} />
                  <Text x={0} y={9} fontSize={4} textAnchor="middle">0</Text>
                  <Text x={20} y={9} fontSize={4} textAnchor="middle">10</Text>
                  <Text x={40} y={9} fontSize={4} textAnchor="middle">20</Text>
                  <Text x={60} y={9} fontSize={4} textAnchor="middle">30 m</Text>
                </G>
              </Svg>
            </View>

            {/* Geo Reference Table (bottom) */}
            <View style={s.geoTable}>
              <View style={{ border: '0.5pt solid #aaa', marginTop: 4 }}>
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

          {/* ═══ RIGHT: CAJETÍN ═══ */}
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
