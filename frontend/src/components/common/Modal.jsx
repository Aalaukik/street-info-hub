import { useEffect } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            className={`relative w-full ${width} bg-road-card border border-road-border rounded-2xl shadow-2xl overflow-hidden`}
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-5 py-4 border-b border-road-border">
                <h2 className="font-display font-semibold text-base">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-road-border transition-colors text-road-muted hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="overflow-y-auto max-h-[80vh]">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
