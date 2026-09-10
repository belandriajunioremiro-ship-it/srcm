import { supabase } from './supabase'
import type { Inmueble, Propietario, Copropietario } from '@/types'

export const api = {
  // === PROPIETARIOS ===
  async getPropietarios() {
    const { data, error } = await supabase.from('propietarios').select('*').order('nombre')
    if (error) throw error
    return data as Propietario[]
  },
  async getPropietario(id: string) {
    const { data, error } = await supabase.from('propietarios').select('*').eq('id', id).single()
    if (error) throw error
    return data as Propietario
  },
  async createPropietario(propietario: Omit<Propietario, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('propietarios').insert(propietario).select().single()
    if (error) throw error
    return data as Propietario
  },

  // === INMUEBLES ===
  async generarCodigoCatastral(zona = '01', barrio = '00') {
    const { data, error } = await supabase.rpc('generar_codigo_catastral', {
      p_zona: zona,
      p_barrio: barrio
    })
    if (error) throw error
    return data as string
  },

  async getInmuebles() {
    const { data, error } = await supabase.from('inmuebles').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data as Inmueble[]
  },
  async getInmueble(id: string) {
    const { data, error } = await supabase.from('inmuebles').select('*').eq('id', id).single()
    if (error) throw error
    
    // Fetch copropietarios vigentes
    const { data: copropData } = await supabase.from('v_copropietarios_actuales').select('*').eq('inmueble_id', id)
    
    // Fetch fotos
    const { data: fotos } = await supabase.from('fotos_inmueble').select('*').eq('inmueble_id', id).order('created_at', { ascending: true })
    
    // Fetch construcciones
    const { data: construcciones } = await supabase.from('construcciones').select('*').eq('inmueble_id', id).order('created_at', { ascending: true })
    
    // Fetch historial dueños (todos)
    const { data: historialData } = await supabase.from('predio_propietarios')
      .select('*, propietario:propietarios(*)')
      .eq('inmueble_id', id)
      .order('fecha_inicio', { ascending: false })

    const inmueble = data as Inmueble & { fotos?: any[], construcciones?: any[], historial?: any[] }
    if (copropData && copropData.length > 0) {
      inmueble.propietarios = copropData as Copropietario[]
      inmueble.propietario = inmueble.propietarios[0] // for backwards compatibility
    }
    
    inmueble.fotos = fotos || []
    inmueble.construcciones = construcciones || []
    inmueble.historial = historialData || []
    
    return inmueble
  },
  async createInmueble(
    inmueble: any,
    propietarios: { propietario_id: string, porcentaje: number, tipo_tenencia: string }[],
    fotos: string[] = [],
    construcciones: any[] = []
  ) {
    // 1. Invocamos el RPC para insertar el inmueble
    const { data: id, error } = await supabase.rpc('insertar_inmueble', {
      p_codigo: inmueble.codigo_catastral,
      p_direccion: inmueble.direccion,
      p_barrio: inmueble.barrio,
      p_zona: inmueble.zona,
      p_tipo: inmueble.tipo_inmueble,
      p_superficie: inmueble.superficie_m2,
      p_norte: inmueble.norte,
      p_sur: inmueble.sur,
      p_este: inmueble.este,
      p_oeste: inmueble.oeste,
      p_geom: inmueble.geom
    });

    if (error) throw error;

    // 2. Registramos los copropietarios
    if (propietarios && propietarios.length > 0) {
      const { error: propError } = await supabase.rpc('registrar_copropietarios', {
        p_inmueble_id: id,
        p_propietarios: propietarios
      });
      if (propError) throw propError;
    }

    // 3. Registramos las fotos
    if (fotos && fotos.length > 0) {
      const fotosData = fotos.map(url => ({ inmueble_id: id, url }))
      const { error: fotosError } = await supabase.from('fotos_inmueble').insert(fotosData)
      if (fotosError) throw fotosError;
    }

    // 4. Registramos las construcciones
    if (construcciones && construcciones.length > 0) {
      const consData = construcciones.map(c => ({ ...c, inmueble_id: id }))
      const { error: consError } = await supabase.from('construcciones').insert(consData)
      if (consError) throw consError;
    }

    return id;
  },

  async getMapaCatastral() {
    const { data, error } = await supabase.rpc('mapa_catastral')
    if (error) throw error
    return data
  },

  async getEstadisticas() {
    const { data, error } = await supabase.rpc('estadisticas_catastro')
    if (error) throw error
    return data
  },

  async getPrediosPorBarrio() {
    const { data, error } = await supabase.rpc('predios_por_barrio')
    if (error) throw error
    return data
  },

  async getSolapamientos() {
    const { data, error } = await supabase.rpc('detectar_solapamientos')
    if (error) throw error
    return data
  }
}
