// Centralised, env-driven configuration. Nothing secret is hardcoded here —
// values come from process.env. We load dotenv HERE (at the top of the first
// backend module to evaluate) so ENV captures populated values regardless of
// import order.
import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: Number(process.env.PORT) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Public site origin, used to build absolute links in emails (e.g. order tracking).
  SITE_URL: (process.env.SITE_URL || 'https://tanvirattire.com.au').replace(/\/+$/, ''),

  // --- MySQL (Hostinger remote DB). When DB_HOST is empty the app falls back
  // to a local JSON file store so dev works without a database. ---
  DB_HOST: process.env.DB_HOST || '',
  DB_PORT: Number(process.env.DB_PORT) || 3306,
  DB_NAME: process.env.DB_NAME || '',
  DB_USER: process.env.DB_USER || '',
  DB_PASS: process.env.DB_PASS || '',

  // --- Stripe ---
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',

  // --- SMTP (Hostinger mailbox via nodemailer) ---
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: Number(process.env.SMTP_PORT) || 465,
  SMTP_SECURE: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || 'Tanvir Attire <orders@tanvirattire.com.au>',
  // New-order notifications are always sent to these two recipients.
  ORDER_NOTIFY_TO:
    process.env.ORDER_NOTIFY_TO || 'aarsayem002@gmail.com, Tanvirmahmudparvez@gmail.com',

  // --- Admin auth ---
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@tanvirattire.com.au',
  // Plaintext fallback for first-run/dev. CHANGE in production via env.
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'luxury_legacy',
  // scrypt hash (preferred over plaintext when present): "<saltHex>:<hashHex>"
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH || '',
  // HMAC secret for signing admin session tokens.
  ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET || '',
};

export function isDbConfigured(): boolean {
  return !!(ENV.DB_HOST && ENV.DB_NAME && ENV.DB_USER);
}

export function isStripeConfigured(): boolean {
  return !!ENV.STRIPE_SECRET_KEY && ENV.STRIPE_SECRET_KEY !== 'MY_STRIPE_SECRET_KEY';
}

export function isSmtpConfigured(): boolean {
  return !!(ENV.SMTP_HOST && ENV.SMTP_USER && ENV.SMTP_PASS);
}
