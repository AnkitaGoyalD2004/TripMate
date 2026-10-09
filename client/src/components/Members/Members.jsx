import { useState, useEffect } from 'react'
import {
  Users,
  UserPlus,
  Crown,
  Share2,
  Copy,
  Check,
  Trash2,
  MessageSquare,
  IndianRupee,
  Compass,
  Sparkles,
  ExternalLink,
  Shield,
  ChevronDown,
} from 'lucide-react'
import { api } from '../../services/api.js'

// Squad role options with emojis
const SQUAD_ROLES = [
  { key: 'Member', label: '🎒 Co-Traveler', desc: 'Ready for the adventure' },
  { key: 'Admin', label: '👑 Trip Organizer', desc: 'Trip creator & lead' },
  { key: 'Captain', label: '🚗 Captain & Navigator', desc: 'Routes, cabs & stays' },
  { key: 'Foodie', label: '🍽️ Foodie Chief', desc: 'Cafes, dining & snacks' },
  { key: 'Treasurer', label: '💰 Squad Treasurer', desc: 'Tracks splits & bills' },
  { key: 'Photographer', label: '📸 Photographer', desc: 'Captures all moments' },
  { key: 'Vibe Master', label: '🎵 Vibe Master', desc: 'Playlists & good times' },
]

// Colors for avatar gradients based on name
const AVATAR_GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-emerald-400 to-teal-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-600',
  'from-cyan-400 to-blue-600',
  'from-fuchsia-500 to-pink-500',
]

function getAvatarGradient(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[index]
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || 'TM'
}

