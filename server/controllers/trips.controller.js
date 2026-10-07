import { pool } from '../db.js'

// Get all trips for a user
export async function getTrips(req, res) {
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
}

// Create a new trip
export async function createTrip(req, res) {
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
}

// Update trip budget
export async function updateBudget(req, res) {
  const { budget } = req.body
  try {
    await pool.query('UPDATE trips SET budget = $1 WHERE id = $2', [budget, req.params.id])
    res.json({ success: true, budget: parseFloat(budget) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Join trip with code
export async function joinTrip(req, res) {
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
}

// Delete trip
export async function deleteTrip(req, res) {
  try {
    await pool.query('DELETE FROM trips WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Add member to trip
export async function addMember(req, res) {
  const { name } = req.body
  try {
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
}

// Remove member
export async function removeMember(req, res) {
  try {
    await pool.query('DELETE FROM trip_members WHERE trip_id = $1 AND user_id = $2', [
      req.params.id,
      req.params.userId,
    ])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Update member role
export async function updateMemberRole(req, res) {
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
}
