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
  BarChart3,
  MessageSquare,
  MapPin,
} from 'lucide-react'
import Login from './components/Auth/Login.jsx'
import Signup from './components/Auth/Signup.jsx'
import Expenses from './components/Expenses/Expenses.jsx'
import Itinerary from './components/Itinerary/Itinerary.jsx'
import Analytics from './components/Analytics/Analytics.jsx'
import Chat from './components/Chat/Chat.jsx'
import Maps from './components/Maps/Maps.jsx'
import Members from './components/Members/Members.jsx'
import Dashboard from './components/Dashboard/Dashboard.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
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
        <Dashboard
          currentUser={currentUser}
          trips={trips}
          loadingTrips={loadingTrips}
          onSelectTrip={(id) => setActiveTripId(id)}
          onCreateTripClick={(presetTitle) => {
            if (presetTitle) setNewTripTitle(presetTitle)
            setShowCreateModal(true)
          }}
          onJoinTripClick={() => setShowJoinModal(true)}
          onDeleteTrip={handleDeleteTrip}
          onLogout={handleLogout}
        />

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
                  {/* Quick Pick Destination Chips */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px]">
                    <span className="text-slate-400 font-medium">Quick pick:</span>
                    {['Goa Weekend', 'Manali Trek', 'Jaipur Tour', 'Kerala Getaway', 'Ladakh Expedition'].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setNewTripTitle(chip)}
                        className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTripId(null)}
              className="p-2 border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-900 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 transition"
              title="Back to All Trips"
            >
              <ArrowLeft size={18} />
            </button>
            <img src="/logo.svg?v=3" alt="TripMate" className="w-9 h-9 rounded-xl shadow-2xs" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                {currentTrip.title}
              </h1>
              <p className="text-xs text-indigo-600/80 dark:text-indigo-300/80 font-medium">{currentTrip.dates}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() =>
                alert(
                  `Invite Code: ${currentTrip.inviteCode}\nTell your friends to click "Join with Code" and enter this!`
                )
              }
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-sm font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
            >
              <Share2 size={16} />
              Invite Code: {currentTrip.inviteCode}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-6 pt-6">
        <div className="flex border-b border-indigo-100 dark:border-indigo-950 gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 pb-3 font-semibold transition border-b-2 whitespace-nowrap ${
              activeTab === 'members'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400'
            }`}
          >
            <Users size={18} />
            Members ({currentTrip.members?.length || 1})
          </button>

          <button
            onClick={() => setActiveTab('itinerary')}
            className={`flex items-center gap-2 pb-3 font-semibold transition border-b-2 whitespace-nowrap ${
              activeTab === 'itinerary'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400'
            }`}
          >
            <Calendar size={18} />
            Itinerary
          </button>

          <button
            onClick={() => setActiveTab('maps')}
            className={`flex items-center gap-2 pb-3 font-semibold transition border-b-2 whitespace-nowrap ${
              activeTab === 'maps'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400'
            }`}
          >
            <MapPin size={18} />
            Maps & Places
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 pb-3 font-semibold transition border-b-2 whitespace-nowrap ${
              activeTab === 'expenses'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400'
            }`}
          >
            <IndianRupee size={18} />
            Expenses & Split
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 pb-3 font-semibold transition border-b-2 whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400'
            }`}
          >
            <BarChart3 size={18} />
            Analytics & Budget
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 pb-3 font-semibold transition border-b-2 whitespace-nowrap ${
              activeTab === 'chat'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400'
            }`}
          >
            <MessageSquare size={18} />
            Group Chat
          </button>
        </div>

        {/* Tab Contents */}
        <main className="py-6">
          {activeTab === 'members' && (
            <Members
              trip={currentTrip}
              currentUser={currentUser}
              onReloadTrip={() => loadTrips(currentUser.id)}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'itinerary' && (
            <Itinerary tripId={currentTrip.id} trip={currentTrip} />
          )}

          {activeTab === 'maps' && (
            <Maps tripId={currentTrip.id} tripTitle={currentTrip.title} />
          )}

          {activeTab === 'expenses' && (
            <Expenses tripId={currentTrip.id} members={currentTrip.members || []} />
          )}

          {activeTab === 'analytics' && (
            <Analytics
              trip={currentTrip}
              onBudgetUpdate={(newBudget) => {
                setTrips(
                  trips.map((t) =>
                    String(t.id) === String(currentTrip.id)
                      ? { ...t, budget: newBudget }
                      : t
                  )
                )
              }}
            />
          )}

          {activeTab === 'chat' && (
            <Chat tripId={currentTrip.id} currentUser={currentUser} />
          )}
        </main>
      </div>
    </div>
  )
}
