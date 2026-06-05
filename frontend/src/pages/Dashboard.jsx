import StatsSummary from '../components/Dashboard/StatsSummary'
import DamageTypeChart from '../components/Dashboard/DamageTypeChart'
import RecentFeed from '../components/Dashboard/RecentFeed'
import StateChloropleth from '../components/Dashboard/StateChloropleth'

export default function Dashboard() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 pt-20 pb-16 md:pb-6 flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl md:text-3xl">
          Road Damage <span className="text-gradient">Dashboard</span>
        </h1>
        <p className="text-road-muted text-sm mt-1">
          Citizen-reported road conditions across India
        </p>
      </div>

      <StatsSummary />
      <DamageTypeChart />

      <div className="grid md:grid-cols-2 gap-4">
        <StateChloropleth />
        <RecentFeed />
      </div>

      {/* How it works */}
      <div className="card">
        <p className="text-xs font-mono text-road-muted uppercase tracking-widest mb-3">How It Works</p>
        <div className="grid sm:grid-cols-3 gap-4 text-sm text-road-muted">
          {[
            { step: '01', title: 'Upload a Photo', body: 'Take a photo of a damaged road and upload it through the app.' },
            { step: '02', title: 'AI Analysis',    body: 'Two-stage AI detects road presence, damage type, and severity automatically.' },
            { step: '03', title: 'Map & Route',    body: 'Verified reports appear on the public map and influence route quality scores.' },
          ].map(({ step, title, body }) => (
            <div key={step} className="flex flex-col gap-2">
              <span className="font-mono text-brand-400 text-xs">{step}</span>
              <p className="font-display font-semibold text-white text-sm">{title}</p>
              <p className="text-xs leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Severity legend */}
      <div className="flex flex-wrap gap-3">
        {[
          { color: 'bg-green-400',  label: 'Minor',    desc: 'Surface cracks, minor wear' },
          { color: 'bg-amber-400',  label: 'Moderate', desc: 'Significant cracks, small potholes' },
          { color: 'bg-red-400',    label: 'Severe',   desc: 'Deep potholes, structural damage' },
        ].map(({ color, label, desc }) => (
          <div key={label} className="card flex items-center gap-3 flex-1 min-w-[160px]">
            <span className={`w-3 h-3 rounded-full ${color} shrink-0`} />
            <div>
              <p className="text-xs font-semibold text-white">{label}</p>
              <p className="text-[10px] text-road-muted">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
