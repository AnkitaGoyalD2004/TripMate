import { pool } from '../db.js'
import { redisClient } from '../redis.js'

export function setupChatSockets(io) {
  io.on('connection', (socket) => {
    // 1. Join a trip chat room & track live squad presence in Redis
    socket.on('join_trip', async (payload) => {
      const tripId = typeof payload === 'object' ? payload.tripId : payload
      const userId = typeof payload === 'object' ? payload.userId : null
      const userName = typeof payload === 'object' ? payload.userName : null

      socket.join(`trip_${tripId}`)
      socket.data = { tripId, userId, userName }

      if (userId && userName && redisClient.status === 'ready') {
        try {
          const memberKey = JSON.stringify({ userId: userId.toString(), userName })
          await redisClient.sadd(`trip:${tripId}:online_users`, memberKey)
          await redisClient.expire(`trip:${tripId}:online_users`, 86400)

          const membersRaw = await redisClient.smembers(`trip:${tripId}:online_users`)
          const onlineMembers = membersRaw.map((m) => JSON.parse(m))
          io.to(`trip_${tripId}`).emit('squad_presence', onlineMembers)
        } catch (err) {
          console.warn('Redis presence join error:', err.message)
        }
      }
    })

    // 2. Leave a trip chat room
    socket.on('leave_trip', async (payload) => {
      const tripId = typeof payload === 'object' ? payload.tripId : payload
      socket.leave(`trip_${tripId}`)

      if (socket.data?.userId && redisClient.status === 'ready') {
        try {
          const memberKey = JSON.stringify({
            userId: socket.data.userId.toString(),
            userName: socket.data.userName,
          })
          await redisClient.srem(`trip:${tripId}:online_users`, memberKey)
          const membersRaw = await redisClient.smembers(`trip:${tripId}:online_users`)
          const onlineMembers = membersRaw.map((m) => JSON.parse(m))
          io.to(`trip_${tripId}`).emit('squad_presence', onlineMembers)
        } catch (err) {
          console.warn('Redis presence leave error:', err.message)
        }
      }
    })

    // 3. Auto-cleanup on client disconnect
    socket.on('disconnect', async () => {
      const { tripId, userId, userName } = socket.data || {}
      if (tripId && userId && redisClient.status === 'ready') {
        try {
          const memberKey = JSON.stringify({ userId: userId.toString(), userName })
          await redisClient.srem(`trip:${tripId}:online_users`, memberKey)
          const membersRaw = await redisClient.smembers(`trip:${tripId}:online_users`)
          const onlineMembers = membersRaw.map((m) => JSON.parse(m))
          io.to(`trip_${tripId}`).emit('squad_presence', onlineMembers)
        } catch (err) {
          console.warn('Redis presence disconnect error:', err.message)
        }
      }
    })

    // 4. Real-time typing indicators
    socket.on('typing', ({ tripId, userName }) => {
      socket.to(`trip_${tripId}`).emit('user_typing', userName)
    })

    socket.on('stop_typing', ({ tripId }) => {
      socket.to(`trip_${tripId}`).emit('user_stop_typing')
    })

    // 5. Send message directly over WebSocket
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
