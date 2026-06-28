import fs from 'fs';
import path from 'path';
import type { PoolConnection } from 'mysql2/promise';
import type { Product, StoreConfig, Order, OrderStatus, Review, ReviewStatus } from '../src/types';
import { normalizeProduct } from '../src/lib/products';
import { INITIAL_PRODUCTS, INITIAL_STORE_CONFIG } from '../src/data';
import { getPool } from './db';
import { isDbConfigured } from './env';

const STORE_FILE = path.join(process.cwd(), 'data-store.json');

export interface Catalogue {
  products: Product[];
  config: StoreConfig;
}

// ---------------------------------------------------------------------------
// JSON-file fallback store (used when MySQL is not configured)
// ---------------------------------------------------------------------------

interface JsonStoreShape {
  products: Product[];
  config: StoreConfig;
  orders: Order[];
  reviews: Review[];
  webhookEvents: string[];
  lastUpdated: string;
}

function readJsonStore(): JsonStoreShape {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
      return {
        products: (raw.products || []).map(normalizeProduct),
        config: raw.config || INITIAL_STORE_CONFIG,
        orders: raw.orders || [],
        reviews: raw.reviews || [],
        webhookEvents: raw.webhookEvents || [],
        lastUpdated: raw.lastUpdated || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error('[store] Failed reading data-store.json, reseeding:', err);
  }
  const seeded: JsonStoreShape = {
    products: INITIAL_PRODUCTS,
    config: INITIAL_STORE_CONFIG,
    orders: [],
    reviews: [],
    webhookEvents: [],
    lastUpdated: new Date().toISOString(),
  };
  writeJsonStore(seeded);
  return seeded;
}

