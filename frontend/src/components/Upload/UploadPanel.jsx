import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, MapPin, X, CheckCircle, AlertTriangle, Loader2, Camera, ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadImage } from '../../services/api'
import useMapStore from '../../store/mapStore'
import useReportsStore from '../../store/reportsStore'
import Badge from '../common/Badge'
import { getDamageLabel, DAMAGE_TYPE_ICONS } from '../../utils/severity'
import LocationPicker from './LocationPicker'

const STEPS = { IDLE: 'idle', UPLOADING: 'uploading', RESULT: 'result', ERROR: 'error' }

export default function UploadPanel() {
  const { setUploadPanelOpen } = useMapStore()
  const { addReport, loadReports } = useReportsStore()

  const [step, setStep] = useState(STEPS.IDLE)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [location, setLocation] = useState(null)
  const [description, setDescription] = useState('')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [showLocationPicker, setShowLocationPicker] = useState(false)

  const onDrop = useCallback((accepted) => {
    const f = accepted[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setStep(STEPS.IDLE)
    setResult(null)
    setError(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    onDropRejected: (files) => {
      const err = files[0]?.errors[0]
      toast.error(err?.code === 'file-too-large' ? 'Image must be under 10MB' : 'Only JPG, PNG, WEBP allowed')
    },
  })

  const handleSubmit = async () => {
    if (!file) return toast.error('Please select an image')
    if (!location) return toast.error('Please set your location on the map')

    setStep(STEPS.UPLOADING)
    setProgress(0)
    setError(null)

    try {
      const res = await uploadImage(
        { file, latitude: location.lat, longitude: location.lng, description },
        setProgress,
      )
      setResult(res)
      setStep(STEPS.RESULT)
      // Optimistically add to map (pending status, will show after refresh)
      loadReports()
      toast.success('Report submitted!')
    } catch (e) {
      const msg = e.response?.data?.detail
      const detail = typeof msg === 'object' ? msg.message : (msg || 'Upload failed. Please try again.')
      setError(detail)
      setStep(STEPS.ERROR)
    }
  }

  const reset = () => {
    setStep(STEPS.IDLE)
    setFile(null)
    setPreview(null)
    setLocation(null)
    setDescription('')
    setProgress(0)
    setResult(null)
    setError(null)
  }

  return (
    <motion.div
      className="flex flex-col h-full bg-road-card overflow-y-auto"
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-road-border sticky top-0 bg-road-card z-10">
        <div>
          <h2 className="font-display font-semibold text-sm">Report Damage</h2>
          <p className="text-[10px] text-road-muted font-mono mt-0.5">Upload a road photo for AI analysis</p>
        </div>
        <button
          onClick={() => setUploadPanelOpen(false)}
          className="p-1.5 rounded-lg hover:bg-road-border text-road-muted hover:text-white transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <AnimatePresence mode="wait">
          {/* ── RESULT VIEW ── */}
          {step === STEPS.RESULT && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle size={18} />
                <span className="font-display font-semibold text-sm">Analysis Complete</span>
              </div>

              {result.image_url && (
                <img
                  src={result.image_url}
                  alt="Submitted road"
                  className="w-full h-36 object-cover rounded-xl border border-road-border"
                />
              )}

              <div className="card flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-road-muted">Severity</span>
                  <Badge severity={result.severity} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-road-muted">Damage Type(s)</span>
                  <span className="text-xs text-white font-mono">
                    {result.damage_types?.length
                      ? result.damage_types.map(t => `${DAMAGE_TYPE_ICONS[t] || ''} ${getDamageLabel(t)}`).join(', ')
                      : 'None detected'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-road-muted">AI Confidence</span>
                  <span className="text-xs font-mono text-brand-400">{Math.round(result.confidence * 100)}%</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs text-road-muted shrink-0">Location</span>
                  <span className="text-xs text-white text-right font-mono leading-relaxed">
                    {result.location?.address
                      ? result.location.address.split(',').slice(0, 2).join(',')
                      : `${result.location?.latitude?.toFixed(4)}, ${result.location?.longitude?.toFixed(4)}`}
                  </span>
                </div>
              </div>

              <p className="text-xs text-road-muted bg-road-dark rounded-lg px-3 py-2 border border-road-border">
                {result.message}
              </p>

              <button onClick={reset} className="btn-primary text-sm py-2.5">
                Report Another
              </button>
            </motion.div>
          )}

          {/* ── ERROR VIEW ── */}
          {step === STEPS.ERROR && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
              <button onClick={() => setStep(STEPS.IDLE)} className="btn-ghost text-sm py-2">
                Try Again
              </button>
            </motion.div>
          )}

          {/* ── UPLOAD FORM ── */}
          {(step === STEPS.IDLE || step === STEPS.UPLOADING) && (
            <motion.div key="form" className="flex flex-col gap-4">
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-xl transition-all cursor-pointer
                  flex flex-col items-center justify-center min-h-[140px] p-4
                  ${isDragActive
                    ? 'border-brand-500 bg-brand-500/10'
                    : preview
                      ? 'border-road-border p-0 overflow-hidden'
                      : 'border-road-border hover:border-brand-500/50 hover:bg-brand-500/5'}
                `}
              >
                <input {...getInputProps()} />
                {preview ? (
                  <div className="relative w-full">
                    <img src={preview} alt="preview" className="w-full h-44 object-cover rounded-xl" />
                    <button
                      onClick={(e) => { e.stopPropagation(); reset() }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center mb-2">
                      {isDragActive ? <Upload size={20} className="text-brand-400" /> : <Camera size={20} className="text-brand-400" />}
                    </div>
                    <p className="text-sm font-body text-white text-center">
                      {isDragActive ? 'Drop the image here' : 'Drag photo or click to select'}
                    </p>
                    <p className="text-[10px] text-road-muted mt-1 font-mono">JPG · PNG · WEBP · Max 10MB</p>
                  </>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="text-[10px] font-mono text-road-muted uppercase tracking-widest block mb-2">
                  Location *
                </label>
                <button
                  onClick={() => setShowLocationPicker(true)}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all text-sm
                    ${location
                      ? 'border-green-500/40 bg-green-500/10 text-green-300'
                      : 'border-road-border text-road-muted hover:border-brand-500/50 hover:text-white'}
                  `}
                >
                  <MapPin size={14} />
                  {location
                    ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                    : 'Pin location on map'}
                </button>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-mono text-road-muted uppercase tracking-widest block mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Large pothole near bus stop, very dangerous at night…"
                  rows={3}
                  className="w-full bg-road-dark border border-road-border rounded-lg px-3 py-2 text-xs text-white placeholder:text-road-muted resize-none focus:outline-none focus:border-brand-500/60 transition-colors"
                />
              </div>

              {/* Submit */}
              {step === STEPS.UPLOADING ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm text-road-muted">
                    <Loader2 size={14} className="animate-spin text-brand-400" />
                    <span className="font-mono text-xs">Analyzing with AI… {progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-road-border overflow-hidden">
                    <div
                      className="h-full bg-brand-500 transition-all duration-300 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!file || !location}
                  className="btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
                >
                  <Upload size={15} />
                  Analyse & Submit Report
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Location picker modal */}
      <LocationPicker
        open={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onConfirm={(coords) => { setLocation(coords); setShowLocationPicker(false) }}
        initialLocation={location}
      />
    </motion.div>
  )
}
