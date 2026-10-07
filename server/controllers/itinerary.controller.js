import { pool } from '../db.js'

// Get itinerary for a trip
export async function getItinerary(req, res) {
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
}

// Add itinerary item
export async function addItineraryItem(req, res) {
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
}

// Update itinerary item
export async function updateItineraryItem(req, res) {
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
}

// Delete itinerary item
export async function deleteItineraryItem(req, res) {
  try {
    await pool.query('DELETE FROM itinerary_items WHERE id = $1', [req.params.itemId])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
