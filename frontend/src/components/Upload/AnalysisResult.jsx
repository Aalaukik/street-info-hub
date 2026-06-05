import { CheckCircle, MapPin, Brain, TriangleAlert } from 'lucide-react'
import { motion } from 'framer-motion'
import Badge from '../common/Badge'
import { getDamageLabel, DAMAGE_TYPE_ICONS, getSeverityConfig } from '../../utils/severity'
import { formatConfidence, shortAddress } from '../../utils/formatters'

export default function AnalysisResult({ result, onReportAnother }) {
  if (!result) return null

  const cfg = getSeverityConfig(result.severity)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-3"
    >
      {/* Success banner */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-green-500/10 border border-green-500/30 rounded-xl">
        <CheckCircle size={16} className="text-green-400 shrink-0" />
        <p className="text-xs text-green-300 font-body">Report submitted successfully!</p>
      </div>

      {/* Road image */}
      {result.image_url && (
        <div className="relative rounded-xl overflow-hidden border border-road-border">
          <img
            src={result.image_url}
            alt="Submitted road damage"
            className="w-full h-40 object-cover"
          />
          {/* Severity overlay pill */}
          <div className="absolute top-2 right-2">
            <Badge severity={result.severity} size="md" />
          </div>
        </div>
      )}

      {/* Analysis breakdown */}
      <div className="card flex flex-col divide-y divide-road-border">
        {/* Damage types */}
        <div className="flex items-start justify-between py-2.5 gap-2">
          <span className="text-[10px] font-mono text-road-muted uppercase tracking-widest pt-0.5 shrink-0">
            Damage
          </span>
          <div className="flex flex-col items-end gap-1 text-right">
            {result.damage_types?.length ? (
              result.damage_types.map((t) => (
                <span key={t} className="text-xs text-white font-body">
                  {DAMAGE_TYPE_ICONS[t] || '🔧'} {getDamageLabel(t)}
                </span>
              ))
            ) : (
              <span className="text-xs text-road-muted">No damage detected</span>
            )}
          </div>
        </div>

        {/* AI confidence */}
        <div className="flex items-center justify-between py-2.5">
          <span className="text-[10px] font-mono text-road-muted uppercase tracking-widest flex items-center gap-1">
            <Brain size={11} /> AI Confidence
          </span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 rounded-full bg-road-border overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.round(result.confidence * 100)}%`,
                  background: cfg.hex,
                }}
              />
            </div>
            <span className="text-xs font-mono text-white">
              {formatConfidence(result.confidence)}
            </span>
          </div>
        </div>

        {/* Location */}
        {result.location && (
          <div className="flex items-start justify-between py-2.5 gap-2">
            <span className="text-[10px] font-mono text-road-muted uppercase tracking-widest pt-0.5 shrink-0 flex items-center gap-1">
              <MapPin size={10} /> Location
            </span>
            <span className="text-xs text-white text-right font-mono leading-relaxed">
              {result.location.address
                ? shortAddress(result.location.address, 2)
                : `${result.location.latitude?.toFixed(4)}, ${result.location.longitude?.toFixed(4)}`}
            </span>
          </div>
        )}
      </div>

      {/* Low confidence warning */}
      {result.confidence < 0.5 && (
        <div className="flex items-start gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <TriangleAlert size={13} className="text-amber-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-amber-300">
            Low confidence result. An admin will review before publishing.
          </p>
        </div>
      )}

      {/* Pending notice */}
      <p className="text-[11px] text-road-muted text-center font-mono bg-road-dark rounded-lg px-3 py-2 border border-road-border">
        ⏳ Report is pending admin review before appearing on the map.
      </p>

      <button onClick={onReportAnother} className="btn-primary py-2.5 text-sm">
        Report Another Road
      </button>
    </motion.div>
  )
}
