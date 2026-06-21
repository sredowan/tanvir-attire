import fs from 'fs';
import path from 'path';
import type { PoolConnection } from 'mysql2/promise';
import type { Product, StoreConfig, Order, OrderStatus } from '../src/types';
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
      .map((v) => ({ size: v.size, stock: Number(v.stock), sku: v.sku })),
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
          'INSERT INTO product_variants (product_id, size, stock, sku) VALUES (?,?,?,?)',
          [p.id, v.size, Math.max(0, Number(v.stock) || 0), v.sku]
        );
      }
    }

    await conn.query('INSERT INTO store_config (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)', [
      JSON.stringify(config),
    ]);

    await conn.commit();
  } catch (err) {
    await conn.rollback();
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

/** Decrement per-size stock for each line item of a paid order. */
export async function decrementStockForOrder(order: Order): Promise<void> {
  if (!isDbConfigured()) {
    const s = readJsonStore();
    for (const it of order.items) {
      const p = s.products.find((x) => x.id === it.productId);
      const v = p?.variants.find((vv) => vv.size === it.size);
      if (v) v.stock = Math.max(0, v.stock - it.quantity);
    }
    writeJsonStore(s);
    return;
  }
  const pool = getPool()!;
  for (const it of order.items) {
    await pool.query(
      'UPDATE product_variants SET stock = GREATEST(stock - ?, 0) WHERE product_id = ? AND size = ?',
      [it.quantity, it.productId, it.size]
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
