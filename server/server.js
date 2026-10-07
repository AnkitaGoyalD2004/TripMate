import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import 'dotenv/config'
import { pool, initDB } from './db.js'

const app = express()
const PORT = process.env.PORT || 5001

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Initialize Database Tables
initDB()

// =============================================================
// 1. AUTH ROUTES
// =============================================================

// Sign Up
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body
  try {
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' })
    }

    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, password]
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Log In
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  try {
    const result = await pool.query(
      'SELECT id, name, email FROM users WHERE email = $1 AND password = $2',
      [email, password]
    )
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// =============================================================
// 2. TRIPS ROUTES
// =============================================================

// Get all trips for a user
app.get('/api/trips', async (req, res) => {
  const { userId } = req.query
  const userIdNum = parseInt(userId, 10)
  if (isNaN(userIdNum) || userIdNum > 2147483647) {
    return res.json([])
  }

  try {
    const tripsResult = await pool.query(
      `SELECT t.* FROM trips t
       JOIN trip_members tm ON t.id = tm.trip_id
       WHERE tm.user_id = $1
       ORDER BY t.created_at DESC`,
      [userIdNum]
    )

    const trips = []
    for (const trip of tripsResult.rows) {
      const membersResult = await pool.query(
        `SELECT u.id, u.name, tm.role FROM users u
         JOIN trip_members tm ON u.id = tm.user_id
         WHERE tm.trip_id = $1`,
        [trip.id]
      )
      trips.push({
        id: trip.id.toString(),
        title: trip.title,
        dates: trip.dates,
        inviteCode: trip.invite_code,
        budget: parseFloat(trip.budget || 0),
        members: membersResult.rows.map((m) => ({
          id: m.id.toString(),
          name: m.role === 'Admin' ? `${m.name} (Admin)` : m.name,
          role: m.role,
        })),
      })
    }

    res.json(trips)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create a new trip
app.post('/api/trips', async (req, res) => {
  const { title, dates, userId } = req.body
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()

  try {
    const tripResult = await pool.query(
      'INSERT INTO trips (title, dates, invite_code, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, dates || 'Dates TBD', inviteCode, userId]
    )
    const trip = tripResult.rows[0]

    // Add creator as Admin member
    await pool.query(
      'INSERT INTO trip_members (trip_id, user_id, role) VALUES ($1, $2, $3)',
      [trip.id, userId, 'Admin']
    )

    const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [userId])
    const userName = userResult.rows[0]?.name || 'You'

    res.json({
      id: trip.id.toString(),
      title: trip.title,
      dates: trip.dates,
      inviteCode: trip.invite_code,
      budget: 0,
      members: [{ id: userId.toString(), name: `${userName} (Admin)`, role: 'Admin' }],
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update trip budget
app.patch('/api/trips/:id/budget', async (req, res) => {
  const { budget } = req.body
  try {
    await pool.query('UPDATE trips SET budget = $1 WHERE id = $2', [budget, req.params.id])
    res.json({ success: true, budget: parseFloat(budget) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Join trip with code
app.post('/api/trips/join', async (req, res) => {
  const { inviteCode, userId } = req.body
  try {
    const tripResult = await pool.query('SELECT * FROM trips WHERE invite_code = $1', [
      inviteCode.trim().toUpperCase(),
    ])
    if (tripResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trip not found with this code' })
    }
    const trip = tripResult.rows[0]

    // Check if already a member
    const existing = await pool.query(
      'SELECT * FROM trip_members WHERE trip_id = $1 AND user_id = $2',
      [trip.id, userId]
    )

    if (existing.rows.length === 0) {
      await pool.query('INSERT INTO trip_members (trip_id, user_id, role) VALUES ($1, $2, $3)', [
        trip.id,
        userId,
        'Member',
      ])
    }

    res.json({ success: true, tripId: trip.id.toString() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete trip
app.delete('/api/trips/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM trips WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Add friend to trip
app.post('/api/trips/:id/members', async (req, res) => {
  const { name } = req.body
  try {
    // Create guest user if not registered
    let userResult = await pool.query('SELECT * FROM users WHERE name = $1', [name.trim()])
    let memberId
    if (userResult.rows.length === 0) {
      const guestEmail = `${name.toLowerCase().replace(/\s+/g, '')}_${Date.now()}@tripmate.local`
      const newUser = await pool.query(
        'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
        [name.trim(), guestEmail, 'guest123']
      )
      memberId = newUser.rows[0].id
    } else {
      memberId = userResult.rows[0].id
    }

    await pool.query(
      'INSERT INTO trip_members (trip_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [req.params.id, memberId, 'Member']
    )

    res.json({ id: memberId.toString(), name: name.trim(), role: 'Member' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Remove member
app.delete('/api/trips/:id/members/:userId', async (req, res) => {
  try {
    await pool.query('DELETE FROM trip_members WHERE trip_id = $1 AND user_id = $2', [
      req.params.id,
      req.params.userId,
    ])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update member role
app.patch('/api/trips/:id/members/:userId/role', async (req, res) => {
  const { role } = req.body
  try {
    await pool.query(
      'UPDATE trip_members SET role = $1 WHERE trip_id = $2 AND user_id = $3',
      [role, req.params.id, req.params.userId]
    )
    res.json({ success: true, role })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// =============================================================
// 3. ITINERARY ROUTES
// =============================================================

// Get itinerary
app.get('/api/trips/:id/itinerary', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM itinerary_items WHERE trip_id = $1 ORDER BY day_number, id ASC',
      [req.params.id]
    )
    res.json(
      result.rows.map((row) => ({
        id: row.id.toString(),
        day: row.day_number,
        type: row.type || 'activity',
        title: row.title,
        time: row.time || '',
        notes: row.notes || '',
        location: row.location || '',
        duration: row.duration || '',
        price: parseFloat(row.price || 0),
        icon: row.icon || '🎯',
        participants: row.participants || 'All friends',
      }))
    )
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Add itinerary item
app.post('/api/trips/:id/itinerary', async (req, res) => {
  const { day, type, title, time, notes, location, duration, price, icon, participants } = req.body
  try {
    const result = await pool.query(
      `INSERT INTO itinerary_items (trip_id, day_number, type, title, time, notes, location, duration, price, icon, participants)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        req.params.id,
        day,
        type || 'activity',
        title,
        time || '',
        notes || '',
        location || '',
        duration || '',
        price || 0,
        icon || '🎯',
        participants || 'All friends',
      ]
    )
    const row = result.rows[0]
    res.json({
      id: row.id.toString(),
      day: row.day_number,
      type: row.type,
      title: row.title,
      time: row.time,
      notes: row.notes,
      location: row.location || '',
      duration: row.duration || '',
      price: parseFloat(row.price || 0),
      icon: row.icon || '🎯',
      participants: row.participants || 'All friends',
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update itinerary item
app.put('/api/trips/:id/itinerary/:itemId', async (req, res) => {
  const { day, type, title, time, notes, location, duration, price, icon, participants } = req.body
  try {
    const result = await pool.query(
      `UPDATE itinerary_items
       SET day_number = $1, type = $2, title = $3, time = $4, notes = $5, location = $6, duration = $7, price = $8, icon = $9, participants = $10
       WHERE id = $11 AND trip_id = $12
       RETURNING *`,
      [
        day,
        type || 'activity',
        title,
        time || '',
        notes || '',
        location || '',
        duration || '',
        price || 0,
        icon || '🎯',
        participants || 'All friends',
        req.params.itemId,
        req.params.id,
      ]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' })
    const row = result.rows[0]
    res.json({
      id: row.id.toString(),
      day: row.day_number,
      type: row.type,
      title: row.title,
      time: row.time,
      notes: row.notes,
      location: row.location || '',
      duration: row.duration || '',
      price: parseFloat(row.price || 0),
      icon: row.icon || '🎯',
      participants: row.participants || 'All friends',
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete itinerary item
app.delete('/api/trips/:id/itinerary/:itemId', async (req, res) => {
  try {
    await pool.query('DELETE FROM itinerary_items WHERE id = $1', [req.params.itemId])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// =============================================================
// 4. EXPENSES & SETTLEMENTS ROUTES
// =============================================================

// Get expenses
app.get('/api/trips/:id/expenses', async (req, res) => {
  try {
    const expensesResult = await pool.query(
      'SELECT * FROM expenses WHERE trip_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    )

    const expenses = []
    for (const exp of expensesResult.rows) {
      const splitsResult = await pool.query(
        'SELECT user_id FROM expense_splits WHERE expense_id = $1',
        [exp.id]
      )
      expenses.push({
        id: exp.id.toString(),
        title: exp.title,
        amount: parseFloat(exp.amount),
        category: exp.category || 'Food',
        paidById: exp.paid_by_id.toString(),
        splitWithIds: splitsResult.rows.map((s) => s.user_id.toString()),
        receiptImage: exp.receipt_image,
        date: new Date(exp.created_at).toLocaleDateString(),
      })
    }

    res.json(expenses)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Add expense
app.post('/api/trips/:id/expenses', async (req, res) => {
  const { title, amount, category, paidById, splitWithIds, receiptImage } = req.body
  try {
    const expResult = await pool.query(
      'INSERT INTO expenses (trip_id, title, amount, category, paid_by_id, receipt_image) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.params.id, title, amount, category || 'Food', paidById, receiptImage]
    )
    const exp = expResult.rows[0]

    for (const uId of splitWithIds) {
      await pool.query('INSERT INTO expense_splits (expense_id, user_id) VALUES ($1, $2)', [
        exp.id,
        uId,
      ])
    }

    res.json({
      id: exp.id.toString(),
      title: exp.title,
      amount: parseFloat(exp.amount),
      category: exp.category || category || 'Food',
      paidById: exp.paid_by_id.toString(),
      splitWithIds,
      receiptImage: exp.receipt_image,
      date: new Date(exp.created_at).toLocaleDateString(),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete expense
app.delete('/api/trips/:id/expenses/:expenseId', async (req, res) => {
  try {
    await pool.query('DELETE FROM expenses WHERE id = $1', [req.params.expenseId])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get settlements
app.get('/api/trips/:id/settlements', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settlements WHERE trip_id = $1', [
      req.params.id,
    ])
    res.json(
      result.rows.map((st) => ({
        id: st.id.toString(),
        fromId: st.from_user_id.toString(),
        toId: st.to_user_id.toString(),
        amount: parseFloat(st.amount),
        date: new Date(st.created_at).toLocaleDateString(),
      }))
    )
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Add settlement
app.post('/api/trips/:id/settlements', async (req, res) => {
  const { fromId, toId, amount } = req.body
  try {
    const result = await pool.query(
      'INSERT INTO settlements (trip_id, from_user_id, to_user_id, amount) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, fromId, toId, amount]
    )
    const st = result.rows[0]
    res.json({
      id: st.id.toString(),
      fromId: st.from_user_id.toString(),
      toId: st.to_user_id.toString(),
      amount: parseFloat(st.amount),
      date: new Date(st.created_at).toLocaleDateString(),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// =============================================================
// 5. CHAT & DISCUSSION WALL ROUTES
// =============================================================

// Get all messages for a trip
app.get('/api/trips/:id/messages', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.id, m.trip_id, m.user_id, m.message, m.tag, m.created_at, u.name as sender_name
       FROM trip_messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.trip_id = $1
       ORDER BY m.created_at ASC`,
      [req.params.id]
    )
    res.json(
      result.rows.map((row) => ({
        id: row.id.toString(),
        tripId: row.trip_id.toString(),
        userId: row.user_id.toString(),
        senderName: row.sender_name,
        message: row.message,
        tag: row.tag,
        time: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }))
    )
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Send a new message
app.post('/api/trips/:id/messages', async (req, res) => {
  const { userId, message, tag } = req.body
  if (!message || !message.trim()) return res.status(400).json({ error: 'Message cannot be empty' })

  try {
    const result = await pool.query(
      'INSERT INTO trip_messages (trip_id, user_id, message, tag) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, userId, message.trim(), tag || 'General']
    )
    const row = result.rows[0]
    const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId])
    const senderName = userRes.rows[0]?.name || 'Member'

    const newMsg = {
      id: row.id.toString(),
      tripId: row.trip_id.toString(),
      userId: row.user_id.toString(),
      senderName,
      message: row.message,
      tag: row.tag,
      time: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    io.to(`trip_${req.params.id}`).emit('receive_message', newMsg)
    res.json(newMsg)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// =============================================================
// 6. LOCATIONS, PLACES & ROUTES
// =============================================================

// Get all saved locations for a trip
app.get('/api/trips/:id/locations', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, trip_id, name, category, address, notes, is_visited, created_at
       FROM trip_locations
       WHERE trip_id = $1
       ORDER BY created_at ASC`,
      [req.params.id]
    )
    res.json(
      result.rows.map((row) => ({
        id: row.id.toString(),
        tripId: row.trip_id.toString(),
        name: row.name,
        category: row.category || 'Sightseeing',
        address: row.address || '',
        notes: row.notes || '',
        isVisited: !!row.is_visited,
      }))
    )
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Add a new location
app.post('/api/trips/:id/locations', async (req, res) => {
  const { name, category, address, notes } = req.body
  if (!name || !name.trim()) return res.status(400).json({ error: 'Location name is required' })

  try {
    const result = await pool.query(
      `INSERT INTO trip_locations (trip_id, name, category, address, notes, is_visited)
       VALUES ($1, $2, $3, $4, $5, false) RETURNING *`,
      [req.params.id, name.trim(), category || 'Sightseeing', address || '', notes || '']
    )
    const row = result.rows[0]
    res.json({
      id: row.id.toString(),
      tripId: row.trip_id.toString(),
      name: row.name,
      category: row.category,
      address: row.address,
      notes: row.notes,
      isVisited: !!row.is_visited,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Toggle visited status
app.patch('/api/trips/:id/locations/:locId/toggle', async (req, res) => {
  const { isVisited } = req.body
  try {
    const result = await pool.query(
      'UPDATE trip_locations SET is_visited = $1 WHERE id = $2 AND trip_id = $3 RETURNING *',
      [isVisited, req.params.locId, req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Location not found' })
    const row = result.rows[0]
    res.json({
      id: row.id.toString(),
      tripId: row.trip_id.toString(),
      name: row.name,
      category: row.category,
      address: row.address,
      notes: row.notes,
      isVisited: !!row.is_visited,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete a location
app.delete('/api/trips/:id/locations/:locId', async (req, res) => {
  try {
    await pool.query('DELETE FROM trip_locations WHERE id = $1 AND trip_id = $2', [
      req.params.locId,
      req.params.id,
    ])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// =============================================================
// 7. WEBSOCKET REAL-TIME CHAT EVENTS
// =============================================================
io.on('connection', (socket) => {
  // Join a trip chat room
  socket.on('join_trip', (tripId) => {
    socket.join(`trip_${tripId}`)
  })

  // Leave a trip chat room
  socket.on('leave_trip', (tripId) => {
    socket.leave(`trip_${tripId}`)
  })

  // Real-time typing indicators
  socket.on('typing', ({ tripId, userName }) => {
    socket.to(`trip_${tripId}`).emit('user_typing', userName)
  })

  socket.on('stop_typing', ({ tripId }) => {
    socket.to(`trip_${tripId}`).emit('user_stop_typing')
  })

  // Send message directly over WebSocket
  socket.on('send_message', async ({ tripId, userId, message, tag }) => {
    if (!message || !message.trim()) return
    try {
      const result = await pool.query(
        'INSERT INTO trip_messages (trip_id, user_id, message, tag) VALUES ($1, $2, $3, $4) RETURNING *',
        [tripId, userId, message.trim(), tag || 'General']
      )
      const row = result.rows[0]
      const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId])
      const senderName = userRes.rows[0]?.name || 'Member'

      const newMsg = {
        id: row.id.toString(),
        tripId: row.trip_id.toString(),
        userId: row.user_id.toString(),
        senderName,
        message: row.message,
        tag: row.tag,
        time: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      io.to(`trip_${tripId}`).emit('receive_message', newMsg)
    } catch (err) {
      console.error('WebSocket send_message error:', err.message)
    }
  })
})

server.listen(PORT, () => {
  console.log(`🚀 TripMate Backend (with WebSockets) running on http://localhost:${PORT}`)
})
