import { useState, useEffect } from 'react'
import {
  Plus,
  Trash2,
  Clock,
  MapPin,
  IndianRupee,
  Users,
  Edit3,
  ExternalLink,
  Navigation,
  ChevronDown,
  ChevronUp,
  Sun,
  CloudSun,
  Calendar,
  X,
  Compass,
  Check,
  Route,
} from 'lucide-react'
import { api } from '../../services/api.js'

// Emoji presets for quick selection
const EMOJI_OPTIONS = [
  { icon: '☕', label: 'Breakfast / Cafe' },
  { icon: '🍜', label: 'Lunch / Dining' },
  { icon: '🤿', label: 'Scuba / Adventure' },
  { icon: '🌅', label: 'Sunset / View' },
  { icon: '🏖️', label: 'Beach' },
  { icon: '🏛️', label: 'Sightseeing' },
  { icon: '🏨', label: 'Hotel / Stay' },
  { icon: '🚗', label: 'Drive / Transit' },
  { icon: '🛍️', label: 'Shopping' },
  { icon: '🎵', label: 'Party / Music' },
  { icon: '🎯', label: 'Activity' },
]

// Destination weather helper
function getDestinationWeather(title = '') {
  const lower = title.toLowerCase()
  if (lower.includes('manali') || lower.includes('shimla') || lower.includes('kashmir') || lower.includes('ladakh')) {
    return { temp: '14°C', condition: 'Crisp & Mountain Air', icon: '🏔️' }
  }
  if (lower.includes('jaipur') || lower.includes('rajasthan') || lower.includes('udaipur')) {
    return { temp: '31°C', condition: 'Sunny & Warm', icon: '🌤️' }
  }
  if (lower.includes('kerala') || lower.includes('munnar')) {
    return { temp: '26°C', condition: 'Tropical & Lush', icon: '🌴' }
  }
  // Default Goa / beach / general
  return { temp: '29°C', condition: 'Sunny & Pleasant', icon: '☀️' }
}

