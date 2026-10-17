import type { Food, Nutrients } from './types';

// A small offline list of common foods (values per 100 g) so the app is useful
// without network access. Scanned and custom foods are added to the user's own list.
const n = (kcal: number, protein: number, carbs: number, fat: number, fiber = 0, sugar = 0): Nutrients => ({
  kcal, protein, carbs, fat, fiber, sugar,
});

const RAW: [string, Nutrients, number?, string?][] = [
  ['Jaje (cijelo)', n(143, 12.6, 0.7, 9.5, 0, 0.4), 55, '1 kom'],
  ['Bjelanjak', n(52, 10.9, 0.7, 0.2, 0, 0.7), 33, '1 kom'],
  ['Pileća prsa (sirova)', n(120, 22.5, 0, 2.6)],
  ['Pileća prsa (pečena)', n(165, 31, 0, 3.6)],
  ['Puretina (prsa)', n(114, 23.7, 0, 1.5)],
  ['Junetina (mljevena 10%)', n(176, 20, 0, 10)],
  ['Svinjetina (but)', n(143, 21, 0, 6.5)],
  ['Losos', n(208, 20, 0, 13)],
  ['Tuna u vlastitom soku', n(116, 26, 0, 1)],
  ['Oslić', n(90, 18.3, 0, 1.3)],
  ['Šunka (pureća)', n(104, 17, 2, 3)],
  ['Svježi sir (posni)', n(72, 12.4, 2.7, 1)],
  ['Grčki jogurt 2%', n(73, 9.9, 3.9, 2)],
  ['Jogurt 2.8%', n(61, 3.4, 4.6, 2.8)],
  ['Mlijeko 2.8%', n(60, 3.3, 4.8, 2.8), 250, '1 čaša'],
  ['Mlijeko 0.9%', n(41, 3.4, 4.9, 0.9), 250, '1 čaša'],
  ['Gauda sir', n(356, 25, 2.2, 27.4)],
  ['Mozzarella', n(254, 18, 2.2, 19)],
  ['Whey protein', n(390, 78, 7, 6), 30, '1 mjerica'],
  ['Zobene pahuljice', n(379, 13.2, 67.7, 6.5, 10.1, 1), 40, '1 porcija'],
  ['Bijela riža (kuhana)', n(130, 2.7, 28.2, 0.3, 0.4)],
  ['Bijela riža (sirova)', n(360, 6.6, 79, 0.6, 1.3)],
  ['Tjestenina (kuhana)', n(158, 5.8, 30.9, 0.9, 1.8)],
  ['Tjestenina (suha)', n(371, 13, 75, 1.5, 3.2)],
  ['Krumpir (kuhani)', n(87, 1.9, 20.1, 0.1, 1.8)],
  ['Batat (pečeni)', n(90, 2, 20.7, 0.2, 3.3)],
  ['Kruh bijeli', n(265, 9, 49, 3.2, 2.7, 5), 30, '1 šnita'],
  ['Kruh integralni', n(247, 13, 41, 3.4, 7, 6), 30, '1 šnita'],
  ['Tortilja (pšenična)', n(310, 8, 52, 7.5, 3), 60, '1 kom'],
  ['Banana', n(89, 1.1, 22.8, 0.3, 2.6, 12.2), 120, '1 kom'],
  ['Jabuka', n(52, 0.3, 13.8, 0.2, 2.4, 10.4), 180, '1 kom'],
  ['Naranča', n(47, 0.9, 11.8, 0.1, 2.4, 9.4), 150, '1 kom'],
  ['Jagode', n(32, 0.7, 7.7, 0.3, 2, 4.9)],
  ['Borovnice', n(57, 0.7, 14.5, 0.3, 2.4, 10)],
  ['Avokado', n(160, 2, 8.5, 14.7, 6.7, 0.7)],
  ['Brokula', n(34, 2.8, 6.6, 0.4, 2.6, 1.7)],
  ['Rajčica', n(18, 0.9, 3.9, 0.2, 1.2, 2.6)],
  ['Krastavac', n(15, 0.7, 3.6, 0.1, 0.5, 1.7)],
  ['Paprika', n(31, 1, 6, 0.3, 2.1, 4.2)],
  ['Zelena salata', n(15, 1.4, 2.9, 0.2, 1.3, 0.8)],
  ['Mrkva', n(41, 0.9, 9.6, 0.2, 2.8, 4.7)],
  ['Grah (kuhani)', n(127, 8.7, 22.8, 0.5, 6.4)],
  ['Leća (kuhana)', n(116, 9, 20, 0.4, 7.9)],
  ['Bademi', n(579, 21.2, 21.6, 49.9, 12.5, 4.4), 30, 'šaka'],
  ['Orasi', n(654, 15.2, 13.7, 65.2, 6.7, 2.6), 30, 'šaka'],
  ['Kikiriki maslac', n(588, 25, 20, 50, 6, 9), 15, '1 žlica'],
  ['Maslinovo ulje', n(884, 0, 0, 100), 10, '1 žlica'],
  ['Maslac', n(717, 0.9, 0.1, 81), 10, '1 žlica'],
  ['Med', n(304, 0.3, 82.4, 0, 0.2, 82.1), 20, '1 žlica'],
  ['Šećer', n(387, 0, 100, 0, 0, 100), 5, '1 žličica'],
  ['Tamna čokolada 70%', n(598, 7.8, 45.9, 42.6, 10.9, 24)],
  ['Pizza margherita', n(250, 11, 31, 9, 2, 3.6)],
  ['Burek sa sirom', n(310, 9, 27, 18, 1)],
  ['Ćevapi', n(260, 17, 2, 21), 50, '1 kom (cca)'],
  ['Coca-Cola', n(42, 0, 10.6, 0, 0, 10.6), 330, '1 limenka'],
  ['Pivo', n(43, 0.5, 3.6, 0, 0, 0), 500, '0,5 l'],
  ['Crno vino', n(85, 0.1, 2.6, 0, 0, 0.6), 150, '1 čaša'],
  ['Kava s mlijekom', n(20, 1, 2, 1), 200, '1 šalica'],
];

export const BUILTIN_FOODS: Food[] = RAW.map(([name, per100g, servingSizeG, servingLabel], i) => ({
  id: `builtin:${i}`,
  name,
  per100g,
  servingSizeG,
  servingLabel,
  source: 'builtin',
}));

/** Accent- and case-insensitive match, so "cevapi" finds "Ćevapi". */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

export function matchesQuery(food: Food, query: string): boolean {
  const q = normalize(query.trim());
  if (!q) return true;
  const hay = normalize(`${food.name} ${food.brand ?? ''} ${food.barcode ?? ''}`);
  return q.split(/\s+/).every((part) => hay.includes(part));
}
