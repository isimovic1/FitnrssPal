import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bmi, bmr, calorieGoal, daysToGoal, macroGoals, scaleNutrients, weightOn, weightTrendPerDay } from '../src/lib/calc';
import { addDays, dateRange, endOfMonth, startOfWeek } from '../src/lib/dates';
import { barcodeVariants, extractBarcode, productToFood } from '../src/lib/openFoodFacts';
import { periodReport } from '../src/lib/reports';
import { EMPTY_STATE, reducer } from '../src/lib/store';
import type { AppState, Profile } from '../src/lib/types';

const NOW = new Date(2026, 9, 17);

const profile: Profile = {
  name: 'Test',
  sex: 'male',
  birthYear: 1990,
  heightCm: 180,
  startWeightKg: 90,
  goalWeightKg: 80,
  activityLevel: 'moderate',
  weeklyGoalKg: -0.5,
  macroSplit: { protein: 30, carbs: 40, fat: 30 },
  waterGoalMl: 2500,
  stepsGoal: 8000,
  createdAt: NOW.toISOString(),
};

test('bmr uses Mifflin-St Jeor', () => {
  assert.equal(bmr('male', 90, 180, 36), 10 * 90 + 6.25 * 180 - 5 * 36 + 5);
  assert.equal(bmr('female', 60, 165, 30), 10 * 60 + 6.25 * 165 - 5 * 30 - 161);
});

test('calorie goal applies deficit for weekly goal', () => {
  const g = calorieGoal(profile, 90, NOW);
  assert.equal(g.bmr, 1850);
  assert.equal(g.tdee, Math.round(1850 * 1.55));
  // -0.5 kg/week = 550 kcal/day deficit
  assert.equal(g.goal, Math.round((1850 * 1.55 - 550) / 10) * 10);
  assert.ok(Math.abs(g.plannedDeficit - 550) <= 5);
  assert.equal(g.clamped, false);
});

test('calorie goal never drops below the safe minimum', () => {
  const g = calorieGoal({ ...profile, sex: 'female', heightCm: 150, activityLevel: 'sedentary', weeklyGoalKg: -1 }, 50, NOW);
  assert.equal(g.goal, 1200);
  assert.equal(g.clamped, true);
});

test('custom calorie goal overrides calculation', () => {
  assert.equal(calorieGoal({ ...profile, customCalorieGoal: 2100 }, 90, NOW).goal, 2100);
});

test('macro goals convert percent to grams', () => {
  assert.deepEqual(macroGoals(2000, { protein: 30, carbs: 40, fat: 30 }), { protein: 150, carbs: 200, fat: 67 });
});

test('bmi', () => {
  assert.equal(bmi(81, 180), 25);
});

test('scaleNutrients scales per 100 g', () => {
  const n = scaleNutrients({ kcal: 200, protein: 10, carbs: 20, fat: 5 }, 150);
  assert.equal(n.kcal, 300);
  assert.equal(n.protein, 15);
});

test('weightOn picks the latest weigh-in on or before the date', () => {
  const w = [{ date: '2026-10-01', kg: 90 }, { date: '2026-10-10', kg: 89 }];
  assert.equal(weightOn(w, '2026-10-05', 100), 90);
  assert.equal(weightOn(w, '2026-10-17', 100), 89);
  assert.equal(weightOn(w, '2026-09-01', 100), 100);
});

test('weight trend and days to goal', () => {
  const w = [0, 7, 14].map((d, i) => ({ date: addDays('2026-10-01', d), kg: 90 - i * 0.5 }));
  const t = weightTrendPerDay(w)!;
  assert.ok(Math.abs(t - -0.5 / 7) < 1e-9);
  assert.equal(daysToGoal(89, 80, t), 126);
  assert.equal(daysToGoal(89, 80, 0.1), null);
});

test('date helpers', () => {
  assert.equal(startOfWeek('2026-10-17'), '2026-10-12'); // Saturday -> Monday
  assert.equal(endOfMonth('2026-02-10'), '2026-02-28');
  assert.equal(dateRange('2026-10-30', '2026-11-02').length, 4);
});