export default function Members({
  trip,
  currentUser,
  onReloadTrip,
  onNavigateToTab,
}) {
  const [newMemberName, setNewMemberName] = useState('')
  const [selectedRole, setSelectedRole] = useState('Member')
  const [copiedCode, setCopiedCode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [expenses, setExpenses] = useState([])
  const [itinerary, setItinerary] = useState([])
  const [loadingStats, setLoadingStats] = useState(false)

  // Load expenses and itinerary to calculate member stats
  useEffect(() => {
    if (trip?.id) {
      loadStats()
    }
  }, [trip?.id])

  const loadStats = async () => {
    setLoadingStats(true)
    try {
      const [expData, itinData] = await Promise.all([
        api.getExpenses(trip.id),
        api.getItinerary(trip.id),
      ])
      if (Array.isArray(expData)) setExpenses(expData)
      if (Array.isArray(itinData)) setItinerary(itinData)
    } catch (err) {
      console.error('Failed to load member stats:', err)
    } finally {
      setLoadingStats(false)
    }
  }

  // 1. Add friend directly
  const handleAddMember = async (e) => {
    e.preventDefault()
    if (!newMemberName.trim() || submitting) return

    setSubmitting(true)
    try {
      const added = await api.addMember(trip.id, newMemberName.trim())
      if (selectedRole !== 'Member') {
        await api.updateMemberRole(trip.id, added.id, selectedRole)
      }
      setNewMemberName('')
      setSelectedRole('Member')
      if (onReloadTrip) await onReloadTrip()
    } catch (err) {
      alert(err.message || 'Error adding member')
    } finally {
      setSubmitting(false)
    }
  }

  // 2. Remove member
  const handleRemoveMember = async (memberId, memberName) => {
    if (confirm(`Remove ${memberName} from this trip?`)) {
      try {
        await api.removeMember(trip.id, memberId)
        if (onReloadTrip) await onReloadTrip()
      } catch (err) {
        alert(err.message || 'Error removing member')
      }
    }
  }

  // 3. Update member role
  const handleRoleChange = async (memberId, newRole) => {
    try {
      await api.updateMemberRole(trip.id, memberId, newRole)
      if (onReloadTrip) await onReloadTrip()
    } catch (err) {
      alert(err.message || 'Error updating role')
    }
  }

  // 4. Copy Invite Code
  const handleCopyCode = () => {
    if (trip?.inviteCode) {
      navigator.clipboard.writeText(trip.inviteCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2500)
    }
  }

  // 5. WhatsApp Share
  const getWhatsAppShareUrl = () => {
    const text = encodeURIComponent(
      `Hey! 🌴 Join our trip "${trip?.title || 'Trip'}" on TripMate!\n\nEnter Invite Code: ${
        trip?.inviteCode || ''
      }\nLet's plan activities, split expenses, and coordinate!`
    )
    return `https://api.whatsapp.com/send?text=${text}`
  }

  // Calculate financial contribution per member
  const memberList = trip?.members || []
  const totalTripSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)

  // Calculate member stats map
  const memberStats = {}
  memberList.forEach((m) => {
    memberStats[m.id] = {
      paid: 0,
      share: 0,
      activitiesCount: 0,
    }
  })

  // Compute total paid and share
  expenses.forEach((exp) => {
    const payerId = exp.paidById?.toString()
    const amt = parseFloat(exp.amount || 0)
    if (memberStats[payerId]) {
      memberStats[payerId].paid += amt
    }
    const splitCount = exp.splitWithIds?.length || 1
    const shareAmt = amt / splitCount
    if (exp.splitWithIds) {
      exp.splitWithIds.forEach((uid) => {
        if (memberStats[uid]) {
          memberStats[uid].share += shareAmt
        }
      })
    }
  })

  // Compute activity count
  itinerary.forEach((item) => {
    if (item.participants) {
      memberList.forEach((m) => {
        if (
          item.participants.toLowerCase().includes('all') ||
          item.participants.toLowerCase().includes(m.name.toLowerCase())
        ) {
          if (memberStats[m.id]) {
            memberStats[m.id].activitiesCount += 1
          }
        }
      })
    }
  })

  const adminMember = memberList.find((m) => m.role === 'Admin') || memberList[0]

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Insights */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-indigo-600" size={22} />
            Trip Squad & Companions
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Coordinate with your travel crew, assign squad roles, and track each member's share
          </p>
        </div>

        {/* Squad Count Badges */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl flex items-center gap-1.5">
            <Users size={14} />
            {memberList.length} {memberList.length === 1 ? 'Companion' : 'Companions'}
          </span>
          {adminMember && (
            <span className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 font-medium text-xs rounded-xl flex items-center gap-1">
              <Crown size={13} className="text-amber-600" />
              Lead: {adminMember.name.replace(' (Admin)', '')}
            </span>
          )}
        </div>
      </div>

      {/* 2. Squad Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Travel Crew</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{memberList.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Total Group Spend</p>
          <p className="text-xl font-bold text-indigo-600 mt-1">
            ₹{totalTripSpent.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Trip Expenses Logged</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{expenses.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500">Squad Itinerary Items</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{itinerary.length}</p>
        </div>
      </div>

      {/* 3. Invite Friends Card (Super useful & prominent) */}
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="space-y-1 max-w-md">
          <div className="flex items-center gap-1.5 text-xs text-indigo-200 font-semibold uppercase tracking-wider">
            <Sparkles size={14} className="text-amber-300" />
            Invite Friends to Trip
          </div>
          <h3 className="text-lg font-bold">Have friends joining this trip?</h3>
          <p className="text-xs text-indigo-200 leading-relaxed">
            Share this 6-character code with them. When they sign up on TripMate, they simply enter
            the code to join your workspace in seconds!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Monospace Code Pill */}
          <div className="bg-white/10 backdrop-blur-xs border border-white/20 px-4 py-2.5 rounded-xl flex items-center gap-3">
            <span className="text-xs text-indigo-200">CODE:</span>
            <span className="font-mono text-xl font-extrabold tracking-widest text-amber-300">
              {trip?.inviteCode || '------'}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition"
              title="Copy Invite Code"
            >
              {copiedCode ? (
                <Check size={16} className="text-emerald-300" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>

          {/* WhatsApp Share Button */}
          <a
            href={getWhatsAppShareUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
          >
            <span>💬</span> Share on WhatsApp
          </a>
        </div>
      </div>

      {/* 4. Add Companion Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <UserPlus size={16} className="text-indigo-600" />
          Add Friend Directly
        </h3>

        <form onSubmit={handleAddMember} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6">
            <input
              type="text"
              placeholder="Friend's name (e.g. Rahul, Priya, Alex)..."
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium text-slate-700"
            >
              {SQUAD_ROLES.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={submitting || !newMemberName.trim()}
              className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <UserPlus size={15} />
              {submitting ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </div>

      {/* 5. Squad Members Roster Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <span>🎒</span> Active Squad Roster ({memberList.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memberList.map((member) => {
            const isMe =
              currentUser &&
              (String(member.id) === String(currentUser.id) ||
                member.name.toLowerCase().includes(currentUser.name.toLowerCase()))

            const stats = memberStats[member.id] || { paid: 0, share: 0, activitiesCount: 0 }
            const balance = Math.round(stats.paid - stats.share)
            const roleObj = SQUAD_ROLES.find((r) => r.key === member.role) || {
              label: member.role === 'Admin' ? '👑 Trip Organizer' : '🎒 Co-Traveler',
              desc: 'Companion',
            }

            return (
              <div
                key={member.id}
                className={`bg-white rounded-2xl border p-5 transition shadow-xs flex flex-col justify-between gap-4 ${
                  isMe ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Top Row: Avatar, Name, Role */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Gradient Avatar */}
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${getAvatarGradient(
                        member.name
                      )} text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0`}
                    >
                      {getInitials(member.name)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800 text-sm">{member.name}</h4>
                        {isMe && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                            You
                          </span>
                        )}
                      </div>

                      {/* Role Selector or Badge */}
                      <div className="mt-1 flex items-center gap-1.5">
                        {member.role === 'Admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold">
                            <Crown size={11} className="text-amber-600" />
                            Trip Organizer
                          </span>
                        ) : (
                          <select
                            value={member.role || 'Member'}
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                            className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-200 bg-indigo-50 dark:bg-[#141E38] hover:bg-indigo-100 dark:hover:bg-[#1C294D] border border-indigo-200/80 dark:border-indigo-900/60 px-2 py-0.5 rounded-lg focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                          >
                            {SQUAD_ROLES.filter((r) => r.key !== 'Admin').map((r) => (
                              <option key={r.key} value={r.key}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Remove Button (Non-Admin only) */}
                  {member.role !== 'Admin' && (
                    <button
                      onClick={() => handleRemoveMember(member.id, member.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                      title="Remove from Trip"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {/* Middle Row: Contribution Cards */}
                <div className="grid grid-cols-3 gap-2 bg-indigo-50/60 dark:bg-[#101935] p-3 rounded-xl border border-indigo-100 dark:border-indigo-950 text-xs">
                  <div>
                    <span className="text-[10px] text-indigo-900/70 dark:text-indigo-300 font-semibold uppercase tracking-wider block">Total Paid</span>
                    <strong className="text-slate-900 dark:text-white font-bold text-sm">
                      ₹{stats.paid.toLocaleString('en-IN')}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-indigo-900/70 dark:text-indigo-300 font-semibold uppercase tracking-wider block">Fair Share</span>
                    <strong className="text-slate-700 dark:text-slate-200 font-bold text-sm">
                      ₹{Math.round(stats.share).toLocaleString('en-IN')}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-indigo-900/70 dark:text-indigo-300 font-semibold uppercase tracking-wider block">Balance</span>
                    {balance > 10 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                        +₹{balance.toLocaleString('en-IN')}
                      </span>
                    ) : balance < -10 ? (
                      <span className="text-rose-600 dark:text-rose-400 font-bold text-sm">
                        -₹{Math.abs(balance).toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span className="text-indigo-600 dark:text-indigo-300 font-semibold text-xs">Settled</span>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Quick Contextual Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-indigo-950/60 text-xs">
                  <span className="text-[11px] text-indigo-600/70 dark:text-indigo-300/80 font-medium">
                    {stats.activitiesCount > 0
                      ? `${stats.activitiesCount} activities tagged`
                      : 'All trip activities'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (onNavigateToTab) onNavigateToTab('chat')
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition"
                    >
                      <MessageSquare size={12} />
                      Chat
                    </button>
                    <span className="text-indigo-300 dark:text-indigo-700">·</span>
                    <button
                      onClick={() => {
                        if (onNavigateToTab) onNavigateToTab('expenses')
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 transition"
                    >
                      <IndianRupee size={12} />
                      Expenses
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
