import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fetchRecentReports } from '../../services/api'
import Badge from '../common/Badge'
import { getDamageLabel, DAMAGE_TYPE_ICONS } from '../../utils/severity'

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-road-border last:border-0">
      <div className="w-12 h-12 rounded-lg skeleton shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-3 w-3/4 rounded skeleton" />
        <div className="h-2.5 w-1/2 rounded skeleton" />
      </div>
    </div>
  )
}

export default function RecentFeed() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentReports()
      .then(setReports)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-mono text-road-muted uppercase tracking-widest">Recent Activity</p>
        <span className="flex items-center gap-1.5 text-[10px] font-mono text-green-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-dot" />
          Live
        </span>
      </div>

      <div className="flex flex-col">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          : reports.length === 0
            ? <p className="text-xs text-road-muted text-center py-6 font-mono">No reports yet</p>
            : reports.map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-3 border-b border-road-border last:border-0">
                  {r.image_url ? (
                    <img
                      src={r.image_url}
                      alt="road"
                      className="w-12 h-12 rounded-lg object-cover border border-road-border shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-road-border shrink-0 flex items-center justify-center text-lg">
                      🛣️
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-white font-body truncate">
                        {(r.damage_types || []).map(t => `${DAMAGE_TYPE_ICONS[t] || ''} ${getDamageLabel(t)}`).join(', ') || 'No damage'}
                      </span>
                      <Badge severity={r.severity} />
                    </div>
                    <p className="text-[11px] text-road-muted truncate font-mono">
                      📍 {r.city || r.state || 'India'} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
      </div>
    </div>
  )
}
