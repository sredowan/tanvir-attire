# Tanvir Attire — Luxury Clothing Store

A production-ready, Shopify-style eCommerce store for premium kurtas and heavyweight tees.
React 19 + Vite + Tailwind v4 frontend, Node/Express + MySQL backend, Stripe payments, and
Hostinger SMTP order notifications.

## Features

- **Storefront:** full-viewport hero, premium product cards, real product-detail routes
  (`/products/:slug`), image zoom lightbox, dynamic **Size Guide** (Panjabi Slimfit chart).
- **Variants:** per-size stock + SKU; out-of-stock sizes are disabled; checkout validates
  stock server-side.
- **Checkout:** real Stripe PaymentIntent (no fake/simulated success). Orders are persisted;
  payment is confirmed by a **signature-verified, idempotent webhook**, which then decrements
  stock and emails the team.
- **Admin dashboard** (`/admin`): overview stats, order management (filter/search/status),
  full product CRUD with per-size variants, images, sale price, status, confirm-before-delete.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```
Works with **no database** locally (JSON-file fallback). Default admin:
`admin@tanvirattire.com.au` / `luxury_legacy`.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server (Vite + Express) |
| `npm run build` | Build SPA → `dist/` and bundle server → `dist/server.cjs` |
| `npm start` | Run the production build (`node dist/server.cjs`) |
| `npm run lint` | Type-check (`tsc --noEmit`) |
| `npm run gen-admin-hash "pw"` | Generate `ADMIN_PASSWORD_HASH` for production |

## Production

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the full Hostinger Business + MySQL + Stripe webhook
+ SMTP setup, environment variables, and the go-live checklist.

## Project structure

```
backend/        Express API modules (env, db, store, auth, email, payments, schema.sql)
server.ts       Server entry: routes, Stripe webhook, Vite/static serving
src/
  pages/        HomePage, LegacyPage, ProductDetailPage
  components/   Navbar, Hero, ProductCard, CartDrawer, AdminPanel, SizeGuideModal, ImageLightbox, Footer
  lib/          products (helpers + normalizer), sizeGuides
  data.ts       Seed catalogue   types.ts  domain types
```
