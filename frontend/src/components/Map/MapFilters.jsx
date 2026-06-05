import { Layers, Thermometer, RefreshCw, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'
import useReportsStore from '../../store/reportsStore'
import useMapStore from '../../store/mapStore'
import { DAMAGE_TYPE_LABELS } from '../../utils/severity'

const SEVERITIES = ['minor', 'moderate', 'severe']
const DAMAGE_TYPES = Object.keys(DAMAGE_TYPE_LABELS).filter(k => k !== 'unknown')
const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu',
  'Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Jammu & Kashmir','Ladakh',
]

export default function MapFilters() {
  const { filters, setFilters, loadReports, loading } = useReportsStore()
  const { showHeatmap, toggleHeatmap } = useMapStore()

  const handleChange = (key, value) => {
    setFilters({ [key]: value === filters[key] ? null : value })
  }

  const applyFilters = () => loadReports()

  return (
    <div className="card flex flex-col gap-3 min-w-[200px]">
      {/* Layer toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => useMapStore.getState().setUploadPanelOpen(true)}
          className="flex-1 btn-primary text-xs py-2"
        >
          + Report
        </button>
        <button
          onClick={toggleHeatmap}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body border transition-colors',
            showHeatmap
              ? 'bg-brand-500/20 border-brand-500/50 text-brand-400'
              : 'border-road-border text-road-muted hover:border-brand-500/40',
          )}
        >
          <Thermometer size={13} />
          Heat
        </button>
      </div>

      <hr className="border-road-border" />

      {/* Severity */}
      <div>
        <p className="text-[10px] font-mono text-road-muted uppercase tracking-widest mb-2">Severity</p>
        <div className="flex flex-wrap gap-1.5">
          {SEVERITIES.map(s => (
            <button
              key={s}
              onClick={() => handleChange('severity', s)}
              className={clsx(
                'text-[10px] font-mono px-2.5 py-1 rounded-full border transition-colors capitalize',
                filters.severity === s
                  ? s === 'minor'   ? 'bg-green-500/20 border-green-500/50 text-green-400'
                  : s === 'moderate'? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                                    : 'bg-red-500/20 border-red-500/50 text-red-400'
                  : 'border-road-border text-road-muted hover:border-road-muted',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Damage type */}
      <div>
        <p className="text-[10px] font-mono text-road-muted uppercase tracking-widest mb-2">Damage Type</p>
        <div className="flex flex-col gap-1">
          {DAMAGE_TYPES.map(t => (
            <button
              key={t}
              onClick={() => handleChange('damage_type', t)}
              className={clsx(
                'text-left text-xs px-2 py-1 rounded transition-colors',
                filters.damage_type === t
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'text-road-muted hover:text-white hover:bg-road-border',
              )}
            >
              {DAMAGE_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* State */}
      <div>
        <p className="text-[10px] font-mono text-road-muted uppercase tracking-widest mb-2">State</p>
        <div className="relative">
          <select
            value={filters.state || ''}
            onChange={e => setFilters({ state: e.target.value || null })}
            className="w-full bg-road-dark border border-road-border text-xs text-white rounded-lg px-2 py-1.5 appearance-none cursor-pointer"
          >
            <option value="">All India</option>
            {INDIAN_STATES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-2 text-road-muted pointer-events-none" />
        </div>
      </div>

      {/* Apply */}
      <button
        onClick={applyFilters}
        disabled={loading}
        className="btn-primary text-xs py-2 flex items-center justify-center gap-1.5"
      >
        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        {loading ? 'Loading…' : 'Apply Filters'}
      </button>

      {/* Reset */}
      <button
        onClick={() => { setFilters({ severity: null, damage_type: null, state: null }); loadReports() }}
        className="text-xs text-road-muted hover:text-white transition-colors text-center"
      >
        Reset filters
      </button>
    </div>
  )
}
