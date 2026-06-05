import { format, formatDistanceToNow, parseISO } from 'date-fns'

/**
 * Format an ISO timestamp to a human-readable relative string.
 * e.g. "2 hours ago", "3 days ago"
 */
export function timeAgo(isoString) {
  try {
    return formatDistanceToNow(parseISO(isoString), { addSuffix: true })
  } catch {
    return isoString
  }
}

/**
 * Format a timestamp as a short date + time.
 * e.g. "14 Jun 2025, 3:42 PM"
 */
export function formatDateTime(isoString) {
  try {
    return format(parseISO(isoString), "dd MMM yyyy, h:mm a")
  } catch {
    return isoString
  }
}

/**
 * Truncate an address string to the first N components.
 * "12, MG Road, Shivajinagar, Pune, Maharashtra 411001, India"
 * → "12, MG Road, Shivajinagar"
 */
export function shortAddress(address, parts = 3) {
  if (!address) return 'Unknown location'
  return address.split(',').slice(0, parts).join(',').trim()
}

/**
 * Format coordinate pair as a readable string.
 * e.g. "18.5204°N, 73.8567°E"
 */
export function formatCoords(lat, lng) {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lngDir = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`
}

/**
 * Format distance in km — shows metres if < 1km.
 */
export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

/**
 * Format duration in minutes — converts to "Xhr Ymin" if ≥ 60.
 */
export function formatDuration(minutes) {
  if (minutes < 60) return `${Math.round(minutes)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

/**
 * Format AI confidence (0.0–1.0) → "87%"
 */
export function formatConfidence(confidence) {
  return `${Math.round((confidence || 0) * 100)}%`
}

/**
 * Pluralise a word based on count.
 * e.g. pluralise('report', 5) → '5 reports'
 */
export function pluralise(word, count) {
  return `${count} ${word}${count !== 1 ? 's' : ''}`
}
