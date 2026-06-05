import { clsx } from 'clsx'
import { Clock, Ruler, Shield, Zap, TriangleAlert } from 'lucide-react'
import useMapStore from '../../store/mapStore'
import { getQualityScoreColor, getQualityScoreLabel } from '../../utils/severity'

const TAG_CONFIG = {
  fastest:     { label: 'Fastest',     icon: Zap,    color: 'text-blue-400',  border: 'border-blue-500/40',  bg: 'bg-blue-500/10' },
  safest:      { label: 'Safest',      icon: Shield, color: 'text-green-400', border: 'border-green-500/40', bg: 'bg-green-500/10' },
  balanced:    { label: 'Balanced',    icon: Ruler,  color: 'text-brand-400', border: 'border-brand-500/40', bg: 'bg-brand-500/10' },
  recommended: { label: 'Recommended', icon: Shield, color: 'text-purple-400',border: 'border-purple-500/40',bg: 'bg-purple-500/10' },
}

export default function RouteCard({ route }) {
  const { activeRouteId, setActiveRoute } = useMapStore()
  const isActive = route.route_id === activeRouteId
  const tag = TAG_CONFIG[route.recommendation_tag] || TAG_CONFIG.balanced
  const TagIcon = tag.icon
  const qColor = getQualityScoreColor(route.road_quality_score)

  return (
    <button
      onClick={() => setActiveRoute(route.route_id)}
      className={clsx(
        'w-full text-left rounded-xl border transition-all p-3 flex flex-col gap-3',
        isActive
          ? `${tag.border} ${tag.bg}`
          : 'border-road-border hover:border-road-muted bg-road-dark',
      )}
    >
      {/* Tag + quality score */}
      <div className="flex items-center justify-between">
        <span className={clsx('flex items-center gap-1.5 text-xs font-mono font-medium', tag.color)}>
          <TagIcon size={12} />
          {tag.label}
        </span>
        <div className="flex items-center gap-1.5">
          <div
            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
            style={{ color: qColor, background: qColor + '22', border: `1px solid ${qColor}44` }}
          >
            {route.road_quality_score}/100 · {getQualityScoreLabel(route.road_quality_score)}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 text-xs text-white">
          <Ruler size={11} className="text-road-muted" />
          <span className="font-mono">{route.distance_km} km</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-white">
          <Clock size={11} className="text-road-muted" />
          <span className="font-mono">{Math.round(route.duration_min)} min</span>
        </div>
        {route.damage_count > 0 && (
          <div className="flex items-center gap-1 text-xs text-amber-400 ml-auto">
            <TriangleAlert size={11} />
            <span className="font-mono">{route.damage_count} hazard{route.damage_count > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Quality bar */}
      <div className="h-1 rounded-full bg-road-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${route.road_quality_score}%`, background: qColor }}
        />
      </div>

      {/* Top damage warning */}
      {isActive && route.damage_warnings?.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1 border-t border-road-border pt-2">
          <p className="text-[10px] font-mono text-road-muted uppercase tracking-widest">Hazards on route</p>
          {route.damage_warnings.slice(0, 3).map((w, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <TriangleAlert size={10} className={
                w.severity === 'severe' ? 'text-red-400' :
                w.severity === 'moderate' ? 'text-amber-400' : 'text-green-400'
              } />
              <span className="text-road-muted font-mono">{w.distance_from_start_km}km</span>
              <span className="text-white">{(w.damage_types || []).join(', ') || 'damage'}</span>
            </div>
          ))}
          {route.damage_warnings.length > 3 && (
            <p className="text-[10px] text-road-muted">+{route.damage_warnings.length - 3} more hazards</p>
          )}
        </div>
      )}
    </button>
  )
}
