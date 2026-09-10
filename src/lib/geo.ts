export function centroide(geom: GeoJSON.Polygon): [number, number] {
  const anillo = geom.coordinates[0]
  let lat = 0, lon = 0
  anillo.forEach(([lo, la]) => { lat += la; lon += lo })
  const n = anillo.length
  return [lat / n, lon / n]
}

/** Aproximación rápida en m² — SOLO para preview mientras se dibuja */
export function superficieM2Preview(geom: GeoJSON.Polygon): number {
  const anillo = geom.coordinates[0]
  if (anillo.length < 4) return 0
  const latRef = anillo[0][1]
  const kx = 111320 * Math.cos((latRef * Math.PI) / 180)
  const ky = 110574
  let area = 0
  for (let i = 0; i < anillo.length - 1; i++) {
    const [x1, y1] = anillo[i]
    const [x2, y2] = anillo[i + 1]
    area += x1 * kx * y2 * ky - x2 * kx * y1 * ky
  }
  return Math.abs(area / 2)
}

export function perimetroMPreview(geom: GeoJSON.Polygon): number {
  const anillo = geom.coordinates[0]
  if (anillo.length < 2) return 0
  const latRef = anillo[0][1]
  const kx = 111320 * Math.cos((latRef * Math.PI) / 180)
  const ky = 110574
  let per = 0
  for (let i = 0; i < anillo.length - 1; i++) {
    const dx = (anillo[i + 1][0] - anillo[i][0]) * kx
    const dy = (anillo[i + 1][1] - anillo[i][1]) * ky
    per += Math.hypot(dx, dy)
  }
  return per
}

export function polygonToWKT(geom: GeoJSON.Polygon): string {
  const coords = geom.coordinates[0].map(([lo, la]) => `${lo} ${la}`).join(', ')
  return `POLYGON((${coords}))`
}

/** Formatea coordenadas a grados decimales con 6 decimales */
export function formatCoord(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(6)}° ${ns}, ${Math.abs(lon).toFixed(6)}° ${ew}`
}

/** Convierte grados decimales a formato DMS (grados, minutos, segundos) */
export function toDMS(decimal: number): string {
  const abs = Math.abs(decimal)
  const d = Math.floor(abs)
  const mFloat = (abs - d) * 60
  const m = Math.floor(mFloat)
  const s = ((mFloat - m) * 60).toFixed(2)
  return `${d}°${m}'${s}"`
}

