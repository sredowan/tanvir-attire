import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import type { Order, OrderItem, OrderStatus, Product, StoreConfig, Review, ReviewStatus } from './src/types';
import { FULFILMENT_STATUSES } from './src/types';
import { effectivePrice, variantForSize } from './src/lib/products';
import { ENV, isStripeConfigured, isDbConfigured, isSmtpConfigured } from './backend/env';
import { pingDb } from './backend/db';
import {
  ensureSeeded,
  getCatalogue,
  saveCatalogue,
  createOrder,
  getOrderByPaymentIntent,
  listOrders,
  setOrderStatus,
  updateOrderTracking,
  listOrdersByPhone,
  decrementStockForOrder,
  recordWebhookEvent,
  listReviews,
  createReview,
  setReviewStatus,
  setReviewVerified,
  deleteReview,
} from './backend/store';
import { getStripe } from './backend/payments';
import { sendNewOrderEmail, sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from './backend/email';
import { credentialsValid, issueToken, requireAdmin } from './backend/auth';

dotenv.config();

const app = express();
const PORT = ENV.PORT;
const PUBLISHABLE_KEY = process.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const SHIPPING_FEE = 10.0;
const SHIPPING_METHOD = 'Flat Rate Delivery';

// ---------------------------------------------------------------------------
// Stripe webhook — MUST be registered with the raw body parser BEFORE json().
// ---------------------------------------------------------------------------
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ received: false, message: 'Stripe not configured.' });
  if (!ENV.STRIPE_WEBHOOK_SECRET) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not set — refusing to process unverified events.');
    return res.status(500).json({ received: false, message: 'Webhook secret not configured.' });
  }

  let event: any;
  try {
    const sig = req.headers['stripe-signature'] as string;
    event = stripe.webhooks.constructEvent(req.body, sig, ENV.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('[webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Idempotency — process each event id at most once.
    const isNew = await recordWebhookEvent(event.id, event.type);
    if (!isNew) return res.json({ received: true, duplicate: true });

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        const order = await getOrderByPaymentIntent(pi.id);
        if (order && order.status !== 'Paid') {
          const updated = await setOrderStatus({ paymentIntentId: pi.id, status: 'Paid' });
          if (updated) {
            await decrementStockForOrder(updated);
            await sendNewOrderEmail(updated);
            await sendOrderConfirmationEmail(updated);
          }
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        await setOrderStatus({ paymentIntentId: event.data.object.id, status: 'Failed' });
        break;
      }
      case 'payment_intent.canceled': {
        await setOrderStatus({ paymentIntentId: event.data.object.id, status: 'Cancelled' });
        break;
      }
      case 'charge.refunded': {
        const pi = event.data.object.payment_intent;
        if (pi) await setOrderStatus({ paymentIntentId: pi, status: 'Refunded' });
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  } catch (err: any) {
    console.error('[webhook] Handler error:', err);
    res.status(500).json({ received: false });
  }
});

app.use(express.json());

// ---------------------------------------------------------------------------
// Image uploads (admin). Files are stored on disk under /uploads and served
// statically. Returns a relative URL the admin saves onto the product.
// ---------------------------------------------------------------------------
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

const uploader = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
      cb(null, `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (_req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

app.post('/api/admin/upload', requireAdmin, uploader.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image file received (must be an image under 8MB).' });
  }
  res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

// Public: photo upload for customer reviews. Returns a relative URL the review form attaches.
app.post('/api/reviews/upload', uploader.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image file received (must be an image under 8MB).' });
  }
  res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

// ---------------------------------------------------------------------------
// Public: storefront catalogue + configuration
// ---------------------------------------------------------------------------
app.get('/api/ecommerce-config', async (_req, res) => {
  try {
    const { products, config } = await getCatalogue();
    res.json({
      success: true,
      products,
      config,
      stripeConfigured: isStripeConfigured(),
      publishableKey: PUBLISHABLE_KEY,
    });
  } catch (err: any) {
    console.error('[config] read error:', err);
    res.status(500).json({ success: false, message: 'Failed to load catalogue.' });
  }
});

// ---------------------------------------------------------------------------
// Admin auth
// ---------------------------------------------------------------------------
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!credentialsValid(email, password)) {
    return res.status(401).json({ success: false, message: 'Invalid admin email or password.' });
  }
  return res.json({ success: true, token: issueToken(ENV.ADMIN_EMAIL), email: ENV.ADMIN_EMAIL });
});

// Admin: save catalogue + config
app.post('/api/ecommerce-config', requireAdmin, async (req, res) => {
  const { products, config } = req.body || {};
  if (!Array.isArray(products) || !config) {
    return res.status(400).json({ success: false, message: 'Products array and config are required.' });
  }
  try {
    const saved = await saveCatalogue(products as Product[], config as StoreConfig);
    res.json({ success: true, message: 'Catalogue synchronised.', ...saved });
  } catch (err: any) {
    console.error('[config] save error:', err);
    res.status(500).json({ success: false, message: 'Failed to persist catalogue.' });
  }
});

// Admin: orders list (optional ?status=)
app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    const status = (req.query.status as OrderStatus) || undefined;
    const orders = await listOrders(status);
    res.json({ success: true, orders });
  } catch (err: any) {
    console.error('[orders] list error:', err);
    res.status(500).json({ success: false, message: 'Failed to load orders.' });
  }
});

// Admin: dashboard stats
app.get('/api/admin/stats', requireAdmin, async (_req, res) => {
  try {
    const [{ products }, orders] = await Promise.all([getCatalogue(), listOrders()]);
    const paid = orders.filter((o) => o.status === 'Paid');
    res.json({
      success: true,
      stats: {
        totalProducts: products.length,
        totalOrders: orders.length,
        pendingOrders: orders.filter((o) => o.status === 'Pending').length,
        paidOrders: paid.length,
        failedOrders: orders.filter((o) => o.status === 'Failed' || o.status === 'Cancelled').length,
        revenue: Math.round(paid.reduce((sum, o) => sum + o.total, 0) * 100) / 100,
        currency: 'AUD',
      },
    });
  } catch (err: any) {
    console.error('[stats] error:', err);
    res.status(500).json({ success: false, message: 'Failed to load stats.' });
  }
});

// Admin: update an order's status manually (fulfilment)
app.post('/api/admin/orders/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  const allowed: OrderStatus[] = ['Pending', 'Paid', 'Failed', 'Cancelled', 'Refunded'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status.' });
  }
  try {
    const updated = await setOrderStatus({ id: req.params.id, status });
    if (!updated) return res.status(404).json({ success: false, message: 'Order not found.' });
    
    // Notify customer of manual order update
    await sendOrderStatusUpdateEmail(updated);

    res.json({ success: true, order: updated });
  } catch (err: any) {
    console.error('[orders] status update error:', err);
    res.status(500).json({ success: false, message: 'Failed to update order.' });
  }
});

// Admin: set an order's Australia Post tracking number + delivery stage
app.post('/api/admin/orders/:id/tracking', requireAdmin, async (req, res) => {
  const { trackingNumber, trackingStatus, notify } = req.body || {};
  if (trackingStatus && !FULFILMENT_STATUSES.includes(trackingStatus)) {
    return res.status(400).json({ success: false, message: 'Invalid tracking status.' });
  }
  try {
    const updated = await updateOrderTracking(req.params.id, { trackingNumber, trackingStatus });
    if (!updated) return res.status(404).json({ success: false, message: 'Order not found.' });

    // Optionally email the customer their new delivery status / tracking number.
    if (notify) await sendOrderStatusUpdateEmail(updated);

    res.json({ success: true, order: updated });
  } catch (err: any) {
    console.error('[orders] tracking update error:', err);
    res.status(500).json({ success: false, message: 'Failed to update tracking.' });
  }
});

// ---------------------------------------------------------------------------
// Public: order status lookup (for the confirmation screen)
// ---------------------------------------------------------------------------
app.get('/api/order-status', async (req, res) => {
  const pi = req.query.pi as string;
  if (!pi) return res.status(400).json({ success: false, message: 'Missing payment intent.' });
  try {
    const order = await getOrderByPaymentIntent(pi);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    res.json({ success: true, status: order.status, referenceId: order.referenceId });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Lookup failed.' });
  }
});

// ---------------------------------------------------------------------------
// Public: order tracking by phone number (customer-facing "Track Your Order")
// ---------------------------------------------------------------------------
app.get('/api/track', async (req, res) => {
  const phone = String(req.query.phone || '').trim();
  if (phone.replace(/\D/g, '').length < 6) {
    return res.status(400).json({ success: false, message: 'Please enter the phone number used on your order.' });
  }
  try {
    const orders = await listOrdersByPhone(phone);
    // Only expose what a customer needs — never the email, address or payment ids.
    const sanitized = orders.map((o) => ({
      referenceId: o.referenceId,
      status: o.status,
      trackingNumber: o.trackingNumber || null,
      trackingStatus: o.trackingStatus || null,
      shippingMethod: o.shippingMethod,
      total: o.total,
      currency: o.currency,
      createdAt: o.createdAt,
      items: o.items.map((it) => ({ name: it.name, size: it.size, quantity: it.quantity })),
    }));
    res.json({ success: true, orders: sanitized });
  } catch (err: any) {
    console.error('[track] lookup error:', err);
    res.status(500).json({ success: false, message: 'Could not look up your orders right now.' });
  }
});

// ---------------------------------------------------------------------------
// Public: product reviews (approved only) + summary
// ---------------------------------------------------------------------------
app.get('/api/reviews', async (req, res) => {
  const productId = (req.query.productId as string) || undefined;
  try {
    const { config } = await getCatalogue();
    const enabled = config?.reviewsEnabled !== false; // default on
    if (!enabled) {
      return res.json({ success: true, enabled: false, reviews: [], summary: { count: 0, average: 0 } });
    }
    const reviews = await listReviews({ productId, status: 'approved' });
    const count = reviews.length;
    const average = count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
    res.json({ success: true, enabled: true, reviews, summary: { count, average } });
  } catch (err: any) {
    console.error('[reviews] list error:', err);
    res.status(500).json({ success: false, message: 'Failed to load reviews.' });
  }
});

// Public: submit a review (lands as 'pending' for admin moderation)
app.post('/api/reviews', async (req, res) => {
  const { productId, author, rating, title, body, images } = req.body || {};
  const ratingNum = Math.round(Number(rating));
  if (!productId || !String(author || '').trim() || !String(body || '').trim()) {
    return res.status(400).json({ success: false, message: 'Name, rating and review text are required.' });
  }
  if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5 stars.' });
  }
  try {
    const { products } = await getCatalogue();
    if (!products.some((p: Product) => p.id === productId)) {
      return res.status(400).json({ success: false, message: 'Unknown product.' });
    }
    const cleanImages = Array.isArray(images)
      ? images.filter((u: any) => typeof u === 'string' && u.startsWith('/uploads/')).slice(0, 5)
      : [];
    const review: Review = {
      id: 'rev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      productId: String(productId),
      author: String(author).trim().slice(0, 80),
      rating: ratingNum,
      title: title ? String(title).trim().slice(0, 120) : undefined,
      body: String(body).trim().slice(0, 2000),
      images: cleanImages,
      verified: false,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await createReview(review);
    res.json({ success: true, message: 'Thank you! Your review will appear once approved.' });
  } catch (err: any) {
    console.error('[reviews] create error:', err);
    res.status(500).json({ success: false, message: 'Could not submit your review. Please try again.' });
  }
});

// ---------------------------------------------------------------------------
// Admin: review moderation
// ---------------------------------------------------------------------------
app.get('/api/admin/reviews', requireAdmin, async (req, res) => {
  try {
    const status = (req.query.status as ReviewStatus) || undefined;
    const reviews = await listReviews({ status });
    res.json({ success: true, reviews });
  } catch (err: any) {
    console.error('[reviews] admin list error:', err);
    res.status(500).json({ success: false, message: 'Failed to load reviews.' });
  }
});

app.post('/api/admin/reviews/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  const allowed: ReviewStatus[] = ['pending', 'approved', 'hidden'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid review status.' });
  }
  try {
    const review = await setReviewStatus(req.params.id, status);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });
    res.json({ success: true, review });
  } catch (err: any) {
    console.error('[reviews] status error:', err);
    res.status(500).json({ success: false, message: 'Failed to update review.' });
  }
});

app.post('/api/admin/reviews/:id/verified', requireAdmin, async (req, res) => {
  try {
    const review = await setReviewVerified(req.params.id, !!(req.body || {}).verified);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });
    res.json({ success: true, review });
  } catch (err: any) {
    console.error('[reviews] verify error:', err);
    res.status(500).json({ success: false, message: 'Failed to update review.' });
  }
});

app.delete('/api/admin/reviews/:id', requireAdmin, async (req, res) => {
  try {
    const ok = await deleteReview(req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: 'Review not found.' });
    res.json({ success: true });
  } catch (err: any) {
    console.error('[reviews] delete error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete review.' });
  }
});

// ---------------------------------------------------------------------------
// Public: create a PaymentIntent + a Pending order (server-validated prices/stock)
// ---------------------------------------------------------------------------
app.post('/api/create-payment-intent', async (req, res) => {
  const { cartItems, customerName, customerPhone, customerAddress, customerEmail } = req.body || {};

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ success: false, message: 'A shopping cart with items is required.' });
  }

  const stripe = getStripe();
  if (!stripe) {
    // No fake success — checkout cannot proceed without a real gateway.
    return res.status(503).json({
      success: false,
      message: 'Online payments are not available right now. Please contact the boutique to complete your order.',
    });
  }

  try {
    const { products } = await getCatalogue();
    let subtotal = 0;
    const resolvedItems: OrderItem[] = [];

    for (const ci of cartItems) {
      const product = products.find((p: Product) => p.id === ci?.product?.id);
      if (!product) {
        return res.status(400).json({ success: false, message: `A product in your bag is no longer available.` });
      }
      if (product.status !== 'active') {
        return res.status(400).json({ success: false, message: `"${product.name}" is not available for purchase.` });
      }
      const size = String(ci.size || '');
      const variant = variantForSize(product, size);
      if (!variant) {
        return res.status(400).json({ success: false, message: `Size ${size} is unavailable for "${product.name}".` });
      }
      if (variant.soldOut) {
        return res.status(409).json({ success: false, message: `Size ${size} of "${product.name}" is sold out.` });
      }
      const qty = Math.max(1, Number(ci.quantity) || 1);
      if (variant.stock < qty) {
        return res.status(409).json({
          success: false,
          message: `Only ${variant.stock} left of "${product.name}" in size ${size}.`,
        });
      }
      const unit = effectivePrice(product);
      subtotal += unit * qty;
      resolvedItems.push({
        productId: product.id,
        name: product.name,
        size,
        sku: variant.sku,
        quantity: qty,
        price: unit,
        category: product.category,
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;
    const total = Math.round((subtotal + SHIPPING_FEE) * 100) / 100;
    const gstIncluded = Math.round((total / 11) * 100) / 100;
    const referenceId = 'TANVIR-AU-' + Math.floor(100000 + Math.random() * 900000);
    const orderId = 'ord_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: 'aud',
      automatic_payment_methods: { enabled: true },
      metadata: { orderId, referenceId, customerEmail: customerEmail || '' },
    });

    const order: Order = {
      id: orderId,
      referenceId,
      status: 'Pending',
      items: resolvedItems,
      subtotal,
      shippingFee: SHIPPING_FEE,
      shippingMethod: SHIPPING_METHOD,
      gstIncluded,
      total,
      currency: 'AUD',
      customerName: customerName || 'Valued Client',
      customerEmail: customerEmail || '',
      customerPhone: customerPhone || '',
      customerAddress: customerAddress || '',
      paymentIntentId: paymentIntent.id,
      createdAt: new Date().toISOString(),
    };
    await createOrder(order);

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      publishableKey: PUBLISHABLE_KEY,
      referenceId,
      receipt: {
        referenceId,
        subtotal,
        shippingFee: SHIPPING_FEE,
        shippingMethod: SHIPPING_METHOD,
        gstIncluded,
        total,
        currency: 'AUD',
        items: resolvedItems,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerAddress: order.customerAddress,
        customerEmail: order.customerEmail,
        date:
          new Date().toLocaleDateString('en-AU', {
            timeZone: 'Australia/Melbourne',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }) + ' AEST',
      },
    });
  } catch (err: any) {
    console.error('[checkout] create-payment-intent error:', err);
    res.status(500).json({ success: false, message: 'Could not start checkout. Please try again.' });
  }
});

// ---------------------------------------------------------------------------
// Server bootstrap
// ---------------------------------------------------------------------------
async function start() {
  try {
    await ensureSeeded();
  } catch (err) {
    console.error('[boot] Seeding/DB init failed (continuing):', err);
  }

  const dbStatus = await pingDb();
  console.log('────────────────────────────────────────────');
  console.log(' Tanvir Attire — server configuration');
  console.log(`  • Database : ${isDbConfigured() ? `MySQL (${dbStatus})` : 'JSON file (fallback)'}`);
  console.log(`  • Stripe   : ${isStripeConfigured() ? 'configured' : 'NOT configured'}`);
  console.log(`  • Webhook  : ${ENV.STRIPE_WEBHOOK_SECRET ? 'secret set' : 'secret MISSING'}`);
  console.log(`  • SMTP     : ${isSmtpConfigured() ? 'configured' : 'NOT configured (emails log to console)'}`);
  console.log('────────────────────────────────────────────');

  if (ENV.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted (development).');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
    console.log('Serving production build from', distPath);
  }

  app.listen(PORT, '0.0.0.0', () => console.log(`Tanvir Attire server running on port ${PORT}`));
}

start().catch((err) => console.error('Fatal init error:', err));
