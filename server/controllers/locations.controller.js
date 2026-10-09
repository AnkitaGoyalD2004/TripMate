import { pool } from '../db.js'
import { getCached, setCached, delCached } from '../redis.js'

// Get all saved locations for a trip
export async function getLocations(req, res) {
  const cacheKey = `trip:${req.params.id}:locations`
  try {
    // 1. Check Redis Cache First
    const cached = await getCached(cacheKey)
    if (cached) {
      res.set('X-Cache', 'HIT')
      return res.json(cached)
    }

    // 2. Cache Miss: Query Database
    const result = await pool.query(
      `SELECT id, trip_id, name, category, address, notes, is_visited, created_at
       FROM trip_locations
       WHERE trip_id = $1
       ORDER BY created_at ASC`,
      [req.params.id]
    )

    const locations = result.rows.map((row) => ({
      id: row.id.toString(),
      tripId: row.trip_id.toString(),
      name: row.name,
      category: row.category || 'Sightseeing',
      address: row.address || '',
      notes: row.notes || '',
      isVisited: !!row.is_visited,
    }))

    // 3. Save to Redis Cache (TTL: 180s)
    await setCached(cacheKey, locations, 180)
    res.set('X-Cache', 'MISS')
    res.json(locations)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Add a new location
export async function addLocation(req, res) {
  const { name, category, address, notes } = req.body
  if (!name || !name.trim()) return res.status(400).json({ error: 'Location name is required' })

  try {
    const result = await pool.query(
      `INSERT INTO trip_locations (trip_id, name, category, address, notes, is_visited)
       VALUES ($1, $2, $3, $4, $5, false) RETURNING *`,
      [req.params.id, name.trim(), category || 'Sightseeing', address || '', notes || '']
    )
    const row = result.rows[0]

    // Invalidate Redis Cache
    await delCached(`trip:${req.params.id}:locations`)

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
}

// Toggle visited status
export async function toggleLocationVisited(req, res) {
  const { isVisited } = req.body
  try {
    const result = await pool.query(
      'UPDATE trip_locations SET is_visited = $1 WHERE id = $2 AND trip_id = $3 RETURNING *',
      [isVisited, req.params.locId, req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Location not found' })
    const row = result.rows[0]

    // Invalidate Redis Cache
    await delCached(`trip:${req.params.id}:locations`)

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
}

// Delete a location
export async function deleteLocation(req, res) {
  try {
    await pool.query('DELETE FROM trip_locations WHERE id = $1 AND trip_id = $2', [
      req.params.locId,
      req.params.id,
    ])

    // Invalidate Redis Cache
    await delCached(`trip:${req.params.id}:locations`)

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
