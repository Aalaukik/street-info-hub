export const SEVERITY_CONFIG = {
  minor: {
    label: 'Minor',
    color: '#22c55e',
    bg: 'bg-green-500/15',
    text: 'text-green-400',
    border: 'border-green-500/30',
    hex: '#22c55e',
  },
  moderate: {
    label: 'Moderate',
    color: '#f59e0b',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    hex: '#f59e0b',
  },
  severe: {
    label: 'Severe',
    color: '#ef4444',
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
    hex: '#ef4444',
  },
}

export const DAMAGE_TYPE_LABELS = {
  pothole: 'Pothole',
  longitudinal_crack: 'Longitudinal Crack',
  transverse_crack: 'Transverse Crack',
  alligator_crack: 'Alligator Crack',
  rutting: 'Rutting',
  edge_break: 'Edge Break',
  unknown: 'Unknown',
}

export const DAMAGE_TYPE_ICONS = {
  pothole: '🕳️',
  longitudinal_crack: '〰️',
  transverse_crack: '⚡',
  alligator_crack: '🐊',
  rutting: '📉',
  edge_break: '🔪',
  unknown: '❓',
}

export function getSeverityConfig(severity) {
  return SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.minor
}

export function getDamageLabel(type) {
  return DAMAGE_TYPE_LABELS[type] || type
}

export function getQualityScoreColor(score) {
  if (score >= 75) return '#22c55e'
  if (score >= 50) return '#f59e0b'
  if (score >= 25) return '#f97316'
  return '#ef4444'
}

export function getQualityScoreLabel(score) {
  if (score >= 75) return 'Good'
  if (score >= 50) return 'Fair'
  if (score >= 25) return 'Poor'
  return 'Dangerous'
}
