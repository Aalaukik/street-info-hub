import { useState } from 'react'
import { Shield, Check, X, Eye, Loader2 } from 'lucide-react'
import { fetchPendingReports, updateReportStatus } from '../../services/api'
import Badge from '../common/Badge'
import { getDamageLabel, DAMAGE_TYPE_ICONS } from '../../utils/severity'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

export default function AdminPanel() {
  const [token, setToken] = useState('')
  const [authed, setAuthed] = useState(false)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)

  const login = async () => {
    if (!token.trim()) return toast.error('Enter admin token')
    setLoading(true)
    try {
      const data = await fetchPendingReports(token.trim())
      setReports(data)
      setAuthed(true)
    } catch (e) {
      toast.error(e.response?.status === 403 ? 'Invalid admin token' : 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const action = async (id, status) => {
    setActionLoading(id + status)
    try {
      await updateReportStatus(id, status, null, token)
      setReports(prev => prev.filter(r => r.id !== id))
      toast.success(`Report marked as ${status}`)
    } catch {
      toast.error('Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  if (!authed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/15 flex items-center justify-center">
          <Shield size={22} className="text-brand-400" />
        </div>
        <div className="text-center">
          <h2 className="font-display font-bold text-xl">Admin Access</h2>
          <p className="text-road-muted text-sm mt-1">Enter your admin token to review pending reports</p>
        </div>
        <div className="flex gap-2 w-full max-w-sm">
          <input
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            placeholder="Admin token"
            className="flex-1 bg-road-dark border border-road-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-road-muted focus:outline-none focus:border-brand-500/60"
          />
          <button onClick={login} disabled={loading} className="btn-primary px-4">
            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Login'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl">Pending Reports</h2>
          <p className="text-road-muted text-sm">{reports.length} reports awaiting review</p>
        </div>
        <button onClick={() => { setAuthed(false); setToken('') }} className="btn-ghost text-xs py-1.5">
          Logout
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-road-muted font-mono text-sm">All reports have been reviewed ✓</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map(r => (
            <div key={r.id} className="card flex flex-col gap-3">
              {r.image_url && (
                <img src={r.image_url} alt="road" className="w-full h-36 object-cover rounded-lg border border-road-border" />
              )}
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(r.damage_types || []).map(t => (
                      <span key={t} className="text-xs text-white">
                        {DAMAGE_TYPE_ICONS[t]} {getDamageLabel(t)}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-road-muted font-mono">
                    📍 {r.city || r.state || 'India'}
                  </p>
                  <p className="text-[10px] text-road-muted font-mono">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Badge severity={r.severity} />
              </div>
              {r.description && (
                <p className="text-xs text-road-muted italic border-l-2 border-road-border pl-2">
                  "{r.description}"
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => action(r.id, 'verified')}
                  disabled={!!actionLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-mono hover:bg-green-500/25 transition-colors"
                >
                  {actionLoading === r.id + 'verified'
                    ? <Loader2 size={12} className="animate-spin" />
                    : <Check size={12} />}
                  Verify
                </button>
                <button
                  onClick={() => action(r.id, 'resolved')}
                  disabled={!!actionLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-road-border text-road-muted text-xs font-mono hover:text-white transition-colors"
                >
                  <Eye size={12} />
                  Resolved
                </button>
                <button
                  onClick={() => action(r.id, 'rejected')}
                  disabled={!!actionLoading}
                  className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs hover:bg-red-500/20 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
