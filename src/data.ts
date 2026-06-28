import { Product, ShippingOption, StoreConfig } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'k1',
    slug: 'the-royal-legacy-linen-kurta',
    name: 'The Royal Legacy Linen Kurta',
    category: 'kurta',
    price: 189.0,
    originalPrice: 220.0,
    description:
      'This masterfully hand-woven linen kurta captures ancient heritage with contemporary minimalism. Adorned with delicate gold-embroidered geometric motifs along the band-collar neckband and cuffs, it is crafted from 100% heavy organic Belgian linen.',
    images: [
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&w=800&q=80',
    ],
    variants: [
      { size: 'M', stock: 1, sku: 'TA-K1-M' },
      { size: 'L', stock: 2, sku: 'TA-K1-L' },
      { size: 'XL', stock: 1, sku: 'TA-K1-XL' },
      { size: 'XXL', stock: 0, sku: 'TA-K1-XXL' },
    ],
    materials: ['100% Belgian Linen', 'Lurex Gold Threading'],
    careInstructions:
      'Dry clean recommended. Gentle hand wash in cold water using a pH-neutral silk/wool detergent. Iron inside out while damp.',
    status: 'active',
    isFeatured: true,
    badge: 'Legacy Collector',
    sizeGuide: 'panjabi-slimfit',
  },
  {
    id: 'k2',
    slug: 'sultan-silk-brocade-kurta',
    name: 'Sultan Silk Brocade Kurta',
    category: 'kurta',
    price: 279.0,
    description:
      'An exceptional statement wear piece. Tailored from ultra-premium raw Mulberry silk with magnificent tone-on-tone brocade, custom gold-accented buttons, and an exquisite inner satin lining. This garment speaks of pure power and prestige.',
    images: [
      'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
    ],
    variants: [
      { size: 'M', stock: 4, sku: 'TA-K2-M' },
      { size: 'L', stock: 5, sku: 'TA-K2-L' },
      { size: 'XL', stock: 3, sku: 'TA-K2-XL' },
    ],
    materials: ['85% Raw Mulberry Silk', '15% Gold-threaded Viscose'],
    careInstructions:
      'Professional dry clean only. Keep away from direct water spray. Store in a padded garment bag to preserve silk sheen.',
    status: 'active',
    isFeatured: true,
    badge: 'Limited Launch',
    sizeGuide: 'panjabi-slimfit',
  },
  {
    id: 'k3',
    slug: 'heritage-crimson-kurta',
    name: 'Heritage Crimson Kurta',
    category: 'kurta',
    price: 169.0,
    originalPrice: 195.0,
    description:
      'A traditional classic reimagined for Melbourne and Sydney summer evenings. Combining the airy breathable structure of premium cotton-linen blends with deep crimson mineral pigment dye and minimal dual-piping in burnished gold.',
    images: [
      'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?auto=format&fit=crop&w=800&q=80',
    ],
    variants: [
      { size: 'M', stock: 1, sku: 'TA-K3-M' },
      { size: 'L', stock: 1, sku: 'TA-K3-L' },
      { size: 'XL', stock: 0, sku: 'TA-K3-XL' },
    ],
    materials: ['60% Premium Cotton', '40% Flax Linen'],
    careInstructions:
      'Machine wash on cold/delicate cycle inside out. Line dry in shade to prevent sun fading. Warm steam iron.',
    status: 'active',
    isFeatured: false,
    badge: 'Only 2 Left',
    sizeGuide: 'panjabi-slimfit',
  },
  {
    id: 't1',
    slug: 'tanvir-heavyweight-legacy-tee',
    name: 'Tanvir Heavyweight Legacy Tee',
    category: 'tshirt',
    price: 89.0,
    description:
      'Engineered with an ultra-premium 320GSM heavyweight organic cotton fit that holds its iconic silhouette. Features sleek gold screen-printed "TANVIR ATTIRE" logo across the chest, and the signature "Wear the Legacy" Arabic script embossed in premium flat-lay velvet.',
    images: [
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
    ],
    variants: [
      { size: 'S', stock: 6, sku: 'TA-T1-S' },
      { size: 'M', stock: 8, sku: 'TA-T1-M' },
      { size: 'L', stock: 7, sku: 'TA-T1-L' },
      { size: 'XL', stock: 3, sku: 'TA-T1-XL' },
      { size: 'XXL', stock: 1, sku: 'TA-T1-XXL' },
    ],
    materials: ['100% GOTS Certified Organic Cotton', '320GSM Heavyweight Ring-spun'],
    careInstructions:
      'Wash cold inside out. Gentle tumble dry low. Do not iron directly over the gold emblem or printed legacy lettering.',
    status: 'active',
    isFeatured: true,
    badge: 'Bestseller',
  },
  {
    id: 't2',
    slug: 'emerald-monogram-luxury-tee',
    name: 'Emerald Monogram Luxury Tee',
    category: 'tshirt',
    price: 95.0,
    originalPrice: 115.0,
    description:
      'A deep emerald-teal luxury t-shirt designed specifically to echo our core brand color. Details include an exquisite, high-density embroidered monogram in metallic gold silk thread on the left breast, and custom gold tipping along the rib collar.',
    images: [
      'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80',
    ],
    variants: [
      { size: 'S', stock: 2, sku: 'TA-T2-S' },
      { size: 'M', stock: 3, sku: 'TA-T2-M' },
      { size: 'L', stock: 2, sku: 'TA-T2-L' },
      { size: 'XL', stock: 1, sku: 'TA-T2-XL' },
    ],
    materials: ['95% Supima Cotton', '5% Elastane for structured drape'],
    careInstructions:
      'Delicate hand wash inside out. Flat dry in shade. Do not bleach. Cool iron on reverse.',
    status: 'active',
    isFeatured: true,
    badge: 'Signature Collection',
  },
  {
    id: 't3',
    slug: 'legacy-signature-sands-tee',
    name: 'Legacy Signature Sands Tee',
    category: 'tshirt',
    price: 79.0,
    description:
      'Inspired by raw desert sand dunes and Melbourne modern lines, features a soft champagne gold brushed finish and premium subtle micro-embellishments. Comfort fit with slightly relaxed dropped shoulders.',
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=800&q=80',
    ],
    variants: [
      { size: 'S', stock: 4, sku: 'TA-T3-S' },
      { size: 'M', stock: 5, sku: 'TA-T3-M' },
      { size: 'L', stock: 4, sku: 'TA-T3-L' },
      { size: 'XL', stock: 2, sku: 'TA-T3-XL' },
    ],
    materials: ['100% Combed Cotton', 'Aero-washed for velvet softness'],
    careInstructions:
      'Machine wash cool. Medium iron. Do not tumble dry to maintain custom relaxed fabric drape.',
    status: 'active',
    isFeatured: false,
    badge: 'Essential Minimal',
  },
];

