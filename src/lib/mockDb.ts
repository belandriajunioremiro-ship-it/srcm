import Dexie, { Table } from 'dexie'
import type { Inmueble, Propietario } from '@/types'

export class CatastroDB extends Dexie {
  inmuebles!: Table<Inmueble, string>
  propietarios!: Table<Propietario, string>

  constructor() {
    super('catastro_municipal_torbes')
    this.version(1).stores({
      inmuebles: 'id, codigo_catastral, propietario_id, estado_sync, tipo_inmueble, zona, barrio',
      propietarios: 'id, cedula',
    })
  }
}

export const db = new CatastroDB()

export async function initDbWithSeed(): Promise<void> {
  const count = await db.inmuebles.count()
  if (count > 0) return
  await db.transaction('rw', db.inmuebles, db.propietarios, async () => {
    for (const p of propietariosSeed) await db.propietarios.put(p)
    for (const i of inmueblesSeed) await db.inmuebles.put(i)
  })
}

// ── Seed data (simula datos provenientes del servidor) ──────────────────────

const propietariosSeed: Propietario[] = [
  { id: 'p1', cedula: '1101234567', nombre: 'Carlos', apellido: 'Mendoza', telefono: '099112233', email: 'carlos@mail.com', direccion: 'Av. Amazonas 123' },
  { id: 'p2', cedula: '1107654321', nombre: 'María', apellido: 'Vargas', telefono: '098887766', email: 'maria@mail.com', direccion: 'Calle Boyacá 45' },
  { id: 'p3', cedula: '0902345678', nombre: 'Jorge', apellido: 'Quiroga', telefono: '099334455', email: 'jorge@mail.com', direccion: 'Av. 6 de Diciembre N34' },
  { id: 'p4', cedula: '1105554444', nombre: 'Ana', apellido: 'Salazar', telefono: '097778899', email: 'ana@mail.com', direccion: 'Calle 10 de Agosto 890' },
  { id: 'p5', cedula: '1712345678', nombre: 'Luis', apellido: 'Tapia', telefono: '096554433', email: 'luis@mail.com', direccion: 'Av. Mariscal Sucre 12' },
]

// Centro: San Josecito, Torbes, Táchira (Lon: -72.2216, Lat: 7.6591)
function makePolygon(cx: number, cy: number, sizeDeg: number): GeoJSON.Polygon {
  const s = sizeDeg
  return {
    type: 'Polygon',
    coordinates: [[
      [cx, cy],
      [cx + s, cy],
      [cx + s, cy + s],
      [cx, cy + s],
      [cx, cy],
    ]],
  }
}

