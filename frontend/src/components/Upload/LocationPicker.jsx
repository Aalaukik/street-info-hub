import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { MapPin, Crosshair, Loader2 } from 'lucide-react'
import Modal from '../common/Modal'
import { INDIA_CENTER, INDIA_DEFAULT_ZOOM, isInIndia } from '../../utils/indiaBounds'
import toast from 'react-hot-toast'

const PIN_ICON = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 8.75 14 22 14 22S28 22.75 28 14C28 6.268 21.732 0 14 0z" fill="#f97f09"/>
    <circle cx="14" cy="14" r="6" fill="white"/>
  </svg>`,
  className: '',
  iconSize: [28, 36],
  iconAnchor: [14, 36],
})

function ClickHandler({ onPlace }) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng
      if (!isInIndia(lat, lng)) {
        toast.error('Please select a location within India')
        return
      }
      onPlace({ lat, lng })
    },
  })
  return null
}

export default function LocationPicker({ open, onClose, onConfirm, initialLocation }) {
  const [pin, setPin] = useState(initialLocation || null)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    if (open) setPin(initialLocation || null)
  }, [open])

  const useMyLocation = () => {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        if (!isInIndia(coords.lat, coords.lng)) {
          toast.error('Your location appears to be outside India')
          setLocating(false)
          return
        }
        setPin(coords)
        setLocating(false)
      },
      () => {
        toast.error('Could not get your location. Please tap on the map.')
        setLocating(false)
      },
      { timeout: 8000 },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Pin Your Location" width="max-w-xl">
      <div className="p-4 flex flex-col gap-3">
        <p className="text-xs text-road-muted font-body">
          Tap anywhere on the map to pin the damage location.
        </p>
        <button
          onClick={useMyLocation}
          disabled={locating}
          className="btn-ghost text-xs py-2 flex items-center gap-2 self-start"
        >
          {locating
            ? <Loader2 size={12} className="animate-spin" />
            : <Crosshair size={12} />}
          Use my current location
        </button>

        <div className="w-full h-[340px] rounded-xl overflow-hidden border border-road-border">
          <MapContainer
            center={pin ? [pin.lat, pin.lng] : INDIA_CENTER}
            zoom={pin ? 13 : INDIA_DEFAULT_ZOOM}
            className="w-full h-full"
            minZoom={4}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            <ClickHandler onPlace={setPin} />
            {pin && <Marker position={[pin.lat, pin.lng]} icon={PIN_ICON} />}
          </MapContainer>
        </div>

        {pin && (
          <div className="flex items-center gap-2 text-xs font-mono text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
            <MapPin size={12} />
            {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
          </div>
        )}

        <div className="flex gap-2 mt-1">
          <button onClick={onClose} className="btn-ghost text-sm py-2 flex-1">Cancel</button>
          <button
            onClick={() => pin && onConfirm(pin)}
            disabled={!pin}
            className="btn-primary text-sm py-2 flex-1"
          >
            Confirm Location
          </button>
        </div>
      </div>
    </Modal>
  )
}
