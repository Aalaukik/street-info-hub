import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { getSeverityConfig } from '../../utils/severity'
import useMapStore from '../../store/mapStore'

const ROUTE_COLORS = {
  fastest:  '#3b82f6',
  safest:   '#22c55e',
  balanced: '#f97f09',
  recommended: '#a855f7',
}

function createWarningIcon(severity) {
  const cfg = getSeverityConfig(severity)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
      <circle cx="11" cy="11" r="10" fill="${cfg.hex}" opacity="0.9"/>
      <text x="11" y="15" text-anchor="middle" font-size="12" fill="white">⚠</text>
    </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

export default function RouteLayer({ routeData, activeRouteId }) {
  const map = useMap()
  const layerRef = useRef(null)
  const { setActiveRoute } = useMapStore()

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
    }
    if (!routeData?.routes?.length) return

    const group = L.layerGroup()

    routeData.routes.forEach((route) => {
      const isActive = route.route_id === activeRouteId
      const color = ROUTE_COLORS[route.recommendation_tag] || '#f97f09'
      const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng])

      // Draw route polyline
      const poly = L.polyline(coords, {
        color,
        weight: isActive ? 6 : 3,
        opacity: isActive ? 0.9 : 0.45,
        dashArray: isActive ? null : '8 6',
      })

      poly.bindTooltip(
        `<span style="font-family:'DM Mono',monospace;font-size:11px;">
          ${route.recommendation_tag.toUpperCase()} · ${route.distance_km}km · ${Math.round(route.duration_min)}min
          · Score: ${route.road_quality_score}/100
        </span>`,
        { sticky: true }
      )
      poly.on('click', () => setActiveRoute(route.route_id))
      group.addLayer(poly)

      // Draw damage warning markers (only on active route)
      if (isActive && route.damage_warnings?.length) {
        route.damage_warnings.forEach((w) => {
          const m = L.marker([w.latitude, w.longitude], {
            icon: createWarningIcon(w.severity),
          })
          m.bindPopup(
            `<div style="font-family:'DM Sans',sans-serif;font-size:12px;min-width:160px;padding:8px;">
              <strong>⚠️ Road Damage</strong><br/>
              Types: ${(w.damage_types || []).join(', ')}<br/>
              Severity: ${w.severity}<br/>
              ${w.distance_from_start_km}km from start
            </div>`,
            { maxWidth: 200 }
          )
          group.addLayer(m)
        })
      }

      // Origin / destination markers
      if (isActive) {
        const startIcon = L.divIcon({
          html: `<div style="width:14px;height:14px;border-radius:50%;background:#22c55e;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5)"></div>`,
          className: '', iconSize: [14, 14], iconAnchor: [7, 7],
        })
        const endIcon = L.divIcon({
          html: `<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5)"></div>`,
          className: '', iconSize: [14, 14], iconAnchor: [7, 7],
        })
        group.addLayer(L.marker(coords[0], { icon: startIcon }))
        group.addLayer(L.marker(coords[coords.length - 1], { icon: endIcon }))

        // Fit map to active route
        map.fitBounds(L.polyline(coords).getBounds(), { padding: [40, 40] })
      }
    })

    group.addTo(map)
    layerRef.current = group

    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current)
    }
  }, [routeData, activeRouteId, map])

  return null
}
