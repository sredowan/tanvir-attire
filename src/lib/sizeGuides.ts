// ---------------------------------------------------------------------------
// Reusable, dynamic size-guide data. Keyed so a product can reference one guide
// via `product.sizeGuide` and the UI renders it from a single source of truth.
// ---------------------------------------------------------------------------

export interface SizeGuideRow {
  size: string;
  chest: string;
  length: string;
  sleeve: string;
}

export interface SizeGuide {
  key: string;
  title: string;
  subtitle?: string;
  fit?: string;
  columns: { key: keyof SizeGuideRow; label: string }[];
  rows: SizeGuideRow[];
  note?: string;
}

export const panjabiSlimfitSizeGuide: SizeGuideRow[] = [
  { size: 'M', chest: '40"', length: '40"', sleeve: '22.5"' },
  { size: 'L', chest: '42"', length: '41"', sleeve: '23"' },
  { size: 'XL', chest: '44"', length: '43"', sleeve: '23.5"' },
  { size: 'XXL', chest: '46"', length: '45"', sleeve: '24"' },
];

export const SIZE_GUIDES: Record<string, SizeGuide> = {
  'panjabi-slimfit': {
    key: 'panjabi-slimfit',
    title: 'Panjabi Measurement Chart',
    subtitle: 'Slimfit',
    fit: 'Slimfit',
    columns: [
      { key: 'size', label: 'Size' },
      { key: 'chest', label: 'Chest' },
      { key: 'length', label: 'Length' },
      { key: 'sleeve', label: 'Sleeve' },
    ],
    rows: panjabiSlimfitSizeGuide,
    note: 'All measurements are approximate and in inches. For the best fit, compare against a garment you already own.',
  },
};

/** Resolve the guide for a product; defaults to the Panjabi Slimfit chart. */
export function getSizeGuide(key?: string): SizeGuide {
  return (key && SIZE_GUIDES[key]) || SIZE_GUIDES['panjabi-slimfit'];
}
