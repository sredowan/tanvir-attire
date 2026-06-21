import mysql from 'mysql2/promise';
import { ENV, isDbConfigured } from './env';

let pool: mysql.Pool | null = null;

/** Lazily create (or reuse) the MySQL connection pool. Returns null when DB is unconfigured. */
export function getPool(): mysql.Pool | null {
  if (!isDbConfigured()) return null;
  if (pool) return pool;
  pool = mysql.createPool({
    host: ENV.DB_HOST,
    port: ENV.DB_PORT,
    database: ENV.DB_NAME,
    user: ENV.DB_USER,
    password: ENV.DB_PASS,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    namedPlaceholders: true,
    // Hostinger remote MySQL is reachable over TLS; allow it without a CA bundle.
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
  return pool;
}

/** Verify connectivity once at startup. Never throws — returns a status string. */
export async function pingDb(): Promise<'ok' | 'unconfigured' | string> {
  const p = getPool();
  if (!p) return 'unconfigured';
  try {
    const conn = await p.getConnection();
    await conn.ping();
    conn.release();
    return 'ok';
  } catch (err: any) {
    return err?.message || 'connection failed';
  }
}
