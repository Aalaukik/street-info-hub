/**
 * OpenRouteService frontend wrapper.
 * Used for location autocomplete in the Route Planner.
 * Key: VITE_ORS_API_KEY (free tier: 2000 req/day)
 */

const ORS_BASE = 'https://api.openrouteservice.org'
const getKey = () => import.meta.env.VITE_ORS_API_KEY || ''

// India bounding box for ORS geocoding
const INDIA_BBOX = '68.1766,6.5546,97.4025,35.6745'  // minLng,minLat,maxLng,maxLat

/**
 * Autocomplete address search using ORS Pelias geocoding.
 * Returns up to 5 suggestions restricted to India.
 */
export async function autocomplete(text) {
  if (!text || text.length < 3) return []

  const key = getKey()
  if (!key) {
    console.warn('ORS_API_KEY not set — autocomplete disabled')
    return []
  }

  const params = new URLSearchParams({
    api_key: key,
    text,
    'boundary.country': 'IND',
    'boundary.rect.min_lon': '68.1766',
    'boundary.rect.min_lat': '6.5546',
    'boundary.rect.max_lon': '97.4025',
    'boundary.rect.max_lat': '35.6745',
    size: '5',
    lang: 'en',
  })

  try {
    const res = await fetch(
      `${ORS_BASE}/geocode/autocomplete?${params}`,
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.features || []).map((f) => ({
      label: f.properties.label || f.properties.name,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
    }))
  } catch {
    return []
  }
}

/**
 * Geocode a single address string using ORS (India only).
 */
export async function geocode(text) {
  const key = getKey()
  if (!key) return null

  const params = new URLSearchParams({
    api_key: key,
    text,
    'boundary.country': 'IND',
    size: '1',
  })

  try {
    const res = await fetch(`${ORS_BASE}/geocode/search?${params}`)
    if (!res.ok) return null
    const data = await res.json()
    const f = data.features?.[0]
    if (!f) return null
    return {
      label: f.properties.label,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
    }
  } catch {
    return null
  }
}
