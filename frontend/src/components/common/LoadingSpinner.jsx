import { clsx } from 'clsx'

export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm:  'w-4 h-4 border-2',
    md:  'w-7 h-7 border-2',
    lg:  'w-12 h-12 border-[3px]',
    xl:  'w-16 h-16 border-4',
  }
  return (
    <div
      className={clsx(
        'rounded-full border-road-border border-t-brand-500 animate-spin',
        sizes[size] ?? sizes.md,
        className,
      )}
    />
  )
}

/** Full-screen loading overlay */
export function PageLoader({ message = 'Loading…' }) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-road-dark/90 backdrop-blur-sm gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-road-muted text-sm font-mono animate-pulse">{message}</p>
    </div>
  )
}

/** Inline skeleton block */
export function Skeleton({ className = '' }) {
  return <div className={clsx('skeleton rounded-lg', className)} />
}
