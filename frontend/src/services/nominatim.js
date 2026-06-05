/**
 * Nominatim (OpenStreetMap) geocoding service.
 * Free — no API key needed. Rate limit: 1 req/sec.
 * Restricted to India (countrycodes=in).
 */

const BASE = 'https://nominatim.openstreetmap.org'
const HEADERS = { 'Accept-Language': 'en' }

let lastCall = 0

async function throttle() {
  const now = Date.now()
  const gap = 1100 - (now - lastCall)
  if (gap > 0) await new Promise((r) => setTimeout(r, gap))
  lastCall = Date.now()
}

/**
 * Forward geocode: address string → { lat, lng, displayName }
 * Only searches within India.
 */
export async function forwardGeocode(query) {
  await throttle()
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '5',
    countrycodes: 'in',
    addressdetails: '1',
  })

  const res = await fetch(`${BASE}/search?${params}`, { headers: HEADERS })
  if (!res.ok) throw new Error('Geocoding failed')

  const results = await res.json()
  return results.map((r) => ({
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    displayName: r.display_name,
    type: r.type,
  }))
}

/**
 * Reverse geocode: { lat, lng } → { address, state, city, displayName }
 */
export async function reverseGeocode(lat, lng) {
  await throttle()
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'jsonv2',
    zoom: '16',
    addressdetails: '1',
  })

  const res = await fetch(`${BASE}/reverse?${params}`, { headers: HEADERS })
  if (!res.ok) throw new Error('Reverse geocoding failed')

  const data = await res.json()
  const addr = data.address || {}

  return {
    displayName: data.display_name || '',
    address: data.display_name || '',
    city: addr.city || addr.town || addr.village || addr.suburb || '',
    state: addr.state || '',
    country: addr.country || '',
  }
}
