import { useState, useEffect } from 'react'
import { Plus, Trash2, Clock, Bed, Utensils, Compass } from 'lucide-react'
import { api } from '../../services/api.js'

export default function Itinerary({ tripId }) {
  const [totalDays, setTotalDays] = useState(3)
  const [selectedDay, setSelectedDay] = useState(1)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  // Form states for new activity
  const [type, setType] = useState('activity') // 'activity' | 'hotel' | 'restaurant'
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  // Load from PostgreSQL
  useEffect(() => {
    if (tripId) {
      loadItinerary()
    }
  }, [tripId])

  const loadItinerary = async () => {
    setLoading(true)
    try {
      const data = await api.getItinerary(tripId)
      setItems(data)
      // Determine max days if any items exist
      if (data.length > 0) {
        const maxDay = Math.max(...data.map((d) => d.day), 3)
        setTotalDays(maxDay)
      }
    } catch (err) {
      console.error('Failed to load itinerary from PostgreSQL:', err)
    } finally {
      setLoading(false)
    }
  }

  // 1. Add new item
  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!title.trim()) return

    const newItem = {
      day: selectedDay,
      type,
      title: title.trim(),
      time: time || 'Flexible',
      notes: notes.trim(),
    }

    try {
      const saved = await api.addItineraryItem(tripId, newItem)
      setItems([...items, saved])
      setTitle('')
      setTime('')
      setNotes('')
      setShowAddForm(false)
    } catch (err) {
      alert('Error saving plan to database')
    }
  }

  // 2. Delete item
  const handleDeleteItem = async (id) => {
    try {
      await api.deleteItineraryItem(tripId, id)
      setItems(items.filter((item) => item.id !== id))
    } catch (err) {
      alert('Error deleting plan')
    }
  }

  // Filter items for currently selected day
  const currentDayItems = items.filter((item) => item.day === selectedDay)

  // Helper for category badge & icon
  const getCategoryDetails = (catType) => {
    switch (catType) {
      case 'hotel':
        return {
          label: 'Hotel / Stay',
          icon: <Bed size={16} className="text-amber-600" />,
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        }
      case 'restaurant':
        return {
          label: 'Restaurant / Food',
          icon: <Utensils size={16} className="text-emerald-600" />,
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        }
      default:
        return {
          label: 'Activity',
          icon: <Compass size={16} className="text-indigo-600" />,
          badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        }
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Day Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition whitespace-nowrap ${
              selectedDay === day
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Day {day}
          </button>
        ))}

        <button
          onClick={() => {
            const nextDay = totalDays + 1
            setTotalDays(nextDay)
            setSelectedDay(nextDay)
          }}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition whitespace-nowrap"
        >
          <Plus size={16} /> Add Day
        </button>
      </div>

      {/* 2. Header & Add Item Action */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">
          Day {selectedDay} Schedule
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          <Plus size={16} />
          {showAddForm ? 'Cancel' : 'Add Plan'}
        </button>
      </div>

      {/* 3. Add Item Form */}
      {showAddForm && (
        <form onSubmit={handleAddItem} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-800 text-sm">Add plan for Day {selectedDay}</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="activity">🎯 Activity</option>
                <option value="hotel">🏨 Hotel / Stay</option>
                <option value="restaurant">🍽️ Restaurant / Dining</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Place / Activity Name</label>
              <input
                type="text"
                placeholder="e.g. Scuba Diving, Cafe Peter"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Time (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 10:00 AM or Evening"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes / Address (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Booking confirmation #1234 or location note"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
            >
              Save to Day {selectedDay}
            </button>
          </div>
        </form>
      )}

      {/* 4. Timeline List for Day */}
      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading schedule...</div>
      ) : currentDayItems.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-400">
          No plans added for Day {selectedDay} yet. Click <strong>"Add Plan"</strong> above to add activities, hotels, or food!
        </div>
      ) : (
        <div className="space-y-3">
          {currentDayItems.map((item) => {
            const { label, icon, badgeClass } = getCategoryDetails(item.type)
            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl p-4 flex items-start justify-between hover:shadow-xs transition"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg mt-0.5">
                    {icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{item.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${badgeClass}`}>
                        {label}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {item.time}
                      </span>
                      {item.notes && <span>{item.notes}</span>}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-slate-400 hover:text-red-500 p-1 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
