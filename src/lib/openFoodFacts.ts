import type { Food, Nutrients } from './types';

// Open Food Facts is a free, open product database — the same kind of source
// MyFitnessPal's barcode scanner relies on. No API key is needed, but they ask
// clients to identify themselves with a User-Agent.
const BASE = 'https://world.openfoodfacts.org';
const HEADERS = { 'User-Agent': 'FitnrssPal/1.0 (personal calorie tracker)' };
const FIELDS = [
  'code', 'product_name', 'product_name_hr', 'product_name_en', 'brands',
  'nutriments', 'nutrition_data_per', 'serving_size', 'serving_quantity', 'image_front_small_url',
].join(',');

interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_hr?: string;
  product_name_en?: string;
  /** A comma-separated string from the product API, an array from search. */
  brands?: string | string[];
  nutriments?: Record<string, number | string | undefined>;
  nutrition_data_per?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  image_front_small_url?: string;
}

function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Reads per-100 g values. Products are not entered consistently: some only have
 * the plain "energy-kcal" value (already per 100 g when nutrition_data_per is
 * "100g"), some only kJ, and some only "prepared" values (e.g. powdered milk).
 */
function toNutrients(n: Record<string, unknown> = {}, per?: string): Nutrients | null {
  const plainIsPer100 = !per || per === '100g' || per === '100ml';
  const read = (key: string): number | undefined =>
    num(n[`${key}_100g`]) ?? num(n[`${key}_prepared_100g`]) ?? (plainIsPer100 ? num(n[key]) : undefined);

  let kcal = read('energy-kcal');
  if (kcal === undefined) {
    const kj = read('energy-kj') ?? read('energy');
    if (kj !== undefined) kcal = Math.round((kj / 4.184) * 10) / 10;
  }
  if (kcal === undefined) return null;
  return {
    kcal,
    protein: read('proteins') ?? 0,
    carbs: read('carbohydrates') ?? 0,
    fat: read('fat') ?? 0,
    fiber: read('fiber'),
    sugar: read('sugars'),
    saturatedFat: read('saturated-fat'),
    salt: read('salt'),
  };
}

export function productToFood(p: OffProduct, barcode?: string): Food | null {
  const per100g = toNutrients(p.nutriments, p.nutrition_data_per);
  const name = p.product_name_hr || p.product_name || p.product_name_en;
  const code = barcode ?? p.code;
  if (!per100g || !name) return null;
  const serving = num(p.serving_quantity);
  return {
    id: code ? `off:${code}` : `off:${name}`,
    name: name.trim(),
    brand: (Array.isArray(p.brands) ? p.brands[0] : p.brands?.split(',')[0])?.trim() || undefined,
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

/**
 * The same product can be stored as UPC-A (12 digits), EAN-13 with a leading
 * zero, or GTIN-14, and scanners report whichever form they decode.
 */
export function barcodeVariants(barcode: string): string[] {
  const stripped = barcode.replace(/^0+/, '');
  const out = [barcode];
  for (const len of [8, 12, 13, 14]) {
    if (stripped.length <= len) out.push(stripped.padStart(len, '0'));
  }
  out.push(stripped);
  return [...new Set(out)].filter((c) => c.length >= 8);
}

async function fetchProduct(code: string): Promise<LookupResult> {
  const res = await fetch(`${BASE}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`, {
    headers: HEADERS,
  });
  if (res.status === 404) return { status: 'not_found' };
  if (!res.ok) return { status: 'error', message: `HTTP ${res.status}` };
  const json = (await res.json()) as { status?: number; product?: OffProduct };
  if (json.status !== 1 || !json.product) return { status: 'not_found' };
  const food = productToFood(json.product, code);
  if (!food) return { status: 'incomplete', name: json.product.product_name };
  return { status: 'found', food };
}

export async function lookupBarcode(barcode: string): Promise<LookupResult> {
  let best: LookupResult = { status: 'not_found' };
  for (const code of barcodeVariants(barcode)) {
    let result: LookupResult;
    try {
      result = await fetchProduct(code);
    } catch (e) {
      result = { status: 'error', message: e instanceof Error ? e.message : String(e) };
    }
    if (result.status === 'found') return result;
    // Prefer telling the user the product exists without nutrition data, then a
    // network error, over a plain "not found".
    if (result.status === 'incomplete' || (result.status === 'error' && best.status === 'not_found')) best = result;
  }
  return best;
}

// Text search runs on Open Food Facts' dedicated search service; the old
// /cgi/search.pl endpoint is frequently overloaded and answers 503.
const SEARCH_URL = 'https://search.openfoodfacts.org/search';
const SEARCH_FIELDS = [
  'code', 'product_name', 'brands', 'nutriments', 'serving_size', 'serving_quantity', 'image_front_small_url',
].join(',');

export async function searchProducts(query: string): Promise<Food[]> {
  const url =
    `${SEARCH_URL}?q=${encodeURIComponent(query)}&langs=hr,en&page_size=40` +
    `&fields=${SEARCH_FIELDS}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { hits?: OffProduct[] };
  return (json.hits ?? [])
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
