import { useState, useCallback } from 'react'
import { isInIndia } from '../utils/indiaBounds'

/**
 * Hook for getting the user's current GPS position.
 * Validates the result is within India's bounding box.
 */
export function useGeolocation() {
  const [coords, setCoords]   = useState(null)   // { lat, lng }
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords
        if (!isInIndia(lat, lng)) {
          setError('Your location appears to be outside India. Street Info Hub only covers Indian roads.')
          setLoading(false)
          return
        }
        setCoords({ lat, lng })
        setLoading(false)
      },
      (err) => {
        const messages = {
          1: 'Location access denied. Please allow location access in your browser settings.',
          2: 'Location unavailable. Please pin your location on the map instead.',
          3: 'Location request timed out. Please pin your location on the map.',
        }
        setError(messages[err.code] || 'Could not get your location.')
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    )
  }, [])

  const clearLocation = useCallback(() => {
    setCoords(null)
    setError(null)
  }, [])

  return { coords, loading, error, getLocation, clearLocation }
}
