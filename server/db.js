const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/vecinapp';
const useSSL = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      accepted_terms BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS commerces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      address TEXT,
      neighborhood TEXT,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      accepted_terms BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS promotions (
      id TEXT PRIMARY KEY,
      commerce_id TEXT NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
      commerce_name TEXT,
      neighborhood TEXT,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      category TEXT,
      discount_type TEXT,
      discount_value TEXT,
      valid_from TEXT,
      valid_to TEXT,
      promo_code TEXT,
      max_coupons INTEGER,
      redeemed_count INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions (promo_code);
    CREATE INDEX IF NOT EXISTS idx_promotions_commerce ON promotions (commerce_id);
  `);
}

module.exports = {
  pool,
  initDb
};
