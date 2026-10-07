import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg

const isLocalhost =
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes('localhost') ||
  process.env.DATABASE_URL.includes('127.0.0.1')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocalhost ? false : { rejectUnauthorized: false },
})

// Auto-create database tables and columns
const initDB = async () => {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ DATABASE_URL is not set in server/.env yet.')
    return
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS trips (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        dates VARCHAR(255),
        invite_code VARCHAR(10) UNIQUE NOT NULL,
        budget NUMERIC(10, 2) DEFAULT 0,
        created_by INT REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Ensure budget column exists for existing trips
      ALTER TABLE trips ADD COLUMN IF NOT EXISTS budget NUMERIC(10, 2) DEFAULT 0;

      CREATE TABLE IF NOT EXISTS trip_members (
        id SERIAL PRIMARY KEY,
        trip_id INT REFERENCES trips(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'Member',
        UNIQUE(trip_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS itinerary_items (
        id SERIAL PRIMARY KEY,
        trip_id INT REFERENCES trips(id) ON DELETE CASCADE,
        day_number INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        time VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Additional columns for rich itinerary activities
      ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS location VARCHAR(255);
      ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS duration VARCHAR(100);
      ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 0;
      ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT '🎯';
      ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS participants TEXT DEFAULT 'All friends';

      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        trip_id INT REFERENCES trips(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        category VARCHAR(50) DEFAULT 'Food',
        paid_by_id INT REFERENCES users(id) ON DELETE CASCADE,
        receipt_image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Ensure category column exists for existing expenses
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'Food';

      CREATE TABLE IF NOT EXISTS expense_splits (
        id SERIAL PRIMARY KEY,
        expense_id INT REFERENCES expenses(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settlements (
        id SERIAL PRIMARY KEY,
        trip_id INT REFERENCES trips(id) ON DELETE CASCADE,
        from_user_id INT REFERENCES users(id) ON DELETE CASCADE,
        to_user_id INT REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS trip_messages (
        id SERIAL PRIMARY KEY,
        trip_id INT REFERENCES trips(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        tag VARCHAR(50) DEFAULT 'General',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS trip_locations (
        id SERIAL PRIMARY KEY,
        trip_id INT REFERENCES trips(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(50) DEFAULT 'Sightseeing',
        address TEXT,
        notes TEXT,
        is_visited BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log('✅ PostgreSQL Database connected and tables verified!')
  } catch (err) {
    console.error('❌ Database initialization error:', err.message)
  }
}

export { pool, initDB }
