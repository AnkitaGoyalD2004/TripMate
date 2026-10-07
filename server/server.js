import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { pool, initDB } from './db.js'

const app = express()
const PORT = process.env.PORT || 5001

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
      members: [{ id: userId.toString(), name: `${userName} (Admin)`, role: 'Admin' }],
    })
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
        type: row.type,
        title: row.title,
        time: row.time,
        notes: row.notes,
      }))
    )
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Add itinerary item
app.post('/api/trips/:id/itinerary', async (req, res) => {
  const { day, type, title, time, notes } = req.body
  try {
    const result = await pool.query(
      'INSERT INTO itinerary_items (trip_id, day_number, type, title, time, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.params.id, day, type, title, time, notes]
    )
    const row = result.rows[0]
    res.json({
      id: row.id.toString(),
      day: row.day_number,
      type: row.type,
      title: row.title,
      time: row.time,
      notes: row.notes,
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
  const { title, amount, paidById, splitWithIds, receiptImage } = req.body
  try {
    const expResult = await pool.query(
      'INSERT INTO expenses (trip_id, title, amount, paid_by_id, receipt_image) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.params.id, title, amount, paidById, receiptImage]
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

app.listen(PORT, () => {
  console.log(`🚀 TripMate Backend running on http://localhost:${PORT}`)
})
