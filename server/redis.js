import Redis from 'ioredis'
import 'dotenv/config'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

// Helper to create Redis connection with robust reconnect logic
export function createClient(customOptions = {}) {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy(times) {
      // Exponential backoff up to 3 seconds
      return Math.min(times * 100, 3000)
    },
    lazyConnect: false,
    ...customOptions,
  })

  client.on('error', (err) => {
    // Only log once or in concise format to avoid console spam if Redis goes down
    if (client.status === 'reconnecting') return
    console.warn('⚠️  Redis Client Notice:', err.message)
  })

  return client
}

// 1. Primary Redis Client (for Cache & Ephemeral State)
export const redisClient = createClient()

redisClient.on('connect', () => {
  console.log('⚡ Redis connected successfully! (In-Memory Cache & Presence Active)')
})

// 2. Dedicated Pub/Sub Clients for Socket.io Redis Adapter
export const pubClient = createClient()
export const subClient = pubClient.duplicate()

/**
 * Cache Helper: Get and parse JSON from Redis
 * Returns null if key doesn't exist or on error
 */
export async function getCached(key) {
  try {
    if (redisClient.status !== 'ready') return null
    const data = await redisClient.get(key)
    return data ? JSON.parse(data) : null
  } catch (err) {
    console.warn(`Redis getCached error for key ${key}:`, err.message)
    return null
  }
}

/**
 * Cache Helper: Set JSON data with a TTL in seconds (default 120s)
 */
export async function setCached(key, value, ttlSeconds = 120) {
  try {
    if (redisClient.status !== 'ready') return
    const serialized = JSON.stringify(value)
    if (ttlSeconds > 0) {
      await redisClient.set(key, serialized, 'EX', ttlSeconds)
    } else {
      await redisClient.set(key, serialized)
    }
  } catch (err) {
    console.warn(`Redis setCached error for key ${key}:`, err.message)
  }
}

/**
 * Cache Helper: Delete one or multiple keys
 */
export async function delCached(...keys) {
  try {
    if (redisClient.status !== 'ready' || keys.length === 0) return
    const validKeys = keys.filter(Boolean)
    if (validKeys.length > 0) {
      await redisClient.del(...validKeys)
    }
  } catch (err) {
    console.warn('Redis delCached error:', err.message)
  }
}

/**
 * Cache Helper: Invalidate all keys matching a pattern (e.g. `trip:12:*`)
 */
export async function invalidatePattern(pattern) {
  try {
    if (redisClient.status !== 'ready') return
    const keys = await redisClient.keys(pattern)
    if (keys.length > 0) {
      await redisClient.del(...keys)
    }
  } catch (err) {
    console.warn(`Redis invalidatePattern error for pattern ${pattern}:`, err.message)
  }
}