function writeJsonStore(data: JsonStoreShape): void {
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// MySQL row mapping helpers
// ---------------------------------------------------------------------------

function asArray(v: any): any[] {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

function rowToProduct(row: any, variants: any[]): Product {
  return normalizeProduct({
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
    salePrice: row.sale_price != null ? Number(row.sale_price) : undefined,
    description: row.description || '',
    images: asArray(row.images),
    materials: asArray(row.materials),
    careInstructions: row.care_instructions || '',
    status: row.status,
    isFeatured: !!row.is_featured,
    badge: row.badge || undefined,
    sizeGuide: row.size_guide || undefined,
    variants: variants
      .filter((v) => v.product_id === row.id)
      .map((v) => ({ size: v.size, stock: Number(v.stock), sku: v.sku, soldOut: !!v.sold_out })),
  });
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

export async function ensureSeeded(): Promise<void> {
  if (!isDbConfigured()) {
    readJsonStore(); // creates the file if missing
    return;
  }
  const pool = getPool()!;
  
  // Check if products table exists, if not, execute schema.sql
  try {
    await pool.query('SELECT COUNT(*) AS n FROM products');
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) {
      console.log('[store] Products table does not exist. Initializing schema from schema.sql...');
      const schemaPath = path.join(process.cwd(), 'backend', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        // Split on semicolon while removing comments
        const queries = schemaSql
          .split(';')
          .map((q) => q.replace(/--.*$/gm, '').trim())
          .filter((q) => q.length > 0);
          
        for (const query of queries) {
          await pool.query(query);
        }
        console.log('[store] Schema initialized successfully.');
      } else {
        throw new Error(`schema.sql not found at ${schemaPath}`);
      }
    } else {
      throw err;
    }
  }

  // Idempotent migrations for databases created before these features existed.
  const addColumn = async (sql: string, label: string) => {
    try {
      await pool.query(sql);
    } catch (err: any) {
      // ER_DUP_FIELDNAME (1060) — column already present; ignore.
      if (err?.errno !== 1060) console.warn(`[store] ${label} migration:`, err?.message || err);
    }
  };
  await addColumn('ALTER TABLE product_variants ADD COLUMN sold_out TINYINT(1) NOT NULL DEFAULT 0', 'sold_out');
  await addColumn('ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(120) NULL', 'tracking_number');
  await addColumn('ALTER TABLE orders ADD COLUMN tracking_status VARCHAR(40) NULL', 'tracking_status');
  await pool.query(
    `CREATE TABLE IF NOT EXISTS reviews (
      id         VARCHAR(64)  NOT NULL PRIMARY KEY,
      product_id VARCHAR(64)  NOT NULL,
      author     VARCHAR(190) NOT NULL,
      rating     TINYINT      NOT NULL DEFAULT 5,
      title      VARCHAR(190) NULL,
      body       TEXT NULL,
      images     JSON NULL,
      verified   TINYINT(1)   NOT NULL DEFAULT 0,
      status     VARCHAR(20)  NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_review_product (product_id),
      KEY idx_review_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );

  const [rows] = await pool.query<any[]>('SELECT COUNT(*) AS n FROM products');
  if (rows[0].n === 0) {
    console.log('[store] Empty products table — seeding initial catalogue.');
    await saveCatalogue(INITIAL_PRODUCTS, INITIAL_STORE_CONFIG);
  }
  const [cfg] = await pool.query<any[]>('SELECT COUNT(*) AS n FROM store_config');
  if (cfg[0].n === 0) {
    await pool.query('INSERT INTO store_config (id, data) VALUES (1, ?)', [
      JSON.stringify(INITIAL_STORE_CONFIG),
    ]);
  }
}

// ---------------------------------------------------------------------------
// Catalogue read / write
// ---------------------------------------------------------------------------

export async function getCatalogue(): Promise<Catalogue> {
  if (!isDbConfigured()) {
    const s = readJsonStore();
    return { products: s.products, config: s.config };
  }
  const pool = getPool()!;
  const [prodRows] = await pool.query<any[]>('SELECT * FROM products ORDER BY sort_order ASC, created_at DESC');
  const [varRows] = await pool.query<any[]>('SELECT * FROM product_variants');
  const products = prodRows.map((r) => rowToProduct(r, varRows));
  const [cfgRows] = await pool.query<any[]>('SELECT data FROM store_config WHERE id = 1');
  const config: StoreConfig =
    cfgRows.length > 0 ? (typeof cfgRows[0].data === 'string' ? JSON.parse(cfgRows[0].data) : cfgRows[0].data) : INITIAL_STORE_CONFIG;
  return { products, config };
}

export async function saveCatalogue(products: Product[], config: StoreConfig): Promise<Catalogue> {
  const normalized = products.map(normalizeProduct);

  if (!isDbConfigured()) {
    const s = readJsonStore();
    s.products = normalized;
    s.config = config;
    s.lastUpdated = new Date().toISOString();
    writeJsonStore(s);
    return { products: normalized, config };
  }

  const pool = getPool()!;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Remove products no longer present
    const keepIds = normalized.map((p) => p.id);
    if (keepIds.length > 0) {
      const placeholders = keepIds.map(() => '?').join(',');
      await conn.query(`DELETE FROM products WHERE id NOT IN (${placeholders})`, keepIds);
    } else {
      await conn.query('DELETE FROM products');
    }

    let order = 0;
    for (const p of normalized) {
      await conn.query(
        `INSERT INTO products
          (id, slug, name, category, price, original_price, sale_price, description, images, materials, care_instructions, status, is_featured, badge, size_guide, sort_order)
         VALUES (:id,:slug,:name,:category,:price,:original_price,:sale_price,:description,:images,:materials,:care_instructions,:status,:is_featured,:badge,:size_guide,:sort_order)
         ON DUPLICATE KEY UPDATE
          slug=VALUES(slug), name=VALUES(name), category=VALUES(category), price=VALUES(price),
          original_price=VALUES(original_price), sale_price=VALUES(sale_price), description=VALUES(description),
          images=VALUES(images), materials=VALUES(materials), care_instructions=VALUES(care_instructions),
          status=VALUES(status), is_featured=VALUES(is_featured), badge=VALUES(badge), size_guide=VALUES(size_guide), sort_order=VALUES(sort_order)`,
        {
          id: p.id,
          slug: p.slug,
          name: p.name,
          category: p.category,
          price: p.price,
          original_price: p.originalPrice ?? null,
          sale_price: p.salePrice ?? null,
          description: p.description,
          images: JSON.stringify(p.images),
          materials: JSON.stringify(p.materials),
          care_instructions: p.careInstructions,
          status: p.status,
          is_featured: p.isFeatured ? 1 : 0,
          badge: p.badge ?? null,
          size_guide: p.sizeGuide ?? null,
          sort_order: order++,
        }
      );

      // Replace variants for this product
      await conn.query('DELETE FROM product_variants WHERE product_id = ?', [p.id]);
      for (const v of p.variants) {
        await conn.query(
          'INSERT INTO product_variants (product_id, size, stock, sku, sold_out) VALUES (?,?,?,?,?)',
          [p.id, v.size, Math.max(0, Number(v.stock) || 0), v.sku, v.soldOut ? 1 : 0]
        );
      }
    }

    await conn.query('INSERT INTO store_config (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)', [
      JSON.stringify(config),
    ]);

    await conn.commit();
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rollbackErr) {
      console.error('[store] Rollback failed:', rollbackErr);
    }
    throw err;
  } finally {
    conn.release();
  }
  return { products: normalized, config };
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export async function createOrder(order: Order): Promise<void> {
  if (!isDbConfigured()) {
    const s = readJsonStore();
    s.orders.unshift(order);
    writeJsonStore(s);
    return;
  }
  const pool = getPool()!;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO orders
        (id, reference_id, status, subtotal, shipping_fee, shipping_method, gst_included, total, currency,
         customer_name, customer_email, customer_phone, customer_address, payment_intent_id)
       VALUES (:id,:reference_id,:status,:subtotal,:shipping_fee,:shipping_method,:gst_included,:total,:currency,
         :customer_name,:customer_email,:customer_phone,:customer_address,:payment_intent_id)`,
      {
        id: order.id,
        reference_id: order.referenceId,
        status: order.status,
        subtotal: order.subtotal,
        shipping_fee: order.shippingFee,
        shipping_method: order.shippingMethod,
        gst_included: order.gstIncluded,
        total: order.total,
        currency: order.currency,
        customer_name: order.customerName,
        customer_email: order.customerEmail,
        customer_phone: order.customerPhone,
        customer_address: order.customerAddress,
        payment_intent_id: order.paymentIntentId ?? null,
      }
    );
    for (const it of order.items) {
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, name, size, sku, quantity, price, category) VALUES (?,?,?,?,?,?,?,?)',
        [order.id, it.productId, it.name, it.size, it.sku ?? null, it.quantity, it.price, it.category ?? null]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getOrderByPaymentIntent(pi: string): Promise<Order | null> {
  if (!isDbConfigured()) {
    const s = readJsonStore();
    return s.orders.find((o) => o.paymentIntentId === pi) || null;
  }
  const pool = getPool()!;
  const [rows] = await pool.query<any[]>('SELECT * FROM orders WHERE payment_intent_id = ? LIMIT 1', [pi]);
  if (rows.length === 0) return null;
  return hydrateOrder(rows[0]);
}

async function hydrateOrder(row: any): Promise<Order> {
  const pool = getPool()!;
  const [items] = await pool.query<any[]>('SELECT * FROM order_items WHERE order_id = ?', [row.id]);
  return {
    id: row.id,
    referenceId: row.reference_id,
    status: row.status,
    subtotal: Number(row.subtotal),
    shippingFee: Number(row.shipping_fee),
    shippingMethod: row.shipping_method,
    gstIncluded: Number(row.gst_included),
    total: Number(row.total),
    currency: row.currency,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    customerAddress: row.customer_address,
    paymentIntentId: row.payment_intent_id || undefined,
    trackingNumber: row.tracking_number || undefined,
    trackingStatus: row.tracking_status || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: items.map((it) => ({
      productId: it.product_id,
      name: it.name,
      size: it.size,
      sku: it.sku || undefined,
      quantity: Number(it.quantity),
      price: Number(it.price),
      category: it.category || undefined,
    })),
  };
}

export async function listOrders(statusFilter?: OrderStatus): Promise<Order[]> {
  if (!isDbConfigured()) {
    const s = readJsonStore();
    return statusFilter ? s.orders.filter((o) => o.status === statusFilter) : s.orders;
  }
  const pool = getPool()!;
  const [rows] = statusFilter
    ? await pool.query<any[]>('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC', [statusFilter])
    : await pool.query<any[]>('SELECT * FROM orders ORDER BY created_at DESC');
  return Promise.all(rows.map(hydrateOrder));
}

/** Update an order's status (matched by paymentIntentId or id). Returns the new status applied. */
export async function setOrderStatus(opts: { id?: string; paymentIntentId?: string; status: OrderStatus }): Promise<Order | null> {
  if (!isDbConfigured()) {
    const s = readJsonStore();
    const o = s.orders.find(
      (x) => (opts.id && x.id === opts.id) || (opts.paymentIntentId && x.paymentIntentId === opts.paymentIntentId)
    );
    if (!o) return null;
    o.status = opts.status;
    o.updatedAt = new Date().toISOString();
    writeJsonStore(s);
    return o;
  }
  const pool = getPool()!;
  if (opts.paymentIntentId) {
    await pool.query('UPDATE orders SET status = ? WHERE payment_intent_id = ?', [opts.status, opts.paymentIntentId]);
    return getOrderByPaymentIntent(opts.paymentIntentId);
  }
  await pool.query('UPDATE orders SET status = ? WHERE id = ?', [opts.status, opts.id]);
  const [rows] = await pool.query<any[]>('SELECT * FROM orders WHERE id = ? LIMIT 1', [opts.id]);
  return rows.length ? hydrateOrder(rows[0]) : null;
}

/** Set (or clear) the Australia Post tracking number + delivery stage for an order. */
export async function updateOrderTracking(
  id: string,
  opts: { trackingNumber?: string; trackingStatus?: string }
): Promise<Order | null> {
  const trackingNumber = opts.trackingNumber?.trim() || null;
  const trackingStatus = opts.trackingStatus?.trim() || null;
  if (!isDbConfigured()) {
    const s = readJsonStore();
    const o = s.orders.find((x) => x.id === id);
    if (!o) return null;
    o.trackingNumber = trackingNumber || undefined;
    o.trackingStatus = trackingStatus || undefined;
    o.updatedAt = new Date().toISOString();
    writeJsonStore(s);
    return o;
  }
  const pool = getPool()!;
  await pool.query('UPDATE orders SET tracking_number = ?, tracking_status = ? WHERE id = ?', [
    trackingNumber,
    trackingStatus,
    id,
  ]);
  const [rows] = await pool.query<any[]>('SELECT * FROM orders WHERE id = ? LIMIT 1', [id]);
  return rows.length ? hydrateOrder(rows[0]) : null;
}

/** Reduce a phone number to comparable digits. */
function normalizePhone(phone: string): string {
  return (phone || '').replace(/\D/g, '');
}

/** Loose phone match tolerant of +61 / 0 prefixes and spacing — compares trailing digits. */
function phoneMatches(stored: string, targetDigits: string): boolean {
  const s = normalizePhone(stored);
  if (!s || targetDigits.length < 6) return false;
  const a = s.slice(-9);
  const b = targetDigits.slice(-9);
  return a === b || s.endsWith(targetDigits) || targetDigits.endsWith(s);
}

/** All orders whose customer phone matches the supplied number (newest first). */
export async function listOrdersByPhone(phone: string): Promise<Order[]> {
  const target = normalizePhone(phone);
  if (target.length < 6) return [];
  if (!isDbConfigured()) {
    const s = readJsonStore();
    return s.orders.filter((o) => phoneMatches(o.customerPhone, target));
  }
  const pool = getPool()!;
  const [rows] = await pool.query<any[]>('SELECT * FROM orders ORDER BY created_at DESC');
  const matched = rows.filter((r) => phoneMatches(r.customer_phone, target));
  return Promise.all(matched.map(hydrateOrder));
}

/** Decrement per-size stock for each line item of a paid order.
 *  Auto-flips a product to "out_of_stock" once every size is depleted/sold out. */
export async function decrementStockForOrder(order: Order): Promise<void> {
  if (!isDbConfigured()) {
    const s = readJsonStore();
    const touched = new Set<string>();
    for (const it of order.items) {
      const p = s.products.find((x) => x.id === it.productId);
      const v = p?.variants.find((vv) => vv.size === it.size);
      if (v) v.stock = Math.max(0, v.stock - it.quantity);
      if (it.productId) touched.add(it.productId);
    }
    // Auto out-of-stock when nothing buyable remains.
    for (const id of touched) {
      const p = s.products.find((x) => x.id === id);
      if (p && p.status === 'active') {
        const available = p.variants.reduce((sum, v) => sum + (v.soldOut ? 0 : v.stock), 0);
        if (available <= 0) p.status = 'out_of_stock';
      }
    }
    writeJsonStore(s);
    return;
  }
  const pool = getPool()!;
  const touched = new Set<string>();
  for (const it of order.items) {
    await pool.query(
      'UPDATE product_variants SET stock = GREATEST(stock - ?, 0) WHERE product_id = ? AND size = ?',
      [it.quantity, it.productId, it.size]
    );
    if (it.productId) touched.add(it.productId);
  }
  // Auto out-of-stock when no buyable units remain across all sizes.
  for (const id of touched) {
    await pool.query(
      `UPDATE products SET status = 'out_of_stock'
       WHERE id = ? AND status = 'active'
         AND (SELECT COALESCE(SUM(CASE WHEN sold_out = 1 THEN 0 ELSE stock END), 0)
              FROM product_variants WHERE product_id = ?) <= 0`,
      [id, id]
    );
  }
}

/** Record a Stripe webhook event id. Returns true if this is the first time (process it), false if duplicate. */
export async function recordWebhookEvent(eventId: string, type: string): Promise<boolean> {
  if (!isDbConfigured()) {
    const s = readJsonStore();
    if (s.webhookEvents.includes(eventId)) return false;
    s.webhookEvents.push(eventId);
    writeJsonStore(s);
    return true;
  }
  const pool = getPool()!;
  const [res] = await pool.query<any>('INSERT IGNORE INTO webhook_events (id, type) VALUES (?, ?)', [eventId, type]);
  return res.affectedRows === 1;
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

function rowToReview(row: any): Review {
  return {
    id: row.id,
    productId: row.product_id,
    author: row.author,
    rating: Number(row.rating),
    title: row.title || undefined,
    body: row.body || '',
    images: asArray(row.images),
    verified: !!row.verified,
    status: row.status,
    createdAt: typeof row.created_at === 'string' ? row.created_at : new Date(row.created_at).toISOString(),
  };
}

/** List reviews. Without a status filter returns everything (admin); pass 'approved' for the storefront. */
export async function listReviews(opts: { productId?: string; status?: ReviewStatus } = {}): Promise<Review[]> {
  if (!isDbConfigured()) {
    const s = readJsonStore();
    return s.reviews
      .filter((r) => (opts.productId ? r.productId === opts.productId : true))
      .filter((r) => (opts.status ? r.status === opts.status : true))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  const pool = getPool()!;
  const where: string[] = [];
  const params: any[] = [];
  if (opts.productId) { where.push('product_id = ?'); params.push(opts.productId); }
  if (opts.status) { where.push('status = ?'); params.push(opts.status); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query<any[]>(`SELECT * FROM reviews ${clause} ORDER BY created_at DESC`, params);
  return rows.map(rowToReview);
}

export async function createReview(review: Review): Promise<void> {
  if (!isDbConfigured()) {
    const s = readJsonStore();
    s.reviews.unshift(review);
    writeJsonStore(s);
    return;
  }
  const pool = getPool()!;
  await pool.query(
    `INSERT INTO reviews (id, product_id, author, rating, title, body, images, verified, status)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      review.id,
      review.productId,
      review.author,
      review.rating,
      review.title ?? null,
      review.body,
      JSON.stringify(review.images || []),
      review.verified ? 1 : 0,
      review.status,
    ]
  );
}

async function getReviewById(id: string): Promise<Review | null> {
  if (!isDbConfigured()) {
    const s = readJsonStore();
    return s.reviews.find((r) => r.id === id) || null;
  }
  const pool = getPool()!;
  const [rows] = await pool.query<any[]>('SELECT * FROM reviews WHERE id = ? LIMIT 1', [id]);
  return rows.length ? rowToReview(rows[0]) : null;
}

export async function setReviewStatus(id: string, status: ReviewStatus): Promise<Review | null> {
  if (!isDbConfigured()) {
    const s = readJsonStore();
    const r = s.reviews.find((x) => x.id === id);
    if (!r) return null;
    r.status = status;
    writeJsonStore(s);
    return r;
  }
  const pool = getPool()!;
  await pool.query('UPDATE reviews SET status = ? WHERE id = ?', [status, id]);
  return getReviewById(id);
}

export async function setReviewVerified(id: string, verified: boolean): Promise<Review | null> {
  if (!isDbConfigured()) {
    const s = readJsonStore();
    const r = s.reviews.find((x) => x.id === id);
    if (!r) return null;
    r.verified = verified;
    writeJsonStore(s);
    return r;
  }
  const pool = getPool()!;
  await pool.query('UPDATE reviews SET verified = ? WHERE id = ?', [verified ? 1 : 0, id]);
  return getReviewById(id);
}

export async function deleteReview(id: string): Promise<boolean> {
  if (!isDbConfigured()) {
    const s = readJsonStore();
    const before = s.reviews.length;
    s.reviews = s.reviews.filter((r) => r.id !== id);
    writeJsonStore(s);
    return s.reviews.length < before;
  }
  const pool = getPool()!;
  const [res] = await pool.query<any>('DELETE FROM reviews WHERE id = ?', [id]);
  return res.affectedRows > 0;
}
