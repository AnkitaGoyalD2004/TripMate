import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import 'dotenv/config'
import { initDB } from './db.js'

// Route Handlers
import authRoutes from './routes/auth.routes.js'
import tripsRoutes from './routes/trips.routes.js'
import itineraryRoutes from './routes/itinerary.routes.js'
import expensesRoutes from './routes/expenses.routes.js'
import chatRoutes from './routes/chat.routes.js'
import locationsRoutes from './routes/locations.routes.js'

// WebSocket Setup
import { setupChatSockets } from './sockets/chat.socket.js'

const app = express()
const PORT = process.env.PORT || 5001

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

// Make io accessible to controllers via req.app.get('io')
app.set('io', io)

// Middlewares
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Initialize Database Tables
initDB()

// Initialize WebSockets
setupChatSockets(io)

// Mount API Routes
app.use('/api/auth', authRoutes)
app.use('/api/trips', tripsRoutes)
app.use('/api/trips', itineraryRoutes)
app.use('/api/trips', expensesRoutes)
app.use('/api/trips', chatRoutes)
app.use('/api/trips', locationsRoutes)

server.listen(PORT, () => {
  console.log(`🚀 TripMate Backend (with WebSockets) running on http://localhost:${PORT}`)
})