export const INITIAL_SHIPPING_OPTIONS: ShippingOption[] = [
  {
    id: 'sh1',
    name: 'AusPost Standard Delivery',
    price: 10.0,
    estimatedDays: '3-6 Business Days',
    description: 'Secure delivery across all Australian states. Handled by Australia Post with SMS routing alerts.',
    freeAboveAmount: 150.0,
    isAvailable: true,
  },
  {
    id: 'sh2',
    name: 'AusPost Express Premium',
    price: 18.0,
    estimatedDays: '1-2 Business Days (Next Day Metro)',
    description: 'Accelerated next-day logistics. Highly recommended for Sydney, Melbourne, Brisbane hubs.',
    freeAboveAmount: 250.0,
    isAvailable: true,
  },
  {
    id: 'sh3',
    name: 'Melbourne Showroom Courier Pick-up',
    price: 0.0,
    estimatedDays: 'Ready in 2 Hours',
    description: 'Complimentary pick-up at our luxury boutique showroom, located in Toorak, Melbourne.',
    isAvailable: true,
  },
  {
    id: 'sh4',
    name: 'DHL Global Express (New Zealand & Int.)',
    price: 35.0,
    estimatedDays: '4-8 Business Days International',
    description: 'Fully insured international shipping with premium flight logistics and customs prioritization.',
    freeAboveAmount: 350.0,
    isAvailable: true,
  },
];

export const INITIAL_STORE_CONFIG: StoreConfig = {
  storeName: 'Tanvir Attire',
  currency: 'AUD',
  stripeEnabled: true,
  reviewsEnabled: true,
  shippingChargeOptions: INITIAL_SHIPPING_OPTIONS,
  allowInternationalShipping: true,
  internationalShippingFee: 35.0,
  categories: [
    { value: 'kurta', label: 'Royal Kurtas' },
    { value: 'tshirt', label: 'Heavyweight T-Shirts' },
    { value: 'panjabi', label: 'Panjabi' },
  ],
};
