# Tanvir Attire — Production Deployment Guide (Hostinger Business · Node.js)

This app is a single Node/Express server that serves the built React SPA **and** the API
(`/api/*`). It runs as a **Node.js application** on Hostinger Business and connects to a
**remote MySQL** database, **Stripe**, and **Hostinger SMTP** for order emails.

---

## 1. Prerequisites on Hostinger

- A **Node.js app** created in hPanel (Business plan supports up to 5). Note the app's
  startup file and its public URL (e.g. `https://tanvirattire.com.au`).
- A **MySQL database** + user (hPanel → Databases). Enable **Remote MySQL** and whitelist
  the app/server host (or `%` if you must, less secure).
- An **email mailbox** (hPanel → Emails), e.g. `orders@tanvirattire.com.au`, for SMTP.
- A **Stripe** account with **live** keys and a webhook endpoint.

---

## 2. Environment variables

Copy `.env.example` → `.env` and fill in. **Never commit `.env`.**

| Variable | Required | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | ✅ | `sk_live_…` in production |
| `VITE_STRIPE_PUBLISHABLE_KEY` | ✅ | `pk_live_…` — sent to the browser by the API |
| `STRIPE_WEBHOOK_SECRET` | ✅ | `whsec_…` from the webhook you create in step 5 |
| `DB_HOST` `DB_NAME` `DB_USER` `DB_PASS` | ✅ | Hostinger remote MySQL. (Leave blank only for local dev → JSON fallback.) |
| `DB_PORT` | – | default `3306` |
| `DB_SSL` | – | `true` if your host requires TLS for remote MySQL |
| `SMTP_HOST` | ✅ | `smtp.hostinger.com` |
| `SMTP_PORT` / `SMTP_SECURE` | – | `465`/`true` (SSL) or `587`/`false` (STARTTLS) |
| `SMTP_USER` `SMTP_PASS` | ✅ | the mailbox credentials |
| `MAIL_FROM` | – | e.g. `Tanvir Attire <orders@tanvirattire.com.au>` |
| `ORDER_NOTIFY_TO` | – | defaults to `aarsayem002@gmail.com, Tanvirmahmudparvez@gmail.com` |
| `ADMIN_EMAIL` | ✅ | admin login email |
| `ADMIN_PASSWORD` | ⚠️ | dev only — prefer the hash below for production |
| `ADMIN_PASSWORD_HASH` | ✅(prod) | run `npm run gen-admin-hash "yourpass"` and paste the output |
| `ADMIN_SESSION_SECRET` | ✅(prod) | a long random string (signs admin tokens) |
| `NODE_ENV` | ✅(prod) | set to `production` so the server serves `dist/` |
| `PORT` | – | Hostinger usually injects this; the server reads it |

Generate the admin hash:
```bash
npm run gen-admin-hash "choose-a-strong-password"
# → prints ADMIN_PASSWORD_HASH=<salt>:<hash>  (paste into .env, remove ADMIN_PASSWORD)
```

---

## 3. Create the database schema

Import `backend/schema.sql` into your MySQL DB (phpMyAdmin → Import, or CLI):
```bash
mysql -h <DB_HOST> -u <DB_USER> -p <DB_NAME> < backend/schema.sql
```
On first boot with an empty `products` table the server **auto-seeds** the initial
catalogue. After that, the admin dashboard is the source of truth.

---

## 4. Build & deploy

```bash
npm install
npm run build      # → builds the SPA into dist/ AND bundles the server into dist/server.cjs
```
Upload the project to the Node app directory. The Node app **start command** is:
```bash
node dist/server.cjs        # equivalently: npm start
```
Ensure `NODE_ENV=production` so Express serves the static `dist/` build (otherwise it tries
to start Vite in dev mode). Because the server has `app.get('*')` → `index.html`, client-side
routes like `/products/:slug` survive refresh/deep-links automatically (no `.htaccess` needed
when Node serves everything).

> If instead you serve the static `dist/` via Apache/LiteSpeed and proxy `/api` to Node,
> add an `.htaccess` rewrite of all non-file routes to `index.html`.

---

## 5. Configure the Stripe webhook (critical)

Payments are confirmed **only** by the webhook — there is no fake/simulated success.

1. Stripe Dashboard → Developers → **Webhooks** → Add endpoint.
2. URL: `https://YOUR_DOMAIN/api/stripe-webhook`
3. Events: `payment_intent.succeeded`, `payment_intent.payment_failed`,
   `payment_intent.canceled`, `charge.refunded`.
4. Copy the **Signing secret** (`whsec_…`) into `STRIPE_WEBHOOK_SECRET` and restart the app.

On `payment_intent.succeeded` the server marks the order **Paid**, decrements per-size stock,
and emails both recipients. Events are signature-verified and de-duplicated (idempotent).

**Local webhook testing:**
```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe-webhook
# paste the printed whsec_… into .env as STRIPE_WEBHOOK_SECRET, then:
stripe trigger payment_intent.succeeded
```

---

## 6. Go-live checklist

- [ ] `.env` filled with **live** Stripe keys, real DB/SMTP creds, `NODE_ENV=production`.
- [ ] `ADMIN_PASSWORD_HASH` + `ADMIN_SESSION_SECRET` set; plaintext `ADMIN_PASSWORD` removed.
- [ ] `backend/schema.sql` imported; Remote MySQL host whitelisted.
- [ ] `npm run build` succeeds; app starts with `node dist/server.cjs`.
- [ ] Webhook endpoint added in Stripe and secret configured; a `payment_intent.succeeded`
      test marks an order Paid and sends emails to both addresses.
- [ ] Place a real test purchase; confirm the order appears as **Paid** in `/admin → Orders`.
- [ ] Admin login works at `/admin`; product create/edit/delete + per-size stock persist.

## Local development

```bash
npm install
npm run dev      # http://localhost:3000  (Vite + Express)
```
With `DB_*` blank the app uses a local `data-store.json` fallback so you can develop without
MySQL. With no SMTP, order emails are logged to the console. Stripe test keys are already in
`.env.example` guidance — use the Stripe CLI for webhooks (step 5).

Default dev admin login: `admin@tanvirattire.com.au` / `luxury_legacy` (change for production).
