import { useState, useCallback } from 'react'
import { planRoute } from '../services/api'
import useMapStore from '../store/mapStore'

/**
 * Hook for route planning logic — keeps form state,
 * triggers the API, and pushes results into the map store.
 */
export function useRoute() {
  const { setRouteData, setActiveRoute, clearRoute } = useMapStore()

  const [origin, setOrigin]           = useState('')
  const [destination, setDestination] = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [result, setResult]           = useState(null)

  const plan = useCallback(async () => {
    if (!origin.trim() || !destination.trim()) return

    setLoading(true)
    setError(null)
    clearRoute()

    try {
      const data = await planRoute({ origin, destination })
      setResult(data)
      setRouteData(data)

      // Auto-select the best route
      const best =
        data.routes.find((r) => r.recommendation_tag === 'safest') ||
        data.routes.find((r) => r.recommendation_tag === 'fastest') ||
        data.routes[0]
      if (best) setActiveRoute(best.route_id)
    } catch (e) {
      const msg =
        e.response?.data?.detail ||
        'Could not find a route. Check your locations and try again.'
      setError(typeof msg === 'object' ? JSON.stringify(msg) : msg)
    } finally {
      setLoading(false)
    }
  }, [origin, destination, setRouteData, setActiveRoute, clearRoute])

  const clear = useCallback(() => {
    setResult(null)
    setError(null)
    clearRoute()
  }, [clearRoute])

  return {
    origin, setOrigin,
    destination, setDestination,
    loading,
    error,
    result,
    plan,
    clear,
  }
}
