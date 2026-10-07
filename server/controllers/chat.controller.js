import { pool } from '../db.js'

// Get all messages for a trip
export async function getMessages(req, res) {
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
}

// Send a new message via REST
export async function sendMessage(req, res) {
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

    const io = req.app.get('io')
    if (io) {
      io.to(`trip_${req.params.id}`).emit('receive_message', newMsg)
    }

    res.json(newMsg)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
