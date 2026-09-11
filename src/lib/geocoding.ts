/**
 * Nominatim (OpenStreetMap) — Geocodificación inversa y consulta de calles adyacentes
 * 
 * Gratis, sin API key. Límite de cortesía: 1 req/seg.
 * https://nominatim.org/release-docs/develop/api/Reverse/
 */

export interface DatosUbicacion {
  calle: string
  barrio: string
  zona: string
  parroquia: string
  municipio: string
  estado: string
  displayName: string
}

/**
 * Geocodificación inversa: coordenadas → dirección legible
 */
export async function reverseGeocode(lat: number, lon: number): Promise<DatosUbicacion | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=es`
    
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SRCM-CatastroMunicipal/1.0' }
    })
    
    if (!res.ok) return null
    
    const data = await res.json()
    const addr = data.address || {}
    
    return {
      calle: addr.road || addr.pedestrian || addr.path || '',
      barrio: addr.suburb || addr.neighbourhood || addr.hamlet || addr.village || '',
      zona: addr.city_district || addr.quarter || addr.town || '',
      parroquia: addr.municipality || addr.county || '',
      municipio: addr.city || addr.town || addr.village || '',
      estado: addr.state || '',
      displayName: data.display_name || '',
    }
  } catch (err) {
    console.warn('[Nominatim] Error en geocodificación inversa:', err)
    return null
  }
}

/**
 * Calles adyacentes: consulta Overpass API para obtener nombres de vías
 * cercanas al bounding box del polígono.
 */
export async function getCallesAdyacentes(
  minLat: number, minLon: number, maxLat: number, maxLon: number
): Promise<string[]> {
  try {
    // Expandir un poco el bbox para capturar calles cercanas (aprox 50m)
    const expand = 0.0005 // ~55 metros
    const south = minLat - expand
    const west = minLon - expand
    const north = maxLat + expand
    const east = maxLon + expand
    
    const query = `
      [out:json][timeout:10];
      (
        way["highway"]["name"](${south},${west},${north},${east});
      );
      out tags;
    `
    
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    
    if (!res.ok) return []
    
    const data = await res.json()
    const calles: string[] = []
    const seen = new Set<string>()
    
    for (const el of (data.elements || [])) {
      const name = el.tags?.name
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase())
        calles.push(name)
      }
    }
    
    return calles
  } catch (err) {
    console.warn('[Overpass] Error al buscar calles adyacentes:', err)
    return []
  }
}

/**
 * Calcula el bounding box de un polígono GeoJSON
 */
export function getBBox(geom: GeoJSON.Polygon): { minLat: number; minLon: number; maxLat: number; maxLon: number } {
  const coords = geom.coordinates[0]
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity
  
  for (const [lon, lat] of coords) {
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
    if (lon < minLon) minLon = lon
    if (lon > maxLon) maxLon = lon
  }
  
  return { minLat, minLon, maxLat, maxLon }
}
