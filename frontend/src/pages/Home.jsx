import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Upload, Navigation, MapPin } from 'lucide-react'
import MapView from '../components/Map/MapView'
import MapFilters from '../components/Map/MapFilters'
import UploadPanel from '../components/Upload/UploadPanel'
import RoutePlanner from '../components/RoutePlanner/RoutePlanner'
import useReportsStore from '../store/reportsStore'
import useMapStore from '../store/mapStore'

export default function Home() {
  const { loadReports, reports, loading } = useReportsStore()
  const { uploadPanelOpen, routePlannerOpen, setUploadPanelOpen, setRoutePlannerOpen } = useMapStore()

  useEffect(() => {
    loadReports()
  }, [])

  return (
    <div className="fixed inset-0 pt-14 md:pt-14 pb-12 md:pb-0 flex flex-col">
      <div className="relative flex-1 flex overflow-hidden">

        {/* ── LEFT SIDEBAR: Upload panel ── */}
        <AnimatePresence>
          {uploadPanelOpen && (
            <div className="absolute left-0 top-0 bottom-0 z-[500] w-72 shadow-2xl overflow-y-auto">
              <UploadPanel />
            </div>
          )}
        </AnimatePresence>

        {/* ── MAP (fills all remaining space) ── */}
        <div className="absolute inset-0">
          <MapView />
        </div>

        {/* ── FLOATING TOP-LEFT CONTROLS ── */}
        <div className="absolute top-3 left-3 z-[400] flex flex-col gap-2">
          {!uploadPanelOpen && (
            <button
              onClick={() => { setUploadPanelOpen(true); setRoutePlannerOpen(false) }}
              className="flex items-center gap-2 btn-primary text-xs py-2.5 px-3 shadow-lg shadow-brand-500/20"
            >
              <Upload size={14} />
              <span className="hidden sm:inline">Report Damage</span>
            </button>
          )}
          {!routePlannerOpen && (
            <button
              onClick={() => { setRoutePlannerOpen(true); setUploadPanelOpen(false) }}
              className="flex items-center gap-2 glass border border-road-border text-white text-xs py-2.5 px-3 rounded-lg hover:border-brand-500/50 transition-colors shadow-lg"
            >
              <Navigation size={14} className="text-brand-400" />
              <span className="hidden sm:inline">Plan Route</span>
            </button>
          )}
        </div>

        {/* ── FLOATING FILTER PANEL (bottom-left on desktop) ── */}
        <div className="absolute bottom-3 left-3 z-[400] hidden md:block">
          <MapFilters />
        </div>

        {/* ── FLOATING STATS BADGE ── */}
        <div className="absolute top-3 right-3 z-[400] glass rounded-lg px-3 py-2 flex items-center gap-2 text-xs font-mono">
          <MapPin size={12} className="text-brand-400" />
          <span className="text-white">
            {loading ? '…' : reports.length} report{reports.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── RIGHT SIDEBAR: Route planner ── */}
        <AnimatePresence>
          {routePlannerOpen && (
            <div className="absolute right-0 top-0 bottom-0 z-[500] w-80 shadow-2xl overflow-y-auto">
              <RoutePlanner />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
