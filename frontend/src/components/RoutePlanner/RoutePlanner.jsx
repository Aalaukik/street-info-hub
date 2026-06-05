import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigation, X, Loader2, AlertTriangle, MapPin, Clock, Ruler, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { planRoute } from '../../services/api'
import useMapStore from '../../store/mapStore'
import RouteCard from './RouteCard'

export default function RoutePlanner() {
  const { setRoutePlannerOpen, setRouteData, setActiveRoute, clearRoute } = useMapStore()
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handlePlan = async () => {
    if (!origin.trim()) return toast.error('Enter starting point')
    if (!destination.trim()) return toast.error('Enter destination')
    setLoading(true)
    setError(null)
    setResult(null)
    clearRoute()

    try {
      const data = await planRoute({ origin, destination })
      setResult(data)
      setRouteData(data)
      // Auto-select the fastest route
      const fastest = data.routes.find(r => r.recommendation_tag === 'fastest') || data.routes[0]
      if (fastest) setActiveRoute(fastest.route_id)
    } catch (e) {
      const msg = e.response?.data?.detail || 'Could not plan route. Check your locations and try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setResult(null)
    setError(null)
    clearRoute()
    setOrigin('')
    setDestination('')
  }

  return (
    <motion.div
      className="flex flex-col h-full bg-road-card overflow-y-auto"
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-road-border sticky top-0 bg-road-card z-10">
        <div className="flex items-center gap-2">
          <Navigation size={16} className="text-brand-400" />
          <div>
            <h2 className="font-display font-semibold text-sm">Route Planner</h2>
            <p className="text-[10px] text-road-muted font-mono">Safest path through India</p>
          </div>
        </div>
        <button
          onClick={() => { setRoutePlannerOpen(false); clearRoute() }}
          className="p-1.5 rounded-lg hover:bg-road-border text-road-muted hover:text-white transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Input form */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 block" />
            </span>
            <input
              value={origin}
              onChange={e => setOrigin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePlan()}
              placeholder="From: e.g. Connaught Place, Delhi"
              className="w-full bg-road-dark border border-road-border rounded-lg pl-8 pr-3 py-2.5 text-xs text-white placeholder:text-road-muted focus:outline-none focus:border-brand-500/60 transition-colors"
            />
          </div>

          {/* Connector line */}
          <div className="w-px h-3 bg-road-border ml-[14px]" />

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 block" />
            </span>
            <input
              value={destination}
              onChange={e => setDestination(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePlan()}
              placeholder="To: e.g. Hinjewadi, Pune"
              className="w-full bg-road-dark border border-road-border rounded-lg pl-8 pr-3 py-2.5 text-xs text-white placeholder:text-road-muted focus:outline-none focus:border-brand-500/60 transition-colors"
            />
          </div>
        </div>

        <button
          onClick={handlePlan}
          disabled={loading || !origin || !destination}
          className="btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
        >
          {loading
            ? <><Loader2 size={14} className="animate-spin" /> Calculating routes…</>
            : <><Navigation size={14} /> Find Best Routes</>}
        </button>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-mono text-road-muted uppercase tracking-widest">
                  {result.routes.length} route{result.routes.length > 1 ? 's' : ''} found
                </p>
                <button onClick={handleClear} className="text-[10px] text-road-muted hover:text-white transition-colors">
                  Clear
                </button>
              </div>

              {result.routes.map((route) => (
                <RouteCard key={route.route_id} route={route} />
              ))}

              <p className="text-[10px] text-road-muted text-center font-mono">
                Tap a route card to highlight it on the map
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
