// ---------------------------------------------------------------------------
// Core domain types for Tanvir Attire
// ---------------------------------------------------------------------------

export type ProductStatus = 'active' | 'draft' | 'out_of_stock';

/** A single purchasable size variant of a product. */
export interface ProductVariant {
  size: string;   // e.g. 'M', 'L', 'XL', 'XXL'
  stock: number;  // units available for this specific size
  sku: string;    // unique stock-keeping unit, e.g. 'PANJABI-M'
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
  createdAt: string;
  updatedAt?: string;
}
