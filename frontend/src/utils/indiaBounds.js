export const INDIA_BOUNDS = {
  minLat: 6.5546,
  maxLat: 35.6745,
  minLng: 68.1766,
  maxLng: 97.4025,
}

export const INDIA_CENTER = [20.5937, 78.9629]
export const INDIA_DEFAULT_ZOOM = 5

// Leaflet LatLngBounds format [[sw_lat, sw_lng], [ne_lat, ne_lng]]
export const INDIA_LEAFLET_BOUNDS = [
  [INDIA_BOUNDS.minLat, INDIA_BOUNDS.minLng],
  [INDIA_BOUNDS.maxLat, INDIA_BOUNDS.maxLng],
]

export function isInIndia(lat, lng) {
  return (
    lat >= INDIA_BOUNDS.minLat &&
    lat <= INDIA_BOUNDS.maxLat &&
    lng >= INDIA_BOUNDS.minLng &&
    lng <= INDIA_BOUNDS.maxLng
  )
}
