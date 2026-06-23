import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getCatalogue, saveCatalogue, ensureSeeded } from '../backend/store';
import type { Product, ProductVariant, StoreConfig } from '../src/types';

dotenv.config();

const SHOOT_BASE_DIR = 'C:\\Users\\ADMIN\\Downloads\\last shoot-20260623T101253Z-3-001\\last shoot';
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Ensure uploads folder exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Definition of the 10 products with metadata and descriptions
const newProductsMeta = [
  {
    id: 'w1',
    slug: 'naira-womens-two-piece-set',
    name: 'Naira Women\'s Two-Piece Set',
    category: 'womenswear',
    price: 90,
    originalPrice: 130,
    description: 'The Naira set is a modern interpretation of classic monochrome styling. It features a mid-length charcoal black Kurti paired with matching straight-leg trousers. Elegant white floral embroidery borders the bottom hem of both the kurti and trousers, offset by white piping along the V-neckline and cuffs.',
    materials: ['Premium Cotton-Linen Blend', 'White Thread Embroidery'],
    careInstructions: 'Dry clean recommended. Gentle hand wash in cold water using a pH-neutral detergent. Iron inside out while damp.',
    status: 'active' as const,
    isFeatured: true,
    badge: 'New Launch',
    folderName: 'Naira',
    hasSizeVariants: true,
    isSaree: false
  },
  {
    id: 'w2',
    slug: 'safiya-handloom-saree',
    name: 'Safiya Handloom Saree',
    category: 'womenswear',
    price: 70,
    originalPrice: 110,
    description: 'The Safiya saree is a celebratory tribute to traditional handloom artistry. Its semi-sheer white base acts as a canvas for hand-painted crimson red and orange floral motifs with delicate olive-green stems. The floral vine design flows along the border and transitions into a richly decorated pallu.',
    materials: ['100% Handloom Cotton', 'Artisanal Fabric Paints'],
    careInstructions: 'Dry clean only to protect hand-painted details. Store wrapped in a soft cotton cloth.',
    status: 'active' as const,
    isFeatured: true,
    badge: 'Artisanal Special',
    folderName: 'Safiya',
    hasSizeVariants: false,
    isSaree: true
  },
  {
    id: 'k4',
    slug: 'royal-drape-kurta',
    name: 'Royal Drape Kurta',
    category: 'kurta',
    price: 110,
    originalPrice: 149,
    description: 'True to its name, the Royal Drape Kurta is designed for formal evening occasions. It features detailed, tone-on-tone embroidery in dark cocoa silk thread along the mandarin collar and front placket. Subtle metallic embellishments are hand-stitched within the embroidery pattern to catch ambient light.',
    materials: ['Premium Cotton-Silk Jacquard', 'Silk Thread Embroidery', 'Metallic Beadwork'],
    careInstructions: 'Dry clean recommended. Gentle hand wash in cold water with mild silk detergent. Iron inside out at low heat.',
    status: 'active' as const,
    isFeatured: true,
    badge: 'Royal Collection',
    folderName: 'Royal Drape',
    hasSizeVariants: true,
    isSaree: false
  },
  {
    id: 'k5',
    slug: 'zarif-kurta',
    name: 'Zarif Kurta',
    category: 'kurta',
    price: 110,
    originalPrice: 149,
    description: 'The Zarif Kurta blends modern geometry with ethnic wear. The steel grey base is accented by dark forest green and black geometric embroidery detailing the mandarin collar and sleeve cuffs. Contoured white loop buttons line the front placket to create a sharp contrast.',
    materials: ['Premium Cotton-Viscose Blend', 'Contrast Loop Buttons'],
    careInstructions: 'Gentle machine wash cold inside out. Line dry in shade. Warm steam iron.',
    status: 'active' as const,
    isFeatured: true,
    badge: 'Geometric Accent',
    folderName: 'Zarif',
    hasSizeVariants: true,
    isSaree: false
  },
  {
    id: 'k6',
    slug: 'jazba-couture-kurta',
    name: 'Jazba Couture Kurta',
    category: 'kurta',
    price: 100,
    originalPrice: 139,
    description: 'The Jazba Couture Kurta brings a fresh pastel palette to the collection. In a soft baby pink hue, it features delicate white and silver thread embroidery framing the mandarin collar and cuffs. The clean placket line and neat collar structure highlight its premium tailoring.',
    materials: ['Self-Textured Flame Jacquard', 'Silver Thread Embroidery'],
    careInstructions: 'Dry clean recommended. Hand wash cold with mild detergent. Warm iron.',
    status: 'active' as const,
    isFeatured: true,
    badge: 'Spring Pastel',
    folderName: 'Jazba Couture',
    hasSizeVariants: true,
    isSaree: false
  },
  {
    id: 'k7',
    slug: 'aangan-attire-kurta',
    name: 'Aangan Attire Kurta',
    category: 'kurta',
    price: 110,
    originalPrice: 149,
    description: 'The Aangan Attire Kurta is characterized by its deep espresso brown hue and under-stated regal pattern. The front placket features a dense embroidered panel of matching dark thread and delicate dark glass beads that add a subtle textural dimension.',
    materials: ['Fine Cotton-Silk Blend', 'Woven Self-Stripes', 'Glass Bead Embellishments'],
    careInstructions: 'Dry clean recommended. Hand wash in cold water. Do not wring. Warm iron inside out.',
    status: 'active' as const,
    isFeatured: true,
    badge: 'Understated Luxury',
    folderName: 'Aangan Attire',
    hasSizeVariants: true,
    isSaree: false
  },
  {
    id: 'k8',
    slug: 'rayyan-kurta',
    name: 'Rayyan Kurta',
    category: 'kurta',
    price: 110,
    originalPrice: 149,
    description: 'The Rayyan Kurta features a deep navy blue hue with elegant details. A central vertical chest panel showcases navy threadwork paired with small, midnight blue beads that shimmer gently as you move. A clean mandarin collar completes the clean silhouette.',
    materials: ['High-Thread-Count Cotton-Viscose', 'Midnight Blue Beadwork'],
    careInstructions: 'Dry clean recommended. Hand wash cold inside out. Iron at medium heat.',
    status: 'active' as const,
    isFeatured: true,
    badge: 'Bestseller',
    folderName: 'Rayyan',
    hasSizeVariants: true,
    isSaree: false
  },
  {
    id: 'k9',
    slug: 'nabeel-kurta',
    name: 'Nabeel Kurta',
    category: 'kurta',
    price: 110,
    originalPrice: 149,
    description: 'The Nabeel Kurta represents minimalist luxury. In charcoal grey, it features a band collar and placket adorned with matching dark grey embroidery and shimmering black beadwork. The clean lines and dark-toned details offer a modern, masculine aesthetic.',
    materials: ['Structured Cotton-Viscose Blend', 'Black Beadwork'],
    careInstructions: 'Gentle hand wash cold inside out. Do not rub or wring beadwork. Cool iron on reverse side.',
    status: 'active' as const,
    isFeatured: false,
    badge: 'Modern Charcoal',
    folderName: 'Nabeel',
    hasSizeVariants: true,
    isSaree: false
  },
  {
    id: 'k10',
    slug: 'sultan-silhouettes-kurta',
    name: 'Sultan Silhouettes Kurta',
    category: 'kurta',
    price: 110,
    originalPrice: 149,
    description: 'The Sultan Silhouettes set is a study in classic luxury. It is a pristine white kurta featuring detailed white-on-white geometric embroidery along the mandarin collar and placket. The design is accented by custom square gold-toned metallic buttons with an intricate inset design.',
    materials: ['Egyptian Cotton-Satin Blend', 'Custom Gold-Toned Buttons'],
    careInstructions: 'Dry clean recommended. Hand wash cold with mild detergent. Remove metallic buttons before washing if possible. Warm iron.',
    status: 'active' as const,
    isFeatured: true,
    badge: 'Elite White',
    folderName: 'Sultan Silhouettes',
    hasSizeVariants: true,
    isSaree: false
  },
  {
    id: 'k11',
    slug: 'dilbar-attire-kurta',
    name: 'Dilbar Attire Kurta',
    category: 'kurta',
    price: 100,
    originalPrice: 139,
    description: 'The Dilbar Attire Kurta is an exceptional piece in antique bronze-gold. The band collar features a central embroidered emblem in gold and black thread, flanked by delicate leaf motifs. The placket is adorned with custom flower-motif embroidered buttons.',
    materials: ['Premium Jacquard Silk-Viscose', 'Detailed Button Embroidery'],
    careInstructions: 'Professional dry clean recommended. Store in a cool, dry garment bag.',
    status: 'active' as const,
    isFeatured: false,
    badge: 'Bronze Splendor',
    folderName: 'Dilbar Attire',
    hasSizeVariants: true,
    isSaree: false
  }
];

