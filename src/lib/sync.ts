import { db } from './mockDb'
import type { Inmueble } from '@/types'

/** Simula una llamada al servidor: latencia + posible fallo */
function delay<T>(data: T, ms = 800): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

export async function fetchInmueblesFromServer(): Promise<Inmueble[]> {
  // En un sistema real esto sería un fetch a la API REST/GraphQL
  return delay([], 600)
}

export async function pushInmuebleToServer(inmueble: Inmueble): Promise<Inmueble> {
  // Simula POST /api/inmuebles
  console.log('[SIMULACIÓN] Enviando al servidor:', inmueble.codigo_catastral)
  return delay(inmueble, 1000)
}

export async function syncPendientes(): Promise<{ synced: number; conflicts: number }> {
  const pendientes = await db.inmuebles.where('estado_sync').equals('pendiente').toArray()
  let synced = 0, conflicts = 0
  for (const p of pendientes) {
    try {
      await pushInmuebleToServer(p)
      await db.inmuebles.update(p.id, { estado_sync: 'synced' })
      synced++
    } catch {
      await db.inmuebles.update(p.id, { estado_sync: 'conflicto' })
      conflicts++
    }
  }
  return { synced, conflicts }
}
