import { useState, useEffect } from 'react'
import {
  MapPin,
  Navigation,
  Compass,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Circle,
  Route,
  Search,
  X,
  Layers,
} from 'lucide-react'
import { api } from '../../services/api.js'

const CATEGORIES = [
  { key: 'All', label: 'All Places', icon: '📍' },
  { key: 'Sightseeing', label: 'Sightseeing', icon: '🏛️' },
  { key: 'Beach', label: 'Beach', icon: '🏖️' },
  { key: 'Food & Cafe', label: 'Food & Cafe', icon: '☕' },
  { key: 'Stay', label: 'Stay / Hotel', icon: '🏨' },
  { key: 'Route Stop', label: 'Route Stop', icon: '🚗' },
  { key: 'Nature & Trek', label: 'Nature & Trek', icon: '🏔️' },
]

export default function Maps({ tripId, tripTitle }) {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Sightseeing')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (tripId) {
      loadLocations()
    }
  }, [tripId])

  const loadLocations = async () => {
    setLoading(true)
    try {
      const data = await api.getLocations(tripId)
      if (Array.isArray(data)) {
        setLocations(data)
        if (data.length > 0 && !selectedLocation) {
          setSelectedLocation(data[0])
        }
      }
    } catch (err) {
      console.error('Failed to load trip locations:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddLocation = async (e) => {
    e.preventDefault()
    if (!name.trim() || submitting) return
    setSubmitting(true)
    try {
      const newLoc = await api.addLocation(tripId, {
        name: name.trim(),
        category,
        address: address.trim(),
        notes: notes.trim(),
      })
      setLocations((prev) => [...prev, newLoc])
      setSelectedLocation(newLoc)
      setName('')
      setAddress('')
      setNotes('')
      setShowAddModal(false)
    } catch (err) {
      alert('Error adding location: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleVisited = async (loc) => {
    try {
      const updated = await api.toggleLocationVisited(tripId, loc.id, !loc.isVisited)
      setLocations((prev) => prev.map((item) => (item.id === loc.id ? updated : item)))
      if (selectedLocation?.id === loc.id) {
        setSelectedLocation(updated)
      }
    } catch (err) {
      alert('Error updating status: ' + err.message)
    }
  }

  const handleDeleteLocation = async (locId, e) => {
    e.stopPropagation()
    if (confirm('Delete this saved location?')) {
      try {
        await api.deleteLocation(tripId, locId)
        const updated = locations.filter((l) => l.id !== locId)
        setLocations(updated)
        if (selectedLocation?.id === locId) {
          setSelectedLocation(updated[0] || null)
        }
      } catch (err) {
        alert('Error deleting location: ' + err.message)
      }
    }
  }

  // Filtered locations
  const filteredLocations = locations.filter((loc) => {
    const matchesCategory = activeCategory === 'All' || loc.category === activeCategory
    const matchesSearch =
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (loc.address && loc.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (loc.notes && loc.notes.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  // Build Multi-Stop Route URL for Google Maps
  const getFullRouteUrl = () => {
    if (locations.length === 0) return null
    if (locations.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        locations[0].address || locations[0].name
      )}`
    }
    const origin = encodeURIComponent(locations[0].address || locations[0].name)
    const destination = encodeURIComponent(
      locations[locations.length - 1].address || locations[locations.length - 1].name
    )
    const waypoints = locations
      .slice(1, -1)
      .map((l) => encodeURIComponent(l.address || l.name))
      .join('|')

    return waypoints
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}`
      : `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`
  }

  // Active query for the map preview
  const mapQuery = selectedLocation
    ? selectedLocation.address || `${selectedLocation.name}, ${tripTitle || ''}`
    : tripTitle || 'India'

  const visitedCount = locations.filter((l) => l.isVisited).length

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Compass className="text-indigo-600" size={20} />
            Trip Maps & Route Planner
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Save spots, navigate with Google Maps, and plan your group travel itinerary routes
          </p>
        </div>

        <div className="flex items-center gap-3">
          {locations.length > 1 && (
            <a
              href={getFullRouteUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition shadow-2xs"
            >
              <Route size={15} />
              Open Multi-Stop Route
            </a>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-2xs"
          >
            <Plus size={16} />
            Add Spot
          </button>
        </div>
      </div>

      {/* Progress & Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Saved Places</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{locations.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Visited</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{visitedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Remaining to Visit</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{locations.length - visitedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Navigation Route</p>
          <p className="text-sm font-semibold text-indigo-600 mt-2 flex items-center gap-1">
            <Route size={14} /> {locations.length > 1 ? 'Route Active' : 'Add 2+ spots'}
          </p>
        </div>
      </div>

      {/* Main Content: Split Grid with Places List & Live Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Places List (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filters & Search */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search saved places, address, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition whitespace-nowrap flex items-center gap-1 ${
                    activeCategory === cat.key
                      ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Places Cards */}
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
              Loading places...
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
              <MapPin size={32} className="mx-auto text-slate-300 mb-2" />
              <h4 className="font-semibold text-slate-700 text-sm">No saved places found</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Add beaches, cafes, viewpoints, or route stops to explore together!
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition"
              >
                + Add First Place
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLocations.map((loc, idx) => {
                const isSelected = selectedLocation?.id === loc.id
                const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                  loc.address || loc.name
                )}`

                return (
                  <div
                    key={loc.id}
                    onClick={() => setSelectedLocation(loc)}
                    className={`bg-white rounded-xl border transition p-4 cursor-pointer relative ${
                      isSelected
                        ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        {/* Number Index / Visited Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleVisited(loc)
                          }}
                          className="mt-0.5 text-slate-400 hover:text-emerald-600 transition"
                          title={loc.isVisited ? 'Mark as Unvisited' : 'Mark as Visited'}
                        >
                          {loc.isVisited ? (
                            <CheckCircle2 size={18} className="text-emerald-600 fill-emerald-50" />
                          ) : (
                            <Circle size={18} />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-400 font-mono">
                              #{idx + 1}
                            </span>
                            <h4
                              className={`text-sm font-semibold truncate ${
                                loc.isVisited ? 'line-through text-slate-400' : 'text-slate-800'
                              }`}
                            >
                              {loc.name}
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                              {loc.category}
                            </span>
                          </div>

                          {loc.address && (
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <MapPin size={12} className="shrink-0 text-slate-400" />
                              <span className="truncate">{loc.address}</span>
                            </p>
                          )}

                          {loc.notes && (
                            <p className="text-xs text-slate-600 bg-amber-50/60 border border-amber-100/80 rounded-lg p-2 mt-2 leading-relaxed">
                              💡 {loc.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={directionsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Open Google Maps Directions"
                        >
                          <Navigation size={15} />
                        </a>
                        <button
                          onClick={(e) => handleDeleteLocation(loc.id, e)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Delete Place"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Live Map Preview (5 Cols) */}
        <div className="lg:col-span-5 sticky top-24 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {/* Map Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-indigo-600" />
                <span className="text-xs font-bold text-slate-700">
                  {selectedLocation ? selectedLocation.name : tripTitle || 'Trip Location'}
                </span>
              </div>

              {selectedLocation && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    selectedLocation.address || selectedLocation.name
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  <span>Google Maps</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>

            {/* Embedded Interactive Map */}
            <div className="relative w-full h-[380px] bg-slate-100">
              <iframe
                title="Trip Location Map"
                className="w-full h-full border-0"
                loading="lazy"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(
                  mapQuery
                )}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                allowFullScreen
              />
            </div>

            {/* Map Details Footer */}
            {selectedLocation && (
              <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Focused: </span>
                  <strong className="text-slate-800">{selectedLocation.name}</strong>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                    selectedLocation.address || selectedLocation.name
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
                >
                  <Navigation size={13} />
                  Get Directions
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: ADD SPOT */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <MapPin className="text-indigo-600" size={18} />
                Add New Place or Route Stop
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddLocation} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Place Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Baga Beach, Thalassa Cafe, Chapora Fort"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                >
                  <option value="Sightseeing">🏛️ Sightseeing</option>
                  <option value="Beach">🏖️ Beach</option>
                  <option value="Food & Cafe">☕ Food & Cafe</option>
                  <option value="Stay">🏨 Stay / Hotel</option>
                  <option value="Route Stop">🚗 Route Stop / Transit</option>
                  <option value="Nature & Trek">🏔️ Nature & Trek</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Address / City / Landmark (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. North Goa, Goa 403516"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tips & Notes for Group (Optional)
                </label>
                <textarea
                  placeholder="e.g. Sunset view at 6 PM, parking available, entry fee ₹50"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-semibold transition"
                >
                  {submitting ? 'Adding...' : 'Add Place'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
