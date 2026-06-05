import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import { INDIA_CENTER } from '../../utils/indiaBounds'
import { fetchStatsByState } from '../../services/api'

function getColor(count, max) {
  if (!count || count === 0) return '#1a2332'
  const ratio = count / Math.max(max, 1)
  if (ratio > 0.8) return '#ef4444'
  if (ratio > 0.6) return '#f97316'
  if (ratio > 0.4) return '#f59e0b'
  if (ratio > 0.2) return '#84cc16'
  return '#22c55e'
}

function ChoroplethLayer({ geoJson, statsMap, maxCount }) {
  const map = useMap()

  function style(feature) {
    const state = feature.properties?.NAME_1 || feature.properties?.ST_NM || ''
    const count = statsMap[state] || 0
    return {
      fillColor: getColor(count, maxCount),
      fillOpacity: 0.65,
      color: '#21262d',
      weight: 1,
    }
  }

  function onEachFeature(feature, layer) {
    const state = feature.properties?.NAME_1 || feature.properties?.ST_NM || 'Unknown'
    const count = statsMap[state] || 0
    layer.bindTooltip(
      `<div style="font-family:'DM Mono',monospace;font-size:11px;padding:4px 8px;">
        <strong>${state}</strong><br/>${count} report${count !== 1 ? 's' : ''}
      </div>`,
      { sticky: true, className: 'leaflet-tooltip-dark' }
    )
    layer.on({
      mouseover: (e) => { e.target.setStyle({ fillOpacity: 0.9, weight: 2 }) },
      mouseout: (e) => { e.target.setStyle({ fillOpacity: 0.65, weight: 1 }) },
    })
  }

  return (
    <GeoJSON
      key={JSON.stringify(statsMap)}
      data={geoJson}
      style={style}
      onEachFeature={onEachFeature}
    />
  )
}

export default function StateChloropleth() {
  const [geoJson, setGeoJson]   = useState(null)
  const [statsMap, setStatsMap] = useState({})
  const [maxCount, setMaxCount] = useState(1)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    // Load India states GeoJSON from a free CDN
    fetch('https://raw.githubusercontent.com/geohacker/india/master/state/india_telengana.geojson')
      .then((r) => r.json())
      .then(setGeoJson)
      .catch(() => setGeoJson(null))

    fetchStatsByState()
      .then((data) => {
        const map = {}
        let max = 0
        ;(data || []).forEach((d) => {
          if (d.state) {
            map[d.state] = d.count || 0
            if (d.count > max) max = d.count
          }
        })
        setStatsMap(map)
        setMaxCount(max || 1)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="w-full h-[320px] rounded-xl skeleton" />
  }

  if (!geoJson) {
    return (
      <div className="card h-[320px] flex items-center justify-center text-road-muted text-xs font-mono">
        Map unavailable
      </div>
    )
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs font-mono text-road-muted uppercase tracking-widest">Reports by State</p>
      </div>
      <div className="h-[300px]">
        <MapContainer
          center={INDIA_CENTER}
          zoom={4}
          className="w-full h-full"
          zoomControl={false}
          scrollWheelZoom={false}
          dragging={false}
          doubleClickZoom={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            opacity={0.3}
          />
          <ChoroplethLayer geoJson={geoJson} statsMap={statsMap} maxCount={maxCount} />
        </MapContainer>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-road-border">
        <span className="text-[10px] font-mono text-road-muted">Reports:</span>
        {[
          { color: '#22c55e', label: 'Low' },
          { color: '#f59e0b', label: 'Medium' },
          { color: '#f97316', label: 'High' },
          { color: '#ef4444', label: 'Critical' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ background: color }} />
            <span className="text-[10px] font-mono text-road-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