export function formatDMS(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${toDMS(lat)} ${ns}, ${toDMS(lon)} ${ew}`
}

/** Obtiene los vértices del polígono con sus coordenadas */
export function getVertices(geom: GeoJSON.Polygon): { lat: number; lon: number; index: number }[] {
  const anillo = geom.coordinates[0]
  return anillo.slice(0, -1).map(([lo, la], index) => ({ lat: la, lon: lo, index }))
}

/** Calcula automáticamente los linderos (N/S/E/O) basándose en los vértices del polígono */
export function calcularLinderos(geom: GeoJSON.Polygon): { norte: string; sur: string; este: string; oeste: string } {
  const vertices = getVertices(geom)
  if (vertices.length < 3) {
    return { norte: '', sur: '', este: '', oeste: '' }
  }

  // Encontrar los vértices extremos
  let norteV = vertices[0], surV = vertices[0], esteV = vertices[0], oesteV = vertices[0]
  for (const v of vertices) {
    if (v.lat > norteV.lat) norteV = v
    if (v.lat < surV.lat) surV = v
    if (v.lon > esteV.lon) esteV = v
    if (v.lon < oesteV.lon) oesteV = v
  }

  return {
    norte: `Vértice ${norteV.index + 1} (${formatDMS(norteV.lat, norteV.lon)})`,
    sur: `Vértice ${surV.index + 1} (${formatDMS(surV.lat, surV.lon)})`,
    este: `Vértice ${esteV.index + 1} (${formatDMS(esteV.lat, esteV.lon)})`,
    oeste: `Vértice ${oesteV.index + 1} (${formatDMS(oesteV.lat, oesteV.lon)})`,
  }
}

/** Distancia en metros entre dos puntos GPS */
export function distanciaM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Azimut (rumbo) en grados entre dos puntos GPS */
export function azimut(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

/** Convierte azimut en grados a dirección cardinal */
export function azimutToCardinal(az: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
  const idx = Math.round(az / 45) % 8
  return dirs[idx]
}

/** Genera un resumen de los vértices con distancia y azimut entre ellos */
export function resumenVertices(geom: GeoJSON.Polygon): { index: number; lat: number; lon: number; distancia: number; azimut: number; cardinal: string }[] {
  const vertices = getVertices(geom)
  if (vertices.length < 2) return []
  const resumen = vertices.map((v, i) => {
    const next = vertices[(i + 1) % vertices.length]
    const dist = distanciaM(v.lat, v.lon, next.lat, next.lon)
    const az = azimut(v.lat, v.lon, next.lat, next.lon)
    return {
      index: v.index,
      lat: v.lat,
      lon: v.lon,
      distancia: dist,
      azimut: az,
      cardinal: azimutToCardinal(az),
    }
  })
  return resumen
}

/**
 * Convierte coordenadas WGS84 (lat/lon) a UTM (Este, Norte).
 * Simplificación válida para la zona UTM 19N (Táchira, Venezuela).
 */
export function toUTM(lat: number, lon: number): { easting: number; northing: number; zone: number } {
  const zone = Math.floor((lon + 180) / 6) + 1
  const lonOrigin = (zone - 1) * 6 - 180 + 3 // central meridian

  const latRad = (lat * Math.PI) / 180
  const lonRad = (lon * Math.PI) / 180
  const lonOriginRad = (lonOrigin * Math.PI) / 180

  const a = 6378137.0 // WGS84 semi-major
  const eccSquared = 0.00669438

  const eccPrimeSquared = eccSquared / (1 - eccSquared)
  const N = a / Math.sqrt(1 - eccSquared * Math.sin(latRad) ** 2)
  const T = Math.tan(latRad) ** 2
  const C = eccPrimeSquared * Math.cos(latRad) ** 2
  const A = Math.cos(latRad) * (lonRad - lonOriginRad)

  const M =
    a *
    ((1 - eccSquared / 4 - (3 * eccSquared ** 2) / 64 - (5 * eccSquared ** 3) / 256) * latRad -
      ((3 * eccSquared) / 8 + (3 * eccSquared ** 2) / 32 + (45 * eccSquared ** 3) / 1024) * Math.sin(2 * latRad) +
      ((15 * eccSquared ** 2) / 256 + (45 * eccSquared ** 3) / 1024) * Math.sin(4 * latRad) -
      ((35 * eccSquared ** 3) / 3072) * Math.sin(6 * latRad))

  const k0 = 0.9996

  let easting =
    k0 *
      N *
      (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T ** 2 + 72 * C - 58 * eccPrimeSquared) * A ** 5) / 120) +
    500000.0

  let northing =
    k0 *
    (M +
      N *
        Math.tan(latRad) *
        ((A ** 2) / 2 + ((5 - T + 9 * C + 4 * C ** 2) * A ** 4) / 24 + ((61 - 58 * T + T ** 2 + 600 * C - 330 * eccPrimeSquared) * A ** 6) / 720))

  if (lat < 0) northing += 10000000.0

  return { easting: Math.round(easting * 100) / 100, northing: Math.round(northing * 100) / 100, zone }
}

/**
 * Convierte un azimut (0-360) a formato topográfico de rumbo.
 * Ejemplo: 37.03° → "N37°02'E"
 */
export function toRumboTopografico(az: number): string {
  let prefix: string
  let suffix: string
  let angle: number

  if (az >= 0 && az < 90) {
    prefix = 'N'; suffix = 'E'; angle = az
  } else if (az >= 90 && az < 180) {
    prefix = 'S'; suffix = 'E'; angle = 180 - az
  } else if (az >= 180 && az < 270) {
    prefix = 'S'; suffix = 'O'; angle = az - 180
  } else {
    prefix = 'N'; suffix = 'O'; angle = 360 - az
  }

  const d = Math.floor(angle)
  const mFloat = (angle - d) * 60
  const m = Math.floor(mFloat)

  return `${prefix}${d}°${m.toString().padStart(2, '0')}'${suffix}`
}
