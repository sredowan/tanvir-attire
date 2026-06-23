import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { getCatalogue, saveCatalogue } from '../backend/store';

dotenv.config();

async function run() {
  console.log('--- Tanvir Attire - Remove Old Products Script ---');

  // 1. Fetch current catalogue
  console.log('Fetching current catalogue...');
  const { products, config } = await getCatalogue();
  console.log(`Loaded ${products.length} products from database.`);

  // 2. Filter out the old products (k1, k2, k3, t1, t2, t3)
  const oldProductIds = ['k1', 'k2', 'k3', 't1', 't2', 't3'];
  const filteredProducts = products.filter((p) => !oldProductIds.includes(p.id));
  
  console.log(`Filtering catalogue: keeping ${filteredProducts.length} products, removing ${products.length - filteredProducts.length} old products.`);

  // 3. Save updated catalogue back to DB
  console.log('Saving updated catalogue...');
  try {
    const result = await saveCatalogue(filteredProducts, config);
    console.log('Success! Catalogue persisted successfully.');
    console.log(`Total products now in catalogue: ${result.products.length}`);
    console.log('Products currently in database/fallback:');
    result.products.forEach((p) => console.log(` - [${p.id}] ${p.name} (${p.category})`));
  } catch (err) {
    console.error('Error saving catalogue:', err);
    process.exit(1);
  }

  // 4. Also explicitly update local data-store.json fallback file if it exists
  const storePath = path.join(process.cwd(), 'data-store.json');
  if (fs.existsSync(storePath)) {
    console.log('Updating fallback data-store.json file...');
    try {
      const raw = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      raw.products = filteredProducts;
      raw.config = config;
      console.log(`Fallback JSON updated: synchronized ${filteredProducts.length} products and config.`);
      raw.lastUpdated = new Date().toISOString();
      fs.writeFileSync(storePath, JSON.stringify(raw, null, 2), 'utf8');
      console.log('Success! Fallback data-store.json file updated.');
    } catch (e) {
      console.error('Error updating fallback data-store.json:', e);
    }
  }

  process.exit(0);
}

run();
