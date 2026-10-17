import type { Food, Nutrients } from './types';

// Open Food Facts is a free, open product database — the same kind of source
// MyFitnessPal's barcode scanner relies on. No API key is needed, but they ask
// clients to identify themselves with a User-Agent.
const BASE = 'https://world.openfoodfacts.org';
const HEADERS = { 'User-Agent': 'FitnrssPal/1.0 (personal calorie tracker)' };
const FIELDS = [
  'code', 'product_name', 'product_name_hr', 'product_name_en', 'brands',
  'nutriments', 'serving_size', 'serving_quantity', 'image_front_small_url',
].join(',');

interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_hr?: string;
  product_name_en?: string;
  brands?: string;
  nutriments?: Record<string, number | string | undefined>;
  serving_size?: string;
  serving_quantity?: number | string;
  image_front_small_url?: string;
}

function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function toNutrients(n: Record<string, unknown> = {}): Nutrients | null {
  let kcal = num(n['energy-kcal_100g']);
  if (kcal === undefined) {
    const kj = num(n['energy-kj_100g']) ?? num(n['energy_100g']);
    if (kj !== undefined) kcal = Math.round((kj / 4.184) * 10) / 10;
  }
  if (kcal === undefined) return null;
  return {
    kcal,
    protein: num(n['proteins_100g']) ?? 0,
    carbs: num(n['carbohydrates_100g']) ?? 0,
    fat: num(n['fat_100g']) ?? 0,
    fiber: num(n['fiber_100g']),
    sugar: num(n['sugars_100g']),
    saturatedFat: num(n['saturated-fat_100g']),
    salt: num(n['salt_100g']),
  };
}

export function productToFood(p: OffProduct, barcode?: string): Food | null {
  const per100g = toNutrients(p.nutriments);
  const name = p.product_name_hr || p.product_name || p.product_name_en;
  const code = barcode ?? p.code;
  if (!per100g || !name) return null;
  const serving = num(p.serving_quantity);
  return {
    id: code ? `off:${code}` : `off:${name}`,
    name: name.trim(),
    brand: p.brands?.split(',')[0]?.trim() || undefined,
    barcode: code,
    per100g,
    servingSizeG: serving && serving > 0 ? serving : undefined,
    servingLabel: p.serving_size || undefined,
    imageUrl: p.image_front_small_url,
    source: 'openfoodfacts',
  };
}

export type LookupResult =
  | { status: 'found'; food: Food }
  | { status: 'incomplete'; name?: string }
  | { status: 'not_found' }
  | { status: 'error'; message: string };

export async function lookupBarcode(barcode: string): Promise<LookupResult> {
  try {
    const res = await fetch(`${BASE}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`, {
      headers: HEADERS,
    });
    if (res.status === 404) return { status: 'not_found' };
    if (!res.ok) return { status: 'error', message: `HTTP ${res.status}` };
    const json = (await res.json()) as { status?: number; product?: OffProduct };
    if (json.status !== 1 || !json.product) return { status: 'not_found' };
    const food = productToFood(json.product, barcode);
    if (!food) return { status: 'incomplete', name: json.product.product_name };
    return { status: 'found', food };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}

export async function searchProducts(query: string): Promise<Food[]> {
  const url =
    `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1&page_size=25&fields=${FIELDS}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { products?: OffProduct[] };
  return (json.products ?? [])
    .map((p) => productToFood(p))
    .filter((f): f is Food => f !== null);
}

/**
 * Pulls a product barcode out of scanned data. Accepts plain EAN/UPC digits and
 * QR codes that carry a barcode or an Open Food Facts product link.
 */
export function extractBarcode(data: string): string | null {
  const trimmed = data.trim();
  if (/^\d{6,14}$/.test(trimmed)) return trimmed;
  const link = trimmed.match(/\/product\/(\d{6,14})/);
  if (link) return link[1];
  // GS1 Digital Link QR codes: https://id.example.com/01/<GTIN-14>
  const gs1 = trimmed.match(/\/01\/(\d{14})/);
  if (gs1) return gs1[1].replace(/^0/, '');
  return null;
}