export default function Itinerary({ tripId, trip }) {
  const [items, setItems] = useState([])
  const [expenses, setExpenses] = useState([])
  const [totalDays, setTotalDays] = useState(3)
  const [selectedDay, setSelectedDay] = useState(1)
  const [loading, setLoading] = useState(false)

  // Details drawer / expansion state
  const [expandedNotes, setExpandedNotes] = useState({})

  // Add / Edit Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  // Form states
  const [title, setTitle] = useState('')
  const [type, setType] = useState('activity')
  const [icon, setIcon] = useState('☕')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [duration, setDuration] = useState('')
  const [price, setPrice] = useState('')
  const [participants, setParticipants] = useState('All friends')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Load Itinerary and Expenses
  useEffect(() => {
    if (tripId) {
      loadData()
    }
  }, [tripId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [itineraryData, expensesData] = await Promise.all([
        api.getItinerary(tripId),
        api.getExpenses(tripId),
      ])

      if (Array.isArray(itineraryData)) {
        setItems(itineraryData)
        if (itineraryData.length > 0) {
          const maxDay = Math.max(...itineraryData.map((d) => d.day), 3)
          setTotalDays(maxDay)
        }
      }
      if (Array.isArray(expensesData)) {
        setExpenses(expensesData)
      }
    } catch (err) {
      console.error('Failed to load itinerary data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Open modal for Adding
  const handleOpenAddModal = (presetEmoji = null) => {
    setEditingItem(null)
    setTitle('')
    setType('activity')
    setIcon(presetEmoji || '☕')
    setTime('')
    setLocation('')
    setDuration('')
    setPrice('')
    setParticipants('All friends')
    setNotes('')
    setShowModal(true)
  }

  // Open modal for Editing
  const handleOpenEditModal = (item) => {
    setEditingItem(item)
    setTitle(item.title)
    setType(item.type || 'activity')
    setIcon(item.icon || '🎯')
    setTime(item.time || '')
    setLocation(item.location || '')
    setDuration(item.duration || '')
    setPrice(item.price ? item.price.toString() : '')
    setParticipants(item.participants || 'All friends')
    setNotes(item.notes || '')
    setShowModal(true)
  }

  // Submit Add or Edit
  const handleSubmitActivity = async (e) => {
    e.preventDefault()
    if (!title.trim() || submitting) return

    setSubmitting(true)
    const payload = {
      day: selectedDay,
      type,
      title: title.trim(),
      time: time.trim() || 'Flexible',
      location: location.trim(),
      duration: duration.trim(),
      price: price ? parseFloat(price) : 0,
      icon: icon || '🎯',
      participants: participants.trim() || 'All friends',
      notes: notes.trim(),
    }

    try {
      if (editingItem) {
        const updated = await api.updateItineraryItem(tripId, editingItem.id, payload)
        setItems((prev) => prev.map((item) => (item.id === editingItem.id ? updated : item)))
      } else {
        const saved = await api.addItineraryItem(tripId, payload)
        setItems((prev) => [...prev, saved])
      }
      setShowModal(false)
    } catch (err) {
      alert('Error saving activity: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Delete activity
  const handleDeleteItem = async (id, e) => {
    e.stopPropagation()
    if (confirm('Delete this planned activity?')) {
      try {
        await api.deleteItineraryItem(tripId, id)
        setItems((prev) => prev.filter((item) => item.id !== id))
      } catch (err) {
        alert('Error deleting activity')
      }
    }
  }

  // Toggle notes accordion
  const toggleNotes = (id) => {
    setExpandedNotes((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Filter items for selected day and sort chronologically
  const currentDayItems = items
    .filter((item) => item.day === selectedDay)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))

  // Calculate day stats
  const dayEstimatedCost = currentDayItems.reduce((acc, curr) => acc + (curr.price || 0), 0)

  // Budget calculations for right overview
  const totalBudget = parseFloat(trip?.budget || 0)
  const totalSpent = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)
  const budgetProgress = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0

  // Mini map query: first activity with a location, or trip destination
  const firstLocation = currentDayItems.find((i) => i.location)?.location
  const miniMapQuery = firstLocation
    ? `${firstLocation}, ${trip?.title || ''}`
    : trip?.title || 'Goa, India'

  // Weather data
  const weather = getDestinationWeather(trip?.title)

  // Helper: Format Day Date (e.g. Day 1 · Oct 10)
  const getDayLabel = (dayNum) => {
    if (trip?.dates) {
      return `Day ${dayNum}`
    }
    return `Day ${dayNum}`
  }

  return (
    <div className="space-y-6">
      {/* 1. Day Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
          const count = items.filter((item) => item.day === day).length
          const isSelected = selectedDay === day

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition whitespace-nowrap ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{getDayLabel(day)}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}

        <button
          onClick={() => {
            const nextDay = totalDays + 1
            setTotalDays(nextDay)
            setSelectedDay(nextDay)
          }}
          className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition whitespace-nowrap"
        >
          <Plus size={15} /> Add Day
        </button>
      </div>

      {/* 2. Main Two-Column Layout (Timeline on Left, Trip Overview on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Itinerary Timeline (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Day Header Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-widest uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                  DAY {selectedDay} {trip?.dates ? `· ${trip.dates}` : ''}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mt-1.5">
                Day {selectedDay} Timeline
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentDayItems.length} activities planned
                {dayEstimatedCost > 0 && ` · ₹${dayEstimatedCost.toLocaleString('en-IN')} estimated`}
              </p>
            </div>

            <button
              onClick={() => handleOpenAddModal()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-sm self-start sm:self-auto"
            >
              <Plus size={16} />
              Add Activity
            </button>
          </div>

          {/* Vertical Timeline Feed */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">
              Loading Day {selectedDay} schedule...
            </div>
          ) : currentDayItems.length === 0 ? (
            /* Empty State with Quick Starter Ideas */
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-xl">
                🗓️
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">No activities on Day {selectedDay} yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Start mapping out your day! Add breakfast spots, scuba diving, sightseeing, or evening sunsets.
                </p>
              </div>

              {/* Quick starter buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => handleOpenAddModal('☕')}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition"
                >
                  ☕ Add Breakfast
                </button>
                <button
                  onClick={() => handleOpenAddModal('🤿')}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition"
                >
                  🤿 Add Adventure
                </button>
                <button
                  onClick={() => handleOpenAddModal('🍜')}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition"
                >
                  🍜 Add Lunch / Dining
                </button>
                <button
                  onClick={() => handleOpenAddModal('🌅')}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition"
                >
                  🌅 Add Sunset
                </button>
              </div>
            </div>
          ) : (
            /* Vertical Timeline Container */
            <div className="relative pl-4 sm:pl-28 py-2">
              {/* Continuous Vertical Timeline Line */}
              <div className="absolute left-[27px] sm:left-[108px] top-6 bottom-6 w-0.5 bg-indigo-200 dark:bg-indigo-900" />

              <div className="space-y-6">
                {currentDayItems.map((item, index) => {
                  const isLast = index === currentDayItems.length - 1
                  const isNotesOpen = expandedNotes[item.id]

                  return (
                    <div key={item.id} className="relative flex items-start group">
                      {/* 1. Time Badge (Prominent on Left for Desktop) */}
                      <div className="hidden sm:flex flex-col items-end w-20 shrink-0 pr-4 mt-2">
                        <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300">
                          {item.time || '--:--'}
                        </span>
                        {item.duration && (
                          <span className="text-[10px] text-indigo-500 font-semibold">{item.duration}</span>
                        )}
                      </div>

                      {/* 2. Timeline Marker Node (●──) */}
                      <div className="relative z-10 flex items-center shrink-0 mt-1">
                        <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 flex items-center justify-center text-sm shadow-xs group-hover:scale-110 group-hover:bg-indigo-50 transition">
                          <span>{item.icon || '🎯'}</span>
                        </div>
                        {/* Horizontal connector line */}
                        <div className="w-3.5 h-0.5 bg-indigo-200 dark:bg-indigo-900 shrink-0" />
                      </div>

                      {/* 3. Attractive Activity Card */}
                      <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-indigo-300 transition ml-1 space-y-3">
                        {/* Card Header: Icon, Title, Actions */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Mobile-only time indicator */}
                            <div className="sm:hidden flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                {item.time || 'Flexible'}
                              </span>
                              {item.duration && (
                                <span className="text-[10px] text-indigo-500 font-semibold">· {item.duration}</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-bold text-slate-800 leading-snug">
                                {item.title}
                              </h3>
                              {item.type && (
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60">
                                  {item.type}
                                </span>
                              )}
                            </div>

                            {/* Location */}
                            {item.location && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                                <MapPin size={13} className="text-indigo-500 shrink-0" />
                                <span className="font-medium truncate">{item.location}</span>
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                    item.location
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-400 hover:text-indigo-600 p-0.5 transition shrink-0"
                                  title="View on Google Maps"
                                >
                                  <ExternalLink size={12} />
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons: Edit, Delete */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Edit Activity"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={(e) => handleDeleteItem(item.id, e)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                              title="Delete Activity"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Card Metadata Chips (Duration, Price, Participants) */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                          {item.duration && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-medium">
                              <Clock size={12} className="text-indigo-500" />
                              {item.duration}
                            </span>
                          )}

                          {item.price > 0 ? (
                            <span className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold">
                              <span>₹</span>
                              {item.price.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-900/60 text-teal-700 dark:text-teal-300 font-semibold">
                              Free
                            </span>
                          )}

                          {item.participants && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-900/60 text-purple-700 dark:text-purple-300 font-medium">
                              <Users size={12} className="text-purple-500" />
                              {item.participants}
                            </span>
                          )}
                        </div>

                        {/* Notes Accordion / Details */}
                        {item.notes && (
                          <div className="pt-2 border-t border-indigo-100/60 dark:border-indigo-950">
                            <button
                              onClick={() => toggleNotes(item.id)}
                              className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition"
                            >
                              <span>{isNotesOpen ? 'Hide Details' : 'View Details & Notes'}</span>
                              {isNotesOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>

                            {isNotesOpen && (
                              <p className="text-xs text-slate-700 dark:text-slate-200 bg-indigo-50/50 dark:bg-[#121B35] rounded-xl p-3 mt-2 leading-relaxed whitespace-pre-wrap border border-indigo-100 dark:border-indigo-950/80">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Trip Overview Card (4 Cols on Desktop) */}
        <div className="lg:col-span-4 sticky top-24 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
            {/* Header */}
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-slate-400">
                TRIP OVERVIEW
              </span>
              <div className="flex items-center justify-between mt-1">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span>🌴</span>
                  <span>{trip?.title || 'Trip'}</span>
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                <span>📅 {trip?.dates || 'Dates TBD'}</span>
                <span>·</span>
                <span>👥 {trip?.members?.length || 1} friends</span>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Budget & Spend Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <span>💰</span> Budget Spend
                </span>
                <span className="font-mono font-bold text-slate-800">
                  ₹{totalSpent.toLocaleString('en-IN')}{' '}
                  <span className="font-normal text-slate-400">
                    / ₹{totalBudget.toLocaleString('en-IN')}
                  </span>
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    budgetProgress > 95
                      ? 'bg-red-500'
                      : budgetProgress > 75
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${budgetProgress}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                <span>{budgetProgress}% used</span>
                {totalBudget > totalSpent ? (
                  <span className="text-emerald-600 font-medium">
                    ₹{(totalBudget - totalSpent).toLocaleString('en-IN')} remaining
                  </span>
                ) : (
                  <span className="text-red-500 font-medium">
                    Exceeded by ₹{(totalSpent - totalBudget).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>

            <hr className="border-indigo-100/70 dark:border-indigo-950" />

            {/* Today's Locations Mini Map */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <span>📍</span> Today's Locations
                </span>
                <span className="text-[11px] text-indigo-600 font-medium">
                  {currentDayItems.filter((i) => i.location).length} spots
                </span>
              </div>

              {/* Mini Map Iframe */}
              <div className="relative w-full h-36 rounded-xl overflow-hidden border border-indigo-100 dark:border-indigo-900 bg-indigo-50/30 shadow-2xs">
                <iframe
                  title="Today's Locations Mini Map"
                  className="w-full h-full border-0"
                  loading="lazy"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(
                    miniMapQuery
                  )}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                />
              </div>

              {/* Quick stops list */}
              {currentDayItems.filter((i) => i.location).length > 0 && (
                <div className="space-y-1 pt-1">
                  {currentDayItems
                    .filter((i) => i.location)
                    .slice(0, 3)
                    .map((item, idx) => (
                      <div
                        key={item.id}
                        className="text-xs text-slate-600 flex items-center gap-1.5 truncate"
                      >
                        <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate">{item.location}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <hr className="border-indigo-100/70 dark:border-indigo-950" />

            {/* Weather & Activity Count */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-amber-50/60 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/60">
                <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 font-semibold">
                  <span>{weather.icon}</span> Weather
                </div>
                <p className="text-base font-bold text-slate-800 mt-1">{weather.temp}</p>
                <p className="text-[10px] text-amber-600/90 dark:text-amber-400 truncate">{weather.condition}</p>
              </div>

              <div className="bg-indigo-50/60 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-200/60 dark:border-indigo-900/60">
                <div className="flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 font-semibold">
                  <span>🎯</span> Planned
                </div>
                <p className="text-base font-bold text-slate-800 mt-1">
                  {currentDayItems.length}{' '}
                  <span className="text-xs font-normal text-indigo-600 dark:text-indigo-400">today</span>
                </p>
                <p className="text-[10px] text-indigo-600/80 dark:text-indigo-400 truncate">
                  {items.length} total in trip
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MODAL: ADD / EDIT ACTIVITY */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <span>{icon || '🎯'}</span>
                <span>{editingItem ? 'Edit Activity' : `Add Plan to Day ${selectedDay}`}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitActivity} className="space-y-4 text-xs">
              {/* Emoji Picker Row */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Activity Icon</label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {EMOJI_OPTIONS.map((opt) => (
                    <button
                      key={opt.icon}
                      type="button"
                      onClick={() => setIcon(opt.icon)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition shrink-0 ${
                        icon === opt.icon
                          ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/20'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                      title={opt.label}
                    >
                      {opt.icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Activity Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Scuba Diving, Breakfast at Cafe Lilliput, Sunset Point"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Time and Duration Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Time (24h or AM/PM)</label>
                  <input
                    type="text"
                    placeholder="e.g. 09:00, 11:30 AM"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 2 hrs, 45 mins"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Location / Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grande Island, Café near Baga, Vagator Beach"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Price and Participants Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estimated Price (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 2500 (0 for free)"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Participants</label>
                  <input
                    type="text"
                    placeholder="e.g. All friends, Ankita & Alex"
                    value={participants}
                    onChange={(e) => setParticipants(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes / Details */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notes & Details (Optional)
                </label>
                <textarea
                  placeholder="e.g. Carry waterproof camera, entry ticket ₹100, reach 15 min early"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-semibold transition"
                >
                  {submitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
