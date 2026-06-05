import { clsx } from 'clsx'
import { getSeverityConfig } from '../../utils/severity'

export default function Badge({ severity, size = 'sm' }) {
  const cfg = getSeverityConfig(severity)
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 font-mono font-medium rounded-full border',
        cfg.bg, cfg.text, cfg.border,
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
      )}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: cfg.hex }}
      />
      {cfg.label}
    </span>
  )
}
