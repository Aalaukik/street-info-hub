import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import MapView from '../components/Map/MapView'
import RoutePlanner from '../components/RoutePlanner/RoutePlanner'
import useReportsStore from '../store/reportsStore'
import useMapStore from '../store/mapStore'

export default function RoutePlannerPage() {
  const { loadReports } = useReportsStore()
  const { setRoutePlannerOpen } = useMapStore()

  useEffect(() => {
    loadReports()
    setRoutePlannerOpen(true)
    return () => setRoutePlannerOpen(false)
  }, [])

  return (
    <div className="fixed inset-0 pt-14 md:pt-14 pb-12 md:pb-0 flex flex-col">
      <div className="relative flex-1 flex overflow-hidden">
        <div className="absolute inset-0">
          <MapView />
        </div>
        <div className="absolute right-0 top-0 bottom-0 z-[500] w-80 shadow-2xl overflow-y-auto">
          <RoutePlanner />
        </div>
      </div>
    </div>
  )
}
