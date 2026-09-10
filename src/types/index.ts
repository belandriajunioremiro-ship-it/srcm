export type TipoInmueble = 'residencial' | 'comercial' | 'industrial' | 'rural' | 'mixto'
export type EstadoSync = 'pendiente' | 'synced' | 'conflicto'

export interface Propietario {
  id: string
  cedula: string
  nombre: string
  apellido: string
  telefono?: string
  email?: string
  direccion?: string
  created_at?: string
}

export interface Copropietario extends Propietario {
  porcentaje_propiedad: number
  tipo_tenencia: string
  fecha_inicio: string
}

export interface Inmueble {
  id: string
  codigo_catastral: string
  direccion: string
  barrio?: string
  zona?: string
  tipo_inmueble: TipoInmueble
  superficie_m2?: number
  superficie_gis_m2?: number
  perimetro_gis_m?: number
  norte?: string
  sur?: string
  este?: string
  oeste?: string
  geom: GeoJSON.Polygon
  propietarios?: Copropietario[] // Replace propietario_id and propietario
  propietario?: Propietario // Keep for backwards compatibility with PDF during refactor, will be first copropietario
  registrado_por?: string
  estado_sync: EstadoSync
  created_at?: string
  updated_at?: string
}

export interface FotoInmueble {
  id: string
  inmueble_id: string
  url: string
  descripcion?: string
  created_at?: string
}

export interface InmueblePendiente {
  local_id: string
  base_updated_at?: string
  ficha: Omit<Inmueble, 'id' | 'estado_sync' | 'geom' | 'superficie_gis_m2' | 'perimetro_gis_m' | 'propietario'>
  geom: GeoJSON.Polygon
  foto_blobs?: Blob[]
}

export interface FeaturePredio {
  type: 'Feature'
  geometry: GeoJSON.Polygon
  properties: {
    id: string
    codigo: string
    direccion: string
    barrio?: string
    zona?: string
    tipo: string
    superficie?: number
  }
}

export interface EstadisticasCatastro {
  total_predios: number
  superficie_total_m2: number
  por_tipo: Record<string, number>
  por_zona: Record<string, number>
}

export interface PredioBarrio {
  barrio: string
  predios: number
  superficie_m2: number
}
