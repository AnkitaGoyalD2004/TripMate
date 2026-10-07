import { useState, useEffect } from 'react'
import {
  Calendar,
  IndianRupee,
  Plus,
  Share2,
  Trash2,
  Users,
  ArrowLeft,
  LogOut,
  Compass,
  X,
} from 'lucide-react'
import Login from './components/Auth/Login.jsx'
import Signup from './components/Auth/Signup.jsx'
import Expenses from './components/Expenses/Expenses.jsx'
import Itinerary from './components/Itinerary/Itinerary.jsx'
import { api } from './services/api.js'

export default function App() {
  // 1. Auth State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('tripmate_current_user')
    if (!saved) return null
    try {
      const user = JSON.parse(saved)
      if (user && user.id && Number(user.id) > 2147483647) {
        localStorage.removeItem('tripmate_current_user')
        localStorage.removeItem('tripmate_active_trip_id')
        return null
      }
      return user
    } catch {
      return null
    }
  })
  const [authView, setAuthView] = useState('login') // 'login' | 'signup'

  // 2. Trips State (loaded from PostgreSQL)
  const [trips, setTrips] = useState([])
  const [loadingTrips, setLoadingTrips] = useState(false)

  const [activeTripId, setActiveTripId] = useState(() => {
    return localStorage.getItem('tripmate_active_trip_id') || null
  })

  const [activeTab, setActiveTab] = useState('members')

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)

  // Forms
  const [newTripTitle, setNewTripTitle] = useState('')
  const [newTripDates, setNewTripDates] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [newMemberName, setNewMemberName] = useState('')

  // Sync session
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('tripmate_current_user', JSON.stringify(currentUser))
      loadTrips(currentUser.id)
    } else {
      localStorage.removeItem('tripmate_current_user')
      setTrips([])
    }
  }, [currentUser])

  useEffect(() => {
    if (activeTripId) {
      localStorage.setItem('tripmate_active_trip_id', activeTripId)
    } else {
      localStorage.removeItem('tripmate_active_trip_id')
    }
  }, [activeTripId])

  const loadTrips = async (userId) => {
    setLoadingTrips(true)
    try {
      const data = await api.getTrips(userId)
      setTrips(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load trips:', err)
      setTrips([])
    } finally {
      setLoadingTrips(false)
    }
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setActiveTripId(null)
  }

  // --- TRIP ACTIONS (POSTGRESQL) ---
  const handleCreateTrip = async (e) => {
    e.preventDefault()
    if (!newTripTitle.trim()) return

    try {
      const newTrip = await api.createTrip(newTripTitle.trim(), newTripDates.trim(), currentUser.id)
      setTrips([newTrip, ...trips])
      setActiveTripId(newTrip.id)
      setNewTripTitle('')
      setNewTripDates('')
      setShowCreateModal(false)
    } catch (err) {
      alert(err.message || 'Error creating trip')
    }
  }

  const handleJoinTrip = async (e) => {
    e.preventDefault()
    if (!joinCode.trim()) return

    try {
      const res = await api.joinTrip(joinCode.trim(), currentUser.id)
      await loadTrips(currentUser.id)
      setActiveTripId(res.tripId)
      setJoinCode('')
      setShowJoinModal(false)
    } catch (err) {
      alert(err.message || 'Invalid Invite Code')
    }
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    if (!newMemberName.trim()) return

    try {
      await api.addMember(activeTripId, newMemberName.trim())
      await loadTrips(currentUser.id)
      setNewMemberName('')
    } catch (err) {
      alert(err.message || 'Error adding member')
    }
  }

  const handleRemoveMember = async (userId) => {
    try {
      await api.removeMember(activeTripId, userId)
      await loadTrips(currentUser.id)
    } catch (err) {
      alert(err.message || 'Error removing member')
    }
  }

  const handleDeleteTrip = async (tripIdToDelete) => {
    if (confirm('Are you sure you want to delete this trip?')) {
      try {
        await api.deleteTrip(tripIdToDelete)
        setTrips(trips.filter((t) => t.id !== tripIdToDelete))
        if (activeTripId === tripIdToDelete) setActiveTripId(null)
      } catch (err) {
        alert(err.message || 'Error deleting trip')
      }
    }
  }

  const currentTrip = Array.isArray(trips)
    ? trips.find((t) => String(t.id) === String(activeTripId))
    : null

  // =============================================================
  // 1. AUTH SCREEN
  // =============================================================
  if (!currentUser) {
    return authView === 'signup' ? (
      <Signup
        onSignup={(user) => setCurrentUser(user)}
        onSwitchToLogin={() => setAuthView('login')}
      />
    ) : (
      <Login
        onLogin={(user) => setCurrentUser(user)}
        onSwitchToSignup={() => setAuthView('signup')}
      />
    )
  }

  // =============================================================
  // 2. DASHBOARD ("MY TRIPS" IN POSTGRESQL)
  // =============================================================
  if (!currentTrip) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        {/* Navigation Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌴</span>
              <span className="text-xl font-bold text-slate-800">TripMate</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-600">
                Hi, <strong className="text-slate-900">{currentUser.name}</strong> 👋
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-100 transition"
              >
                <LogOut size={16} /> Log Out
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">My Trips</h1>
              <p className="text-sm text-slate-500">View upcoming plans or create a new trip with friends</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowJoinModal(true)}
                className="flex items-center gap-2 px-4 py-2 border border-indigo-200 text-indigo-600 bg-indigo-50 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition"
              >
                Join with Code
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
              >
                <Plus size={18} /> Create New Trip
              </button>
            </div>
          </div>

          {/* Trips Grid */}
          {loadingTrips ? (
            <div className="text-center py-12 text-slate-400">Loading your trips...</div>
          ) : trips.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center max-w-md mx-auto">
              <Compass size={40} className="text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-lg">No trips yet!</h3>
              <p className="text-xs text-slate-500 mt-1 mb-5">
                Ready to travel? Create a new trip or join an existing one using an invite code.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
              >
                Create Your First Trip
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {trips.map((t) => (
                <div
                  key={t.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-slate-800 text-lg flex items-center gap-1.5">
                        ✈️ {t.title}
                      </h3>
                      <button
                        onClick={() => handleDeleteTrip(t.id)}
                        className="text-slate-300 hover:text-red-500 p-1 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 mt-1">{t.dates}</p>

                    <div className="flex items-center gap-2 mt-4 text-xs font-medium text-slate-600">
                      <span className="px-2.5 py-1 bg-slate-100 rounded-md">
                        👥 {t.members?.length || 1} Members
                      </span>
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-md font-mono">
                        Code: {t.inviteCode}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTripId(t.id)}
                    className="mt-6 w-full py-2 bg-slate-50 hover:bg-indigo-600 hover:text-white border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
                  >
                    Open Trip Dashboard →
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* MODAL 1: CREATE TRIP */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-lg">Create New Trip</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateTrip} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trip Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Goa Weekend, Manali Trek, Jaipur Tour"
                    value={newTripTitle}
                    onChange={(e) => setNewTripTitle(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dates (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Nov 10 - Nov 14, 2026"
                    value={newTripDates}
                    onChange={(e) => setNewTripDates(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
                  >
                    Create Trip
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: JOIN TRIP */}
        {showJoinModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-lg">Join Existing Trip</h3>
                <button onClick={() => setShowJoinModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleJoinTrip} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">6-Character Invite Code</label>
                  <input
                    type="text"
                    placeholder="e.g. AB12CD"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    required
                    maxLength={6}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono tracking-widest uppercase focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
                  >
                    Join Trip
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // =============================================================
  // 3. ACTIVE TRIP DASHBOARD
  // =============================================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-xs">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTripId(null)}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition"
              title="Back to All Trips"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                ✈️ {currentTrip.title}
              </h1>
              <p className="text-xs text-slate-500">{currentTrip.dates}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                alert(
                  `Invite Code: ${currentTrip.inviteCode}\nTell your friends to click "Join with Code" and enter this!`
                )
              }
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition"
            >
              <Share2 size={16} />
              Invite Code: {currentTrip.inviteCode}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-6 pt-6">
        <div className="flex border-b border-slate-200 gap-8">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 pb-3 font-medium transition border-b-2 ${
              activeTab === 'members'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users size={18} />
            Members ({currentTrip.members?.length || 1})
          </button>

          <button
            onClick={() => setActiveTab('itinerary')}
            className={`flex items-center gap-2 pb-3 font-medium transition border-b-2 ${
              activeTab === 'itinerary'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar size={18} />
            Itinerary
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 pb-3 font-medium transition border-b-2 ${
              activeTab === 'expenses'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <IndianRupee size={18} />
            Expenses & Split
          </button>
        </div>

        {/* Tab Contents */}
        <main className="py-6">
          {activeTab === 'members' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
              <form onSubmit={handleAddMember} className="flex gap-3">
                <input
                  type="text"
                  placeholder="Add friend's name..."
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
                >
                  <Plus size={18} />
                  Add Friend
                </button>
              </form>

              <div className="divide-y divide-slate-100">
                {currentTrip.members?.map((member) => (
                  <div key={member.id} className="py-3 flex items-center justify-between">
                    <span className="font-semibold text-slate-800 text-sm">{member.name}</span>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          member.role === 'Admin'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {member.role}
                      </span>
                      {member.role !== 'Admin' && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-slate-400 hover:text-red-500 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'itinerary' && <Itinerary tripId={currentTrip.id} />}

          {activeTab === 'expenses' && (
            <Expenses tripId={currentTrip.id} members={currentTrip.members || []} />
          )}
        </main>
      </div>
    </div>
  )
}
