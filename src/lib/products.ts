import { Product, ProductStatus, ProductVariant } from '../types';

/**
 * Normalize a product coming from any source (legacy disk store, API, admin form)
 * into the canonical variant-based shape. Tolerates the old
 * `{ sizes, stockLevel, isAvailable }` model so nothing breaks during migration.
 */
export function normalizeProduct(raw: any): Product {
  const name: string = raw?.name ?? 'Untitled Style';
  const legacySizes: string[] = Array.isArray(raw?.sizes) ? raw.sizes : [];

  let variants: ProductVariant[];
  if (Array.isArray(raw?.variants) && raw.variants.length > 0) {
    variants = raw.variants.map((v: any, i: number) => ({
      size: String(v.size ?? `SIZE-${i + 1}`),
      stock: Number(v.stock) || 0,
      sku: String(v.sku ?? `${slugify(name).toUpperCase().slice(0, 12)}-${v.size ?? i}`),
      soldOut: !!v.soldOut,
    }));
  } else if (legacySizes.length > 0) {
    const total = Number(raw?.stockLevel) || 0;
    const per = Math.floor(total / legacySizes.length);
    let remainder = total - per * legacySizes.length;
    variants = legacySizes.map((size, i) => {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder -= 1;
      return {
        size,
        stock: per + extra,
        sku: `${slugify(name).toUpperCase().slice(0, 12)}-${size}`,
      };
    });
  } else {
    variants = [];
  }

  let status: ProductStatus;
  if (raw?.status === 'active' || raw?.status === 'draft' || raw?.status === 'out_of_stock') {
    status = raw.status;
  } else {
    status = raw?.isAvailable === false ? 'draft' : 'active';
  }

  return {
    id: String(raw?.id ?? `prod_${Date.now()}`),
    slug: raw?.slug ? String(raw.slug) : slugify(name),
    name,
    category: raw?.category ? String(raw.category) : 'kurta',
    price: Number(raw?.price) || 0,
    originalPrice: raw?.originalPrice != null ? Number(raw.originalPrice) : undefined,
    salePrice: raw?.salePrice != null ? Number(raw.salePrice) : undefined,
    description: String(raw?.description ?? ''),
    images: Array.isArray(raw?.images) && raw.images.length > 0 ? raw.images.map(String) : [],
    variants,
    materials: Array.isArray(raw?.materials) ? raw.materials.map(String) : [],
    careInstructions: String(raw?.careInstructions ?? ''),
    status,
    isFeatured: !!raw?.isFeatured,
    badge: raw?.badge ? String(raw.badge) : undefined,
    sizeGuide: raw?.sizeGuide ? String(raw.sizeGuide) : raw?.category === 'kurta' ? 'panjabi-slimfit' : undefined,
  };
}

/** Build a URL-friendly slug from a product name (and id for guaranteed uniqueness). */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** The list of size labels offered for a product. */
export function productSizes(product: Product): string[] {
  return (product.variants ?? []).map((v) => v.size);
}

/** The variant record for a specific size, if any. */
export function variantForSize(product: Product, size: string): ProductVariant | undefined {
  return (product.variants ?? []).find((v) => v.size === size);
}

/** Whether a given size can currently be purchased (not admin-sold-out and has stock). */
export function sizeInStock(product: Product, size: string): boolean {
  const v = variantForSize(product, size);
  return !!v && !v.soldOut && v.stock > 0;
}

/** Total units across all sizes (counts physical stock, ignores the sold-out flag). */
export function totalStock(product: Product): number {
  return (product.variants ?? []).reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
}

/** Units that are actually available to buy (excludes sizes flagged sold-out). */
export function availableStock(product: Product): number {
  return (product.variants ?? []).reduce((sum, v) => sum + (v.soldOut ? 0 : Number(v.stock) || 0), 0);
}

/** The effective price a customer pays (sale price wins when present and lower). */
export function effectivePrice(product: Product): number {
  if (typeof product.salePrice === 'number' && product.salePrice > 0 && product.salePrice < product.price) {
    return product.salePrice;
  }
  return product.price;
}

/** The reference/compare-at price to strike through, if any. */
export function comparePrice(product: Product): number | undefined {
  if (typeof product.salePrice === 'number' && product.salePrice > 0 && product.salePrice < product.price) {
    return product.price;
  }
  return product.originalPrice;
}

/** Discount percentage off the compare price, rounded. 0 when none. */
export function discountPercent(product: Product): number {
  const compare = comparePrice(product);
  const price = effectivePrice(product);
  if (!compare || compare <= price) return 0;
  return Math.round(((compare - price) / compare) * 100);
}

/** Visible in the storefront (active or out_of_stock — but not draft). */
export function isVisible(product: Product): boolean {
  return product.status !== 'draft';
}

/** Can be added to cart right now. */
export function isPurchasable(product: Product): boolean {
  return product.status === 'active' && availableStock(product) > 0;
}

/** First buyable size, falling back to the first listed size. */
export function defaultSize(product: Product): string {
  const inStock = (product.variants ?? []).find((v) => !v.soldOut && v.stock > 0);
  if (inStock) return inStock.size;
  return productSizes(product)[0] ?? '';
}
