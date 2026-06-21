import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { ENV } from './env';

function sessionSecret(): string {
  return ENV.ADMIN_SESSION_SECRET || `ta-session-${ENV.ADMIN_PASSWORD}-${ENV.ADMIN_EMAIL}`;
}

/** Verify a password against the configured credential (scrypt hash preferred, else plaintext). */
export function passwordMatches(password: string): boolean {
  if (ENV.ADMIN_PASSWORD_HASH) {
    const [saltHex, hashHex] = ENV.ADMIN_PASSWORD_HASH.split(':');
    if (!saltHex || !hashHex) return false;
    try {
      const derived = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
      const expected = Buffer.from(hashHex, 'hex');
      return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
    } catch {
      return false;
    }
  }
  // Plaintext fallback (dev / first-run). Constant-time compare.
  const a = Buffer.from(password);
  const b = Buffer.from(ENV.ADMIN_PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function credentialsValid(email: string, password: string): boolean {
  const emailOk = (email || '').trim().toLowerCase() === ENV.ADMIN_EMAIL.trim().toLowerCase();
  return emailOk && passwordMatches(password || '');
}

/** Helper to generate a scrypt hash string for ADMIN_PASSWORD_HASH (used by the gen-admin-hash script). */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function issueToken(email: string, ttlMs = 1000 * 60 * 60 * 12): string {
  const payload = b64url(JSON.stringify({ email, exp: Date.now() + ttlMs }));
  const sig = b64url(crypto.createHmac('sha256', sessionSecret()).update(payload).digest());
  return `${payload}.${sig}`;
}

export function verifyToken(token: string | undefined): { email: string } | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = b64url(crypto.createHmac('sha256', sessionSecret()).update(payload).digest());
  // constant-time compare of signatures
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    if (typeof data.exp !== 'number' || Date.now() > data.exp) return null;
    return { email: data.email };
  } catch {
    return null;
  }
}

/** Express middleware: require a valid admin bearer token. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const session = verifyToken(token);
  if (!session) {
    return res.status(401).json({ success: false, message: 'Admin authentication required.' });
  }
  (req as any).admin = session;
  next();
}
