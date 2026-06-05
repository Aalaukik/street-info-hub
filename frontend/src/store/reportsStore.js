import { create } from 'zustand'
import { fetchReports } from '../services/api'

const useReportsStore = create((set, get) => ({
  reports: [],
  loading: false,
  error: null,
  filters: {
    status: 'verified',
    severity: null,
    damage_type: null,
    state: null,
  },
  selectedReport: null,

  setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),

  loadReports: async () => {
    set({ loading: true, error: null })
    try {
      const { filters } = get()
      const params = {}
      if (filters.status)      params.status      = filters.status
      if (filters.severity)    params.severity    = filters.severity
      if (filters.damage_type) params.damage_type = filters.damage_type
      if (filters.state)       params.state       = filters.state
      const data = await fetchReports(params)
      set({ reports: data.reports, loading: false })
    } catch (e) {
      set({ error: e.message, loading: false })
    }
  },

  addReport: (report) => {
    set((state) => ({
      reports: [report, ...state.reports],
    }))
  },

  setSelectedReport: (report) => set({ selectedReport: report }),
}))

export default useReportsStore
