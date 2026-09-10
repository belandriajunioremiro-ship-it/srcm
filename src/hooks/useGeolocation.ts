import { useState, useCallback, useEffect } from 'react'

interface GeoState {
  position: [number, number] | null
  accuracy: number | null
  heading: number | null
  speed: number | null
  loading: boolean
  error: string | null
  watching: boolean
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    position: null,
    accuracy: null,
    heading: null,
    speed: null,
    loading: false,
    error: null,
    watching: false,
  })
  const watchIdRef = useState<number | null>(null)[0]
  const [watchId, setWatchId] = useState<number | null>(null)

  const requestPosition = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    if (!navigator.geolocation) {
      setState({ position: null, accuracy: null, heading: null, speed: null, loading: false, error: 'Geolocalización no soportada', watching: false })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          position: [pos.coords.latitude, pos.coords.longitude],
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          loading: false,
          error: null,
          watching: false,
        })
      },
      (err) => {
        const msg = err.code === 1 ? 'Permiso denegado. Active el GPS en su navegador.'
          : err.code === 2 ? 'Posición no disponible. Verifique que el GPS esté activado.'
          : err.code === 3 ? 'Tiempo de espera agotado. Intente de nuevo.'
          : err.message
        setState({ position: null, accuracy: null, heading: null, speed: null, loading: false, error: msg, watching: false })
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }, [])

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: 'Geolocalización no soportada' }))
      return
    }
    if (watchId !== null) return
    setState((s) => ({ ...s, loading: true, error: null, watching: true }))
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          position: [pos.coords.latitude, pos.coords.longitude],
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          loading: false,
          error: null,
          watching: true,
        })
      },
      (err) => {
        const msg = err.code === 1 ? 'Permiso denegado. Active el GPS en su navegador.'
          : err.code === 2 ? 'Posición no disponible. Verifique que el GPS esté activado.'
          : err.message
        setState((s) => ({ ...s, loading: false, error: msg, watching: false }))
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    )
    setWatchId(id)
  }, [watchId])

  const stopWatching = useCallback(() => {
    if (watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId)
    }
    setWatchId(null)
    setState((s) => ({ ...s, watching: false }))
  }, [watchId])

  useEffect(() => {
    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [watchId])

  void watchIdRef
  return { ...state, requestPosition, startWatching, stopWatching }
}