async function run() {
  console.log('--- Tanvir Attire Product Upload Script ---');

  // 1. Copy images and prepare products locally first (prevents DB connection idling/timeout)
  console.log('\n--- PHASE 1: Copying and Preparing Product Data ---');
  const preparedNewProducts: Product[] = [];

  for (const pm of newProductsMeta) {
    console.log(`Processing: "${pm.name}"...`);
    
    // List and copy images
    const productFolderPath = path.join(SHOOT_BASE_DIR, pm.folderName);
    const copiedImageUrls: string[] = [];

    if (fs.existsSync(productFolderPath)) {
      const files = fs.readdirSync(productFolderPath)
        .filter((file) => ['.jpg', '.jpeg', '.png'].includes(path.extname(file).toLowerCase()))
        .sort();

      console.log(`-> Found ${files.length} images. Copying...`);

      files.forEach((file, index) => {
        const srcPath = path.join(productFolderPath, file);
        const ext = path.extname(file).toLowerCase();
        const destFileName = `img_${pm.slug}_${index + 1}${ext}`;
        const destPath = path.join(UPLOADS_DIR, destFileName);
        
        try {
          fs.copyFileSync(srcPath, destPath);
          copiedImageUrls.push(`/uploads/${destFileName}`);
        } catch (copyErr) {
          console.error(`-> Failed to copy ${file}:`, copyErr);
        }
      });
    } else {
      console.warn(`-> Warning: Folder path not found: ${productFolderPath}. Using Unsplash fallback.`);
      copiedImageUrls.push('https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80');
    }

    // Define size variants
    let variants: ProductVariant[] = [];
    if (pm.isSaree) {
      variants = [
        { size: 'One Size', stock: 10, sku: `TA-${pm.id.toUpperCase()}-OS` }
      ];
    } else if (pm.hasSizeVariants) {
      const sizes = pm.category === 'womenswear' ? ['S', 'M', 'L', 'XL'] : ['M', 'L', 'XL', 'XXL'];
      variants = sizes.map((size) => ({
        size,
        stock: 10,
        sku: `TA-${pm.id.toUpperCase()}-${size}`
      }));
    }

    // Assemble product object
    preparedNewProducts.push({
      id: pm.id,
      slug: pm.slug,
      name: pm.name,
      category: pm.category,
      price: pm.price,
      originalPrice: pm.originalPrice,
      description: pm.description,
      images: copiedImageUrls,
      variants: variants,
      materials: pm.materials,
      careInstructions: pm.careInstructions,
      status: pm.status,
      isFeatured: pm.isFeatured,
      badge: pm.badge,
      sizeGuide: pm.category === 'kurta' ? 'panjabi-slimfit' : undefined
    });
  }

  console.log('\n--- PHASE 2: Database Operations ---');

  // 2. Open DB and initialize schema
  console.log('Verifying/initializing database schema...');
  try {
    await ensureSeeded();
  } catch (dbErr) {
    console.error('Database schema initialization failed:', dbErr);
    process.exit(1);
  }

  // 3. Fetch current catalogue
  console.log('Fetching current catalogue...');
  const { products: existingProducts, config: existingConfig } = await getCatalogue();
  console.log(`Loaded ${existingProducts.length} existing products.`);

  // 4. Merge new products into existing catalogue
  const updatedProductsList = [...existingProducts];
  for (const newP of preparedNewProducts) {
    const idx = updatedProductsList.findIndex((p) => p.id === newP.id);
    if (idx !== -1) {
      console.log(`Updating existing product: ${newP.name} (${newP.id})`);
      updatedProductsList[idx] = newP;
    } else {
      console.log(`Adding new product: ${newP.name} (${newP.id})`);
      updatedProductsList.push(newP);
    }
  }

  // 5. Update store config categories
  const newConfig: StoreConfig = { ...existingConfig };
  if (!newConfig.categories) {
    newConfig.categories = [];
  }

  const hasWomenswear = newConfig.categories.some((c) => c.value === 'womenswear');
  if (!hasWomenswear) {
    console.log('Appending "womenswear" category to the config...');
    newConfig.categories.push({
      value: 'womenswear',
      label: 'Women\'s Collection'
    });
  }

  // 6. Save updated catalogue back to DB
  console.log('Saving updated catalogue...');
  try {
    const result = await saveCatalogue(updatedProductsList, newConfig);
    console.log('Success! Catalogue persisted successfully.');
    console.log(`Total products now in catalogue: ${result.products.length}`);
  } catch (saveErr) {
    console.error('Error saving updated catalogue:', saveErr);
    process.exit(1);
  }

  console.log('\nScript finished successfully!');
  process.exit(0);
}

run();
