import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 30000,
})

// ── Reports ──────────────────────────────────────────
export async function fetchReports(params = {}) {
  const { data } = await api.get('/reports', { params })
  return data
}

export async function fetchReport(id) {
  const { data } = await api.get(`/reports/${id}`)
  return data
}

// ── Upload ───────────────────────────────────────────
export async function uploadImage({ file, latitude, longitude, description }, onProgress) {
  const form = new FormData()
  form.append('image', file)
  if (latitude != null)  form.append('latitude',    latitude)
  if (longitude != null) form.append('longitude',   longitude)
  if (description)       form.append('description', description)

  const { data } = await api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total))
      }
    },
  })
  return data
}

// ── Route planner ────────────────────────────────────
export async function planRoute({ origin, destination, mode = 'driving-car' }) {
  const { data } = await api.post('/route/plan', { origin, destination, mode })
  return data
}

// ── Stats ────────────────────────────────────────────
export async function fetchSummaryStats() {
  const { data } = await api.get('/stats/summary')
  return data
}

export async function fetchStatsByState() {
  const { data } = await api.get('/stats/by-state')
  return data.data
}

export async function fetchStatsByType() {
  const { data } = await api.get('/stats/by-type')
  return data.data
}

export async function fetchRecentReports() {
  const { data } = await api.get('/stats/recent')
  return data.data
}

// ── Admin ────────────────────────────────────────────
export async function fetchPendingReports(adminToken) {
  const { data } = await api.get('/admin/reports/pending', {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  return data.reports
}

export async function updateReportStatus(id, status, notes, adminToken) {
  const { data } = await api.patch(
    `/admin/reports/${id}`,
    { status, admin_notes: notes },
    { headers: { Authorization: `Bearer ${adminToken}` } },
  )
  return data
}

export default api
