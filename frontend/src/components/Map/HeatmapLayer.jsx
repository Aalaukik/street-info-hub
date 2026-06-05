import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'

const SEVERITY_INTENSITY = { minor: 0.3, moderate: 0.6, severe: 1.0 }

export default function HeatmapLayer({ reports }) {
  const map = useMap()

  useEffect(() => {
    if (!reports?.length) return

    const points = reports.map((r) => [
      r.latitude,
      r.longitude,
      SEVERITY_INTENSITY[r.severity] ?? 0.5,
    ])

    const heat = L.heatLayer(points, {
      radius: 25,
      blur: 20,
      maxZoom: 13,
      gradient: {
        0.0: '#22c55e',
        0.4: '#f59e0b',
        0.7: '#f97316',
        1.0: '#ef4444',
      },
    })

    heat.addTo(map)
    return () => map.removeLayer(heat)
  }, [reports, map])

  return null
}
