import { useState } from 'react'
import {
  Compass,
  Plus,
  Trash2,
  Users,
  Calendar,
  Copy,
  Check,
  ArrowRight,
  LogOut,
  Sparkles,
  MapPin,
  Search,
  IndianRupee,
  Share2,
  Clock,
  ExternalLink,
} from 'lucide-react'
import ThemeToggle from '../ThemeToggle.jsx'

// Destination cover styles
function getDestinationTheme(title = '') {
  const lower = title.toLowerCase()
  if (lower.includes('goa') || lower.includes('beach') || lower.includes('gokarna')) {
    return {
      gradient: 'from-teal-600 via-cyan-600 to-indigo-700',
      badge: '🏖️ Coastal Getaway',
      icon: '🌴',
    }
  }
  if (lower.includes('manali') || lower.includes('shimla') || lower.includes('kasol') || lower.includes('kashmir') || lower.includes('ladakh')) {
    return {
      gradient: 'from-slate-700 via-emerald-800 to-teal-900',
      badge: '🏔️ Mountain Escape',
      icon: '🏔️',
    }
  }
  if (lower.includes('jaipur') || lower.includes('udaipur') || lower.includes('rajasthan')) {
    return {
      gradient: 'from-amber-600 via-rose-600 to-purple-800',
      badge: '🏰 Royal Heritage',
      icon: '🏰',
    }
  }
  if (lower.includes('kerala') || lower.includes('munnar') || lower.includes('alleppey')) {
    return {
      gradient: 'from-emerald-600 via-teal-700 to-cyan-900',
      badge: '🌊 Backwaters & Nature',
      icon: '🌴',
    }
  }
  return {
    gradient: 'from-indigo-600 via-indigo-700 to-purple-800',
    badge: '✈️ Adventure Trip',
    icon: '✈️',
  }
}

// Popular destination inspirations
const POPULAR_DESTINATIONS = [
  {
    title: 'Goa Weekend Break',
    location: 'North & South Goa',
    tag: '🏖️ Beaches & Cafes',
    desc: 'Baga water sports, Vagator sunsets, Thalassa dining & scooter rides',
    duration: '3-4 Days',
    presetName: 'Goa Weekend Trip',
  },
  {
    title: 'Manali & Solang Valley',
    location: 'Himachal Pradesh',
    tag: '🏔️ Mountains & Treks',
    desc: 'Old Manali cafes, river rafting in Beas, Atal Tunnel & snow views',
    duration: '4-5 Days',
    presetName: 'Manali Mountain Trek',
  },
  {
    title: 'Jaipur & Udaipur Heritage',
    location: 'Rajasthan',
    tag: '🏰 Forts & Culture',
    desc: 'Amer Fort, royal lake palaces, rooftop dining & vibrant bazaars',
    duration: '3 Days',
    presetName: 'Rajasthan Heritage Tour',
  },
  {
    title: 'Kerala Backwaters & Munnar',
    location: 'Alleppey & Munnar',
    tag: '🌴 Tea Hills & Lakes',
    desc: 'Houseboat cruise, tea gardens, waterfalls & tropical serenity',
    duration: '4 Days',
    presetName: 'Kerala Backwaters Trip',
  },
]

