const API_BASE = 'http://localhost:5001/api'

export const api = {
  // Auth
  signup: async (name, email, password) => {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Signup failed')
    }
    return res.json()
  },

  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Login failed')
    }
    return res.json()
  },

  // Trips
  getTrips: async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/trips?userId=${userId}`)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  },

  createTrip: async (title, dates, userId) => {
    const res = await fetch(`${API_BASE}/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, dates, userId }),
    })
    return res.json()
  },

  joinTrip: async (inviteCode, userId) => {
    const res = await fetch(`${API_BASE}/trips/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode, userId }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Could not join trip')
    }
    return res.json()
  },

  deleteTrip: async (tripId) => {
    const res = await fetch(`${API_BASE}/trips/${tripId}`, {
      method: 'DELETE',
    })
    return res.json()
  },

  addMember: async (tripId, name) => {
    const res = await fetch(`${API_BASE}/trips/${tripId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    return res.json()
  },

  removeMember: async (tripId, userId) => {
    const res = await fetch(`${API_BASE}/trips/${tripId}/members/${userId}`, {
      method: 'DELETE',
    })
    return res.json()
  },

  // Itinerary
  getItinerary: async (tripId) => {
    const res = await fetch(`${API_BASE}/trips/${tripId}/itinerary`)
    return res.json()
  },

  addItineraryItem: async (tripId, item) => {
    const res = await fetch(`${API_BASE}/trips/${tripId}/itinerary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })
    return res.json()
  },

  deleteItineraryItem: async (tripId, itemId) => {
    const res = await fetch(`${API_BASE}/trips/${tripId}/itinerary/${itemId}`, {
      method: 'DELETE',
    })
    return res.json()
  },

  // Expenses & Settlements
  getExpenses: async (tripId) => {
    const res = await fetch(`${API_BASE}/trips/${tripId}/expenses`)
    return res.json()
  },

  addExpense: async (tripId, expense) => {
    const res = await fetch(`${API_BASE}/trips/${tripId}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    })
    return res.json()
  },

  deleteExpense: async (tripId, expenseId) => {
    const res = await fetch(`${API_BASE}/trips/${tripId}/expenses/${expenseId}`, {
      method: 'DELETE',
    })
    return res.json()
  },

  getSettlements: async (tripId) => {
    const res = await fetch(`${API_BASE}/trips/${tripId}/settlements`)
    return res.json()
  },

  addSettlement: async (tripId, settlement) => {
    const res = await fetch(`${API_BASE}/trips/${tripId}/settlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settlement),
    })
    return res.json()
  },
}
