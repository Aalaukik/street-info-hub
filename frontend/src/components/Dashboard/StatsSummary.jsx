import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, MapPin, TrendingUp } from 'lucide-react'
import { fetchSummaryStats } from '../../services/api'
import { clsx } from 'clsx'

function KpiCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className={clsx(
      'card flex items-start gap-3 border',
      accent === 'red'    && 'border-red-500/20',
      accent === 'green'  && 'border-green-500/20',
      accent === 'amber'  && 'border-amber-500/20',
      accent === 'brand'  && 'border-brand-500/20',
    )}>
      <div className={clsx(
        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
        accent === 'red'    && 'bg-red-500/15',
        accent === 'green'  && 'bg-green-500/15',
        accent === 'amber'  && 'bg-amber-500/15',
        accent === 'brand'  && 'bg-brand-500/15',
      )}>
        <Icon size={18} className={clsx(
          accent === 'red'    && 'text-red-400',
          accent === 'green'  && 'text-green-400',
          accent === 'amber'  && 'text-amber-400',
          accent === 'brand'  && 'text-brand-400',
        )} />
      </div>
      <div>
        <p className="text-[10px] font-mono text-road-muted uppercase tracking-widest">{label}</p>
        <p className="font-display font-bold text-2xl text-white mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-[11px] text-road-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function StatsSummary() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchSummaryStats().then(setStats).catch(() => {})
  }, [])

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <KpiCard icon={MapPin}       label="Total Reports"   value={stats?.total_reports}   sub="All time"              accent="brand"  />
      <KpiCard icon={AlertTriangle}label="Severe Damage"   value={stats?.severe_reports}  sub="Need urgent repair"    accent="red"    />
      <KpiCard icon={CheckCircle}  label="Resolved"        value={stats?.resolved_reports} sub="Roads repaired"       accent="green"  />
      <KpiCard icon={TrendingUp}   label="Active Reports"  value={stats ? stats.total_reports - stats.resolved_reports : null} sub="Awaiting repair" accent="amber" />
    </div>
  )
}