export default function Dashboard({
  currentUser,
  trips = [],
  loadingTrips,
  onSelectTrip,
  onCreateTripClick,
  onJoinTripClick,
  onDeleteTrip,
  onLogout,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedCodeId, setCopiedCodeId] = useState(null)

  const handleCopy = (tripId, code, e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(code)
    setCopiedCodeId(tripId)
    setTimeout(() => setCopiedCodeId(null), 2000)
  }

  // Filtered trips
  const filteredTrips = trips.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.dates && t.dates.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.inviteCode && t.inviteCode.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 1. TOP NAVBAR */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.svg?v=3"
              alt="TripMate Logo"
              className="w-9 h-9 rounded-xl shadow-xs"
            />
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">TripMate</span>
              <span className="hidden sm:inline-block text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold ml-2 border-l border-indigo-200 dark:border-indigo-900 pl-2">
                Group Travel Workspace
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm font-medium text-slate-600">
              Hi, <strong className="text-slate-900">{currentUser.name}</strong> 👋
            </span>
            <ThemeToggle />
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs sm:text-sm font-semibold transition"
            >
              <LogOut size={15} /> Log Out
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN DASHBOARD CONTENT */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10 flex-1 w-full">
        {/* HERO BANNER */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-7 sm:p-10 shadow-lg">
          {/* Subtle background decorative shapes */}
          <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute right-32 top-0 w-32 h-32 rounded-full bg-indigo-500/10 pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold text-indigo-200 border border-white/10">
              <Sparkles size={13} className="text-amber-300" />
              Your Travel Headquarters
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Welcome back, {currentUser.name}! 🌴
            </h1>

            <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
              Plan your group itineraries, split travel expenses fairly in Indian Rupees (₹), pin spots on maps,
              and stay in sync with your travel squad.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onCreateTripClick()}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-900 rounded-xl text-xs sm:text-sm font-bold hover:bg-indigo-50 transition shadow-sm"
              >
                <Plus size={16} /> Create New Trip
              </button>
              <button
                onClick={onJoinTripClick}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs sm:text-sm font-semibold transition backdrop-blur-xs"
              >
                Join with Code
              </button>
            </div>
          </div>
        </div>

        {/* 3. TRIPS GRID SECTION */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>✈️</span> Your Active Trips ({trips.length})
              </h2>
              <p className="text-xs text-slate-500">
                Pick a trip to open its full workspace or manage companions
              </p>
            </div>

            {/* Search Input */}
            {trips.length > 0 && (
              <div className="relative w-full sm:w-64">
                <Search size={15} className="absolute left-3 top-2.5 text-indigo-500" />
                <input
                  type="text"
                  placeholder="Search trips or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-indigo-100/80 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {loadingTrips ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">
              Loading your trips...
            </div>
          ) : trips.length === 0 ? (
            /* Empty State */
            <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-2xl">
                🌴
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">No trips planned yet!</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Ready to travel? Create your first trip or join an existing group using a 6-character invite code.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => onCreateTripClick()}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition shadow-sm"
                >
                  + Create Your First Trip
                </button>
                <button
                  onClick={onJoinTripClick}
                  className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Join with Code
                </button>
              </div>
            </div>
          ) : (
            /* Trips Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTrips.map((t) => {
                const theme = getDestinationTheme(t.title)
                const isCopied = copiedCodeId === t.id
                const memberCount = t.members?.length || 1

                return (
                  <div
                    key={t.id}
                    onClick={() => onSelectTrip(t.id)}
                    className="bg-white border border-slate-200 rounded-3xl overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col justify-between group cursor-pointer hover:border-indigo-300"
                  >
                    {/* Card Top Cover Banner */}
                    <div
                      className={`h-24 bg-gradient-to-r ${theme.gradient} p-4 text-white flex items-start justify-between relative`}
                    >
                      <span className="px-2.5 py-1 rounded-full bg-black/20 backdrop-blur-xs text-[10px] font-bold text-white border border-white/20">
                        {theme.badge}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteTrip(t.id)
                        }}
                        className="p-1.5 bg-black/20 hover:bg-red-600/80 rounded-lg text-white/80 hover:text-white transition"
                        title="Delete Trip"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        {/* Title */}
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{theme.icon}</span>
                          <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition truncate">
                            {t.title}
                          </h3>
                        </div>

                        {/* Dates */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar size={13} className="text-slate-400" />
                          <span>{t.dates || 'Dates Flexible'}</span>
                        </div>

                        {/* Squad companions & code pill */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                            <Users size={14} className="text-indigo-500" />
                            <span>
                              {memberCount} {memberCount === 1 ? 'Friend' : 'Friends'}
                            </span>
                          </div>

                          {/* Copy Code */}
                          <button
                            type="button"
                            onClick={(e) => handleCopy(t.id, t.inviteCode, e)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-mono font-semibold transition"
                            title="Click to copy invite code"
                          >
                            <span>{t.inviteCode}</span>
                            {isCopied ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Feature Highlights Tags */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                        <span>🗓️ Timeline</span>
                        <span>·</span>
                        <span>🗺️ Routes</span>
                        <span>·</span>
                        <span>💳 Split ₹</span>
                        <span>·</span>
                        <span>💬 Chat</span>
                      </div>

                      {/* Primary Action Button */}
                      <button
                        onClick={() => onSelectTrip(t.id)}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20"
                      >
                        <span>Open Workspace</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 4. INSPIRATIONAL DESTINATIONS SECTION (Fills the page with engaging options) */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-indigo-600">
              EXPLORE GETAWAYS
            </span>
            <h2 className="text-lg font-bold text-slate-800 mt-0.5">
              Popular Squad Destinations in India
            </h2>
            <p className="text-xs text-slate-500">
              Click any destination to start planning a new group trip instantly
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {POPULAR_DESTINATIONS.map((dest) => (
              <div
                key={dest.title}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                    {dest.tag}
                  </span>
                  <h4 className="font-bold text-slate-800 text-sm mt-1">{dest.title}</h4>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin size={11} /> {dest.location} · {dest.duration}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed pt-1">{dest.desc}</p>
                </div>

                <button
                  onClick={() => onCreateTripClick(dest.presetName)}
                  className="w-full py-2 border border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-semibold transition"
                >
                  + Plan This Trip
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 5. WORKSPACE CAPABILITIES GUIDE */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-5">
          <div className="text-center max-w-md mx-auto">
            <h3 className="font-bold text-slate-800 text-base">
              Everything Your Travel Squad Needs
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Built specifically for group trips, road trips, and weekend getaways
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 text-base">
                🕒
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-xs">Vertical Itinerary Timeline</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Map out activities chronologically with times, estimated prices in ₹, durations, and notes.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 text-base">
                💳
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-xs">Zero-Math Split in ₹</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Log group bills, split fairly, and see exactly who owes whom without awkward calculations.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 text-base">
                🗺️
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-xs">Maps & Turn-by-Turn Routes</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pin spots, view live embedded maps, and open multi-stop Google Maps routes in 1 click.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
