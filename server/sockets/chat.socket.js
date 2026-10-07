import { pool } from '../db.js'

export function setupChatSockets(io) {
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
}