test('extractBarcode handles EAN, OFF links and GS1 digital links', () => {
  assert.equal(extractBarcode('3017620422003'), '3017620422003');
  assert.equal(extractBarcode('https://world.openfoodfacts.org/product/3017620422003/nutella'), '3017620422003');
  assert.equal(extractBarcode('https://id.gs1.org/01/03017620422003'), '3017620422003');
  assert.equal(extractBarcode('hello'), null);
});

test('productToFood falls back to kJ when kcal is missing', () => {
  const f = productToFood({ product_name: 'X', nutriments: { energy_100g: 418.4, proteins_100g: '5' } }, '123456');
  assert.equal(f?.per100g.kcal, 100);
  assert.equal(f?.per100g.protein, 5);
  assert.equal(productToFood({ product_name: 'Y', nutriments: {} }), null);
});

test('productToFood reads plain and prepared values', () => {
  const plain = productToFood({ product_name: 'Mlijeko', nutrition_data_per: '100g', nutriments: { 'energy-kcal': 64, proteins: 3.2 } }, '1');
  assert.equal(plain?.per100g.kcal, 64);
  assert.equal(plain?.per100g.protein, 3.2);
  const perServing = productToFood({ product_name: 'X', nutrition_data_per: 'serving', nutriments: { 'energy-kcal': 200 } }, '2');
  assert.equal(perServing, null);
  const prepared = productToFood({ product_name: 'Y', nutriments: { 'energy-kcal_prepared_100g': 50 } }, '3');
  assert.equal(prepared?.per100g.kcal, 50);
});

test('barcodeVariants covers UPC/EAN/GTIN forms', () => {
  const v = barcodeVariants('036000291452');
  assert.ok(v.includes('036000291452'));
  assert.ok(v.includes('0036000291452'));
  assert.ok(v.includes('36000291452'));
  assert.equal(barcodeVariants('3850108020052')[0], '3850108020052');
  assert.ok(barcodeVariants('3850108020052').includes('03850108020052'));
});

test('reducer adds entries and recomputes on update', () => {
  const food = { id: 'f1', name: 'Riža', per100g: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 }, source: 'custom' as const };
  let s: AppState = reducer(EMPTY_STATE, {
    type: 'addEntry',
    food,
    entry: { id: 'e1', date: '2026-10-17', meal: 'lunch', foodId: 'f1', name: 'Riža', grams: 100, nutrients: scaleNutrients(food.per100g, 100), createdAt: '' },
  });
  assert.equal(s.recentFoodIds[0], 'f1');
  s = reducer(s, { type: 'updateEntry', id: 'e1', grams: 200, meal: 'dinner' });
  assert.equal(s.diary[0].nutrients.kcal, 260);
  assert.equal(s.diary[0].meal, 'dinner');
  s = reducer(s, { type: 'setWeight', entry: { date: '2026-10-17', kg: 89 } });
  s = reducer(s, { type: 'setWeight', entry: { date: '2026-10-17', kg: 88.5 } });
  assert.deepEqual(s.weights, [{ date: '2026-10-17', kg: 88.5 }]);
});

test('period report sums deficit over logged days only', () => {
  const s: AppState = {
    ...EMPTY_STATE,
    profile,
    diary: [
      { id: 'a', date: '2026-10-12', meal: 'lunch', foodId: 'x', name: 'x', grams: 100, nutrients: { kcal: 2000, protein: 150, carbs: 200, fat: 60 }, createdAt: '' },
      { id: 'b', date: '2026-10-13', meal: 'lunch', foodId: 'x', name: 'x', grams: 100, nutrients: { kcal: 2500, protein: 150, carbs: 200, fat: 60 }, createdAt: '' },
    ],
    weights: [{ date: '2026-10-12', kg: 90 }, { date: '2026-10-14', kg: 89.6 }],
  };
  const r = periodReport(s, '2026-10-12', '2026-10-18', '2026-10-14');
  assert.equal(r.days.length, 3); // stops at "today"
  assert.equal(r.loggedDays, 2);
  assert.equal(r.avgIntake.kcal, 2250);
  assert.equal(r.deficitDays, 2);
  assert.equal(r.totalDeficit, r.days[0].burned - 2000 + (r.days[1].burned - 2500));
  // A day still in progress is not counted towards the deficit.
  assert.equal(periodReport(s, '2026-10-12', '2026-10-18', '2026-10-13').deficitDays, 1);
  assert.ok(Math.abs(r.actualKgChange! - -0.4) < 1e-9);
});
