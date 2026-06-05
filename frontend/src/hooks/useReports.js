import { useEffect, useCallback } from 'react'
import useReportsStore from '../store/reportsStore'

/**
 * Hook that ensures reports are loaded and provides
 * convenient refresh / filter utilities.
 */
export function useReports(autoLoad = true) {
  const {
    reports,
    loading,
    error,
    filters,
    setFilters,
    loadReports,
    addReport,
    selectedReport,
    setSelectedReport,
  } = useReportsStore()

  useEffect(() => {
    if (autoLoad && reports.length === 0) {
      loadReports()
    }
  }, [autoLoad])

  const refresh = useCallback(() => loadReports(), [])

  const applyFilter = useCallback(
    (key, value) => {
      setFilters({ [key]: value })
      loadReports()
    },
    [setFilters, loadReports],
  )

  const clearFilters = useCallback(() => {
    setFilters({ severity: null, damage_type: null, state: null })
    loadReports()
  }, [setFilters, loadReports])

  return {
    reports,
    loading,
    error,
    filters,
    refresh,
    applyFilter,
    clearFilters,
    addReport,
    selectedReport,
    setSelectedReport,
  }
}
