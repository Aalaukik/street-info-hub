import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet.markercluster'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import useReportsStore from '../../store/reportsStore'
import useMapStore from '../../store/mapStore'
import { getSeverityConfig, getDamageLabel, DAMAGE_TYPE_ICONS } from '../../utils/severity'
import { INDIA_CENTER, INDIA_DEFAULT_ZOOM, INDIA_LEAFLET_BOUNDS } from '../../utils/indiaBounds'
import RouteLayer from './RouteLayer'
import HeatmapLayer from './HeatmapLayer'
import { formatDistanceToNow } from 'date-fns'

// Fix Leaflet default marker icon path issue with bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function createDamageIcon(severity) {
  const cfg = getSeverityConfig(severity)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <defs>
        <filter id="shadow" x="-30%" y="-10%" width="160%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.5)"/>
        </filter>
      </defs>
      <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 24 16 24S32 26 32 16C32 7.163 24.837 0 16 0z"
            fill="${cfg.hex}" filter="url(#shadow)"/>
      <circle cx="16" cy="16" r="8" fill="rgba(0,0,0,0.25)"/>
      <circle cx="16" cy="16" r="5" fill="white"/>
    </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -42],
  })
}

function buildPopupHTML(report) {
  const cfg = getSeverityConfig(report.severity)
  const types = (report.damage_types || [])
    .map(t => `${DAMAGE_TYPE_ICONS[t] || '🔧'} ${getDamageLabel(t)}`)
    .join(', ')
  const timeAgo = formatDistanceToNow(new Date(report.created_at), { addSuffix: true })
  const addr = report.address_text
    ? report.address_text.split(',').slice(0, 3).join(',')
    : `${report.latitude?.toFixed(4)}, ${report.longitude?.toFixed(4)}`

  return `
    <div style="font-family:'DM Sans',sans-serif;width:240px;padding:0;">
      ${report.image_url ? `
        <div style="width:100%;height:130px;overflow:hidden;border-radius:8px 8px 0 0;">
          <img src="${report.image_url}" alt="road damage"
               style="width:100%;height:100%;object-fit:cover;"/>
        </div>` : ''}
      <div style="padding:12px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
          <span style="
            display:inline-flex;align-items:center;gap:4px;
            background:${cfg.hex}22;color:${cfg.hex};
            border:1px solid ${cfg.hex}44;
            border-radius:999px;font-size:10px;font-weight:600;
            padding:2px 8px;font-family:'DM Mono',monospace;text-transform:uppercase;
          ">
            <span style="width:6px;height:6px;border-radius:50%;background:${cfg.hex};display:inline-block;"></span>
            ${cfg.label}
          </span>
          <span style="font-size:10px;color:#8b949e;margin-left:auto;">${timeAgo}</span>
        </div>
        <p style="font-size:12px;color:#e6edf3;margin:0 0 4px;font-weight:500;">${types || 'No damage type'}</p>
        <p style="font-size:11px;color:#8b949e;margin:0;line-height:1.4;">📍 ${addr}</p>
        ${report.description ? `<p style="font-size:11px;color:#8b949e;margin:6px 0 0;font-style:italic;">"${report.description}"</p>` : ''}
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid #21262d;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:10px;color:#8b949e;font-family:'DM Mono',monospace;">
            AI: ${Math.round((report.ai_confidence || 0) * 100)}% confidence
          </span>
        </div>
      </div>
    </div>`
}

// Manages the MarkerClusterGroup layer imperatively
function ClusteredMarkers({ reports }) {
  const map = useMap()
  const clusterRef = useRef(null)
  const { setSelectedReport } = useReportsStore()

  useEffect(() => {
    if (clusterRef.current) {
      map.removeLayer(clusterRef.current)
    }
    const cluster = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
    })

    reports.forEach((report) => {
      const marker = L.marker(
        [report.latitude, report.longitude],
        { icon: createDamageIcon(report.severity) }
      )
      marker.bindPopup(buildPopupHTML(report), {
        maxWidth: 260,
        minWidth: 240,
        className: 'damage-popup',
      })
      marker.on('click', () => setSelectedReport(report))
      cluster.addLayer(marker)
    })

    map.addLayer(cluster)
    clusterRef.current = cluster

    return () => {
      if (clusterRef.current) map.removeLayer(clusterRef.current)
    }
  }, [reports, map])

  return null
}

// Keeps map within India bounds
function IndiaBoundsEnforcer() {
  useMapEvents({
    moveend: (e) => {
      const map = e.target
      const bounds = map.getBounds()
      const indiaBounds = L.latLngBounds(INDIA_LEAFLET_BOUNDS)
      if (!indiaBounds.intersects(bounds)) {
        map.setView(INDIA_CENTER, INDIA_DEFAULT_ZOOM)
      }
    },
  })
  return null
}

export default function MapView() {
  const { reports } = useReportsStore()
  const { showHeatmap, routeData, activeRouteId } = useMapStore()

  return (
    <MapContainer
      center={INDIA_CENTER}
      zoom={INDIA_DEFAULT_ZOOM}
      className="w-full h-full"
      minZoom={4}
      maxZoom={18}
      maxBounds={[
        [INDIA_LEAFLET_BOUNDS[0][0] - 5, INDIA_LEAFLET_BOUNDS[0][1] - 5],
        [INDIA_LEAFLET_BOUNDS[1][0] + 5, INDIA_LEAFLET_BOUNDS[1][1] + 5],
      ]}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      <IndiaBoundsEnforcer />

      {showHeatmap
        ? <HeatmapLayer reports={reports} />
        : <ClusteredMarkers reports={reports} />
      }

      {routeData && (
        <RouteLayer routeData={routeData} activeRouteId={activeRouteId} />
      )}
    </MapContainer>
  )
}
