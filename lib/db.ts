import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required. See .env.example.');

const globalForPg = globalThis as unknown as { railpulsePool?: pg.Pool };
export const pool = globalForPg.railpulsePool ?? new pg.Pool({ connectionString });
if (process.env.NODE_ENV !== 'production') globalForPg.railpulsePool = pool;
