-- ===========================================================================
-- Tanvir Attire — MySQL schema (Hostinger remote DB)
-- Import via phpMyAdmin or:  mysql -h HOST -u USER -p DBNAME < backend/schema.sql
-- Safe to re-run (uses IF NOT EXISTS). utf8mb4 for full emoji/î/ñ support.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS products (
  id             VARCHAR(64)  NOT NULL PRIMARY KEY,
  slug           VARCHAR(190) NOT NULL,
  name           VARCHAR(255) NOT NULL,
  category       VARCHAR(32)  NOT NULL DEFAULT 'kurta',
  price          DECIMAL(10,2) NOT NULL DEFAULT 0,
  original_price DECIMAL(10,2) NULL,
  sale_price     DECIMAL(10,2) NULL,
  description    TEXT NULL,
  images         JSON NULL,
  materials      JSON NULL,
  care_instructions TEXT NULL,
  status         VARCHAR(20)  NOT NULL DEFAULT 'active',
  is_featured    TINYINT(1)   NOT NULL DEFAULT 0,
  badge          VARCHAR(120) NULL,
  size_guide     VARCHAR(64)  NULL,
  sort_order     INT          NOT NULL DEFAULT 0,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_variants (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  product_id VARCHAR(64)  NOT NULL,
  size       VARCHAR(32)  NOT NULL,
  stock      INT          NOT NULL DEFAULT 0,
  sku        VARCHAR(120) NOT NULL,
  sold_out   TINYINT(1)   NOT NULL DEFAULT 0,
  UNIQUE KEY uniq_product_size (product_id, size),
  KEY idx_variant_product (product_id),
  CONSTRAINT fk_variant_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS store_config (
  id         TINYINT NOT NULL PRIMARY KEY DEFAULT 1,
  data       JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id               VARCHAR(64)  NOT NULL PRIMARY KEY,
  reference_id     VARCHAR(64)  NOT NULL,
  status           VARCHAR(20)  NOT NULL DEFAULT 'Pending',
  subtotal         DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_fee     DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_method  VARCHAR(120) NULL,
  gst_included     DECIMAL(10,2) NOT NULL DEFAULT 0,
  total            DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency         VARCHAR(8)   NOT NULL DEFAULT 'AUD',
  customer_name    VARCHAR(190) NULL,
  customer_email   VARCHAR(190) NULL,
  customer_phone   VARCHAR(64)  NULL,
  customer_address TEXT NULL,
  payment_intent_id VARCHAR(190) NULL,
  tracking_number  VARCHAR(120) NULL,
  tracking_status  VARCHAR(40)  NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_reference (reference_id),
  KEY idx_status (status),
  KEY idx_payment_intent (payment_intent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  order_id   VARCHAR(64)  NOT NULL,
  product_id VARCHAR(64)  NULL,
  name       VARCHAR(255) NULL,
  size       VARCHAR(32)  NULL,
  sku        VARCHAR(120) NULL,
  quantity   INT          NOT NULL DEFAULT 1,
  price      DECIMAL(10,2) NOT NULL DEFAULT 0,
  category   VARCHAR(32)  NULL,
  KEY idx_item_order (order_id),
  CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Stripe webhook idempotency: each event id is processed at most once.
CREATE TABLE IF NOT EXISTS webhook_events (
  id           VARCHAR(190) NOT NULL PRIMARY KEY,
  type         VARCHAR(120) NULL,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customer reviews. New reviews land as 'pending' and only show publicly once
-- an admin approves them. `verified` is the admin-toggled "Verified Purchase" badge.
CREATE TABLE IF NOT EXISTS reviews (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