const inmueblesSeed: Inmueble[] = [
  {
    id: 'i1', codigo_catastral: 'TORBES-001', direccion: 'Calle Principal Sector 1', barrio: 'San Josecito', zona: 'Centro',
    tipo_inmueble: 'comercial', superficie_m2: 320, superficie_gis_m2: 318.5, perimetro_gis_m: 71.4,
    norte: 'Calle Principal', sur: 'Vereda 2', este: 'Calle 3', oeste: 'Carrera 4',
    geom: makePolygon(-72.2216, 7.6591, 0.0015), propietario_id: 'p1', estado_sync: 'synced',
    created_at: '2024-01-15T10:00:00Z', updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'i2', codigo_catastral: 'TORBES-002', direccion: 'Vereda 14 Sector C', barrio: 'San Josecito', zona: 'Norte',
    tipo_inmueble: 'residencial', superficie_m2: 180, superficie_gis_m2: 179.2, perimetro_gis_m: 53.6,
    norte: 'Vereda 14', sur: 'Vereda 15', este: 'Calle Central', oeste: 'Carrera 8',
    geom: makePolygon(-72.2230, 7.6620, 0.0012), propietario_id: 'p2', estado_sync: 'synced',
    created_at: '2024-02-20T14:30:00Z', updated_at: '2024-02-20T14:30:00Z',
  },
  {
    id: 'i3', codigo_catastral: 'TORBES-003', direccion: 'Carrera 2 Barrio Walter Márquez', barrio: 'Walter Márquez', zona: 'Sur',
    tipo_inmueble: 'residencial', superficie_m2: 240, superficie_gis_m2: 241.1, perimetro_gis_m: 62.0,
    norte: 'Carrera 2', sur: 'Carrera 3', este: 'Vía Principal', oeste: 'Terreno Baldío',
    geom: makePolygon(-72.2190, 7.6550, 0.0014), propietario_id: 'p3', estado_sync: 'synced',
    created_at: '2024-03-10T09:15:00Z', updated_at: '2024-03-10T09:15:00Z',
  },
  {
    id: 'i4', codigo_catastral: 'TORBES-004', direccion: 'Avenida Principal El Corozo', barrio: 'El Corozo', zona: 'Oeste',
    tipo_inmueble: 'mixto', superficie_m2: 450, superficie_gis_m2: 448.7, perimetro_gis_m: 84.7,
    norte: 'Av. Principal', sur: 'Calle Secundaria', este: 'Carrera 1', oeste: 'Carrera 2',
    geom: makePolygon(-72.2300, 7.6580, 0.0020), propietario_id: 'p4', estado_sync: 'synced',
    created_at: '2024-04-05T11:00:00Z', updated_at: '2024-04-05T11:00:00Z',
  },
  {
    id: 'i5', codigo_catastral: 'TORBES-005', direccion: 'Vía a la Troncal 5', barrio: 'Zona Industrial', zona: 'Norte',
    tipo_inmueble: 'industrial', superficie_m2: 1200, superficie_gis_m2: 1198.4, perimetro_gis_m: 138.0,
    norte: 'Troncal 5', sur: 'Camino Real', este: 'Galpón 1', oeste: 'Galpón 2',
    geom: makePolygon(-72.2150, 7.6650, 0.0035), propietario_id: 'p5', estado_sync: 'synced',
    created_at: '2024-05-01T08:00:00Z', updated_at: '2024-05-01T08:00:00Z',
  },
  {
    id: 'i6', codigo_catastral: 'TORBES-006', direccion: 'Calle 4 Sector 2', barrio: 'San Josecito', zona: 'Centro',
    tipo_inmueble: 'residencial', superficie_m2: 160, superficie_gis_m2: 161.3, perimetro_gis_m: 50.8,
    norte: 'Calle 4', sur: 'Vereda 5', este: 'Carrera Principal', oeste: 'Casa 4B',
    geom: makePolygon(-72.2205, 7.6600, 0.0011), propietario_id: 'p1', estado_sync: 'synced',
    created_at: '2024-06-12T15:45:00Z', updated_at: '2024-06-12T15:45:00Z',
  },
  {
    id: 'i7', codigo_catastral: 'TORBES-007', direccion: 'Frente a la Plaza Bolívar', barrio: 'Centro', zona: 'Centro',
    tipo_inmueble: 'comercial', superficie_m2: 280, superficie_gis_m2: 279.5, perimetro_gis_m: 66.9,
    norte: 'Plaza Bolívar', sur: 'Calle Sucre', este: 'Carrera 5', oeste: 'Carrera 6',
    geom: makePolygon(-72.2220, 7.6595, 0.0013), propietario_id: 'p2', estado_sync: 'synced',
    created_at: '2024-07-08T13:20:00Z', updated_at: '2024-07-08T13:20:00Z',
  },
  {
    id: 'i8', codigo_catastral: 'TORBES-008', direccion: 'Finca La Esperanza', barrio: 'Zona Rural', zona: 'Sur',
    tipo_inmueble: 'rural', superficie_m2: 5000, superficie_gis_m2: 4998.2, perimetro_gis_m: 282.8,
    norte: 'Vía Finca San Juan', sur: 'Río Torbes', este: 'Finca Los Pinos', oeste: 'Camino Vecinal',
    geom: makePolygon(-72.2250, 7.6500, 0.0050), propietario_id: 'p3', estado_sync: 'synced',
    created_at: '2024-08-03T10:30:00Z', updated_at: '2024-08-03T10:30:00Z',
  },
]
