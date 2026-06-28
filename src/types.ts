// ---------------------------------------------------------------------------
// Core domain types for Tanvir Attire
// ---------------------------------------------------------------------------

export type ProductStatus = 'active' | 'draft' | 'out_of_stock';

/** A single purchasable size variant of a product. */
export interface ProductVariant {
  size: string;   // e.g. 'M', 'L', 'XL', 'XXL'
  stock: number;  // units available for this specific size
  sku: string;    // unique stock-keeping unit, e.g. 'PANJABI-M'
  soldOut?: boolean; // admin-forced "sold out" for this size, independent of the stock number
}

export interface ProductCategory {
  value: string; // slug, e.g. 'kurta'
  label: string; // display, e.g. 'Royal Kurtas'
}

export interface Product {
  id: string;
  slug: string;            // URL-friendly identifier, used by /products/:slug
  name: string;
  category: string;        // category value (see StoreConfig.categories) — custom categories allowed
  price: number;           // base retail price in AUD
  originalPrice?: number;  // strike-through reference price (was-price)
  salePrice?: number;      // optional active sale price (overrides price when set)
  description: string;
  images: string[];        // gallery of high-end images
  variants: ProductVariant[]; // per-size stock + sku
  materials: string[];     // e.g. ['100% Cotton', 'Organic Linen']
  careInstructions: string;
  status: ProductStatus;   // active = visible/purchasable, draft = hidden, out_of_stock = visible but not buyable
  isFeatured: boolean;
  badge?: string;          // e.g. 'Bestseller', 'Limited Launch'
  sizeGuide?: string;      // key into SIZE_GUIDES (e.g. 'panjabi-slimfit')
}

export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  estimatedDays: string;
  description: string;
  freeAboveAmount?: number;
  isAvailable: boolean;
}

export interface StoreConfig {
  storeName: string;
  currency: string;
  stripeEnabled: boolean;
  shippingChargeOptions: ShippingOption[];
  allowInternationalShipping: boolean;
  internationalShippingFee: number;
  categories?: ProductCategory[];
  reviewsEnabled?: boolean; // when false, customer reviews are hidden site-wide (default: shown)
}

// ---------------------------------------------------------------------------
// Customer reviews (persisted server-side, moderated by admin)
// ---------------------------------------------------------------------------

export type ReviewStatus = 'pending' | 'approved' | 'hidden';

export interface Review {
  id: string;
  productId: string;
  author: string;        // reviewer display name
  rating: number;        // 1–5 stars
  title?: string;
  body: string;
  images: string[];      // optional uploaded photo URLs
  verified: boolean;     // admin-marked "Verified Purchase" badge
  status: ReviewStatus;  // pending → approved/hidden (only approved show publicly)
  createdAt: string;
}

/** Aggregate rating summary for a product. */
export interface ReviewSummary {
  count: number;
  average: number; // 0 when no approved reviews
}

export interface CartItem {
  product: Product;
  size: string;
  quantity: number;
}

// ---------------------------------------------------------------------------
// Orders (persisted server-side in MySQL)
// ---------------------------------------------------------------------------

export type OrderStatus = 'Pending' | 'Paid' | 'Failed' | 'Cancelled' | 'Refunded';

/** Australia Post fulfilment stages, maintained by the admin and shown on the tracking page. */
export const FULFILMENT_STATUSES = ['Preparing', 'Shipped', 'In Transit', 'Out for Delivery', 'Delivered'] as const;
export type FulfilmentStatus = (typeof FULFILMENT_STATUSES)[number];

export interface OrderItem {
  productId: string;
  name: string;
  size: string;
  sku?: string;
  quantity: number;
  price: number;       // unit price at time of purchase
  category?: string;
}

export interface Order {
  id: string;
  referenceId: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  shippingMethod: string;
  gstIncluded: number;
  total: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  paymentIntentId?: string;
  trackingNumber?: string;   // Australia Post consignment / tracking id (set by admin)
  trackingStatus?: string;   // FulfilmentStatus — current delivery stage (set by admin)
  createdAt: string;
  updatedAt?: string;
}
