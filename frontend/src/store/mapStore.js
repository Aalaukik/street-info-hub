import { create } from 'zustand'
import { INDIA_CENTER, INDIA_DEFAULT_ZOOM } from '../utils/indiaBounds'

const useMapStore = create((set) => ({
  center: INDIA_CENTER,
  zoom: INDIA_DEFAULT_ZOOM,
  showHeatmap: false,
  activeLayer: 'markers',   // 'markers' | 'heatmap'
  uploadPanelOpen: false,
  routePlannerOpen: false,
  selectedPin: null,
  routeData: null,
  activeRouteId: null,

  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  toggleHeatmap: () =>
    set((s) => ({
      showHeatmap: !s.showHeatmap,
      activeLayer: !s.showHeatmap ? 'heatmap' : 'markers',
    })),
  setUploadPanelOpen: (v) => set({ uploadPanelOpen: v }),
  setRoutePlannerOpen: (v) => set({ routePlannerOpen: v }),
  setSelectedPin: (pin) => set({ selectedPin: pin }),
  setRouteData: (data) => set({ routeData: data }),
  setActiveRoute: (id) => set({ activeRouteId: id }),
  clearRoute: () => set({ routeData: null, activeRouteId: null }),
}))

export default useMapStore
