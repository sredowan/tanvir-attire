import { ProductCategory, StoreConfig } from '../types';

export const DEFAULT_CATEGORIES: ProductCategory[] = [
  { value: 'kurta', label: 'Royal Kurtas' },
  { value: 'tshirt', label: 'Heavyweight T-Shirts' },
  { value: 'panjabi', label: 'Panjabi' },
];

/** The configured categories, falling back to the defaults. */
export function getCategories(config?: StoreConfig): ProductCategory[] {
  return config?.categories && config.categories.length ? config.categories : DEFAULT_CATEGORIES;
}

/** Human label for a category value. */
export function categoryLabel(config: StoreConfig | undefined, value: string): string {
  const found = getCategories(config).find((c) => c.value === value);
  if (found) return found.label;
  if (!value) return 'Uncategorised';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** A longer descriptive label for product cards / detail (falls back to the short label). */
export function categoryTagline(config: StoreConfig | undefined, value: string): string {
  if (value === 'kurta') return 'Luxury Oriental Kurta';
  if (value === 'tshirt') return 'Heavyweight Legacy Tee';
  return categoryLabel(config, value);
}
