import type { ActivityLevel, MacroSplit, Nutrients, Profile, Sex, WeightEntry } from './types';

/** Energy stored in 1 kg of body fat, the usual rule of thumb. */
export const KCAL_PER_KG = 7700;

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sjedilački (malo ili nimalo vježbe)',
  light: 'Lagano aktivan (1–3 treninga tjedno)',
  moderate: 'Umjereno aktivan (3–5 treninga tjedno)',
  active: 'Vrlo aktivan (6–7 treninga tjedno)',
  very_active: 'Izrazito aktivan (fizički posao + trening)',
};

/** Lowest daily goal we will suggest without a custom override. */
export const MIN_CALORIES: Record<Sex, number> = { male: 1500, female: 1200 };

export function ageFromBirthYear(birthYear: number, now = new Date()): number {
  return now.getFullYear() - birthYear;
}

/** Basal metabolic rate, Mifflin-St Jeor equation. */
export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

/** Total daily energy expenditure (maintenance calories). */
export function tdee(profile: Profile, weightKg: number, now = new Date()): number {
  const age = ageFromBirthYear(profile.birthYear, now);
  return bmr(profile.sex, weightKg, profile.heightCm, age) * ACTIVITY_FACTORS[profile.activityLevel];
}

/** Daily calorie change needed for the weekly weight goal (negative = deficit). */
export function dailyAdjustment(weeklyGoalKg: number): number {
  return (weeklyGoalKg * KCAL_PER_KG) / 7;
}

export interface CalorieGoal {
  bmr: number;
  tdee: number;
  goal: number;
  /** Planned daily deficit relative to maintenance (positive = deficit). */
  plannedDeficit: number;
  /** True when the goal was raised to the safe minimum. */
  clamped: boolean;
}

export function calorieGoal(profile: Profile, weightKg: number, now = new Date()): CalorieGoal {
  const age = ageFromBirthYear(profile.birthYear, now);
  const b = bmr(profile.sex, weightKg, profile.heightCm, age);
  const t = b * ACTIVITY_FACTORS[profile.activityLevel];
  let goal: number;
  let clamped = false;
  if (profile.customCalorieGoal && profile.customCalorieGoal > 0) {
    goal = profile.customCalorieGoal;
  } else {
    goal = t + dailyAdjustment(profile.weeklyGoalKg);
    const min = MIN_CALORIES[profile.sex];
    if (goal < min) {
      goal = min;
      clamped = true;
    }
  }
  goal = Math.round(goal / 10) * 10;
  return { bmr: Math.round(b), tdee: Math.round(t), goal, plannedDeficit: Math.round(t - goal), clamped };
}

export interface MacroGoals {
  protein: number;
  carbs: number;
  fat: number;
}

/** Grams of each macro for a calorie goal (4/4/9 kcal per gram). */
export function macroGoals(kcal: number, split: MacroSplit): MacroGoals {
  return {
    protein: Math.round((kcal * split.protein) / 100 / 4),
    carbs: Math.round((kcal * split.carbs) / 100 / 4),
    fat: Math.round((kcal * split.fat) / 100 / 9),
  };
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiCategory(value: number): string {
  if (value < 18.5) return 'Pothranjenost';
  if (value < 25) return 'Normalna težina';
  if (value < 30) return 'Prekomjerna težina';
  return 'Pretilost';
}

export const ZERO_NUTRIENTS: Nutrients = {
  kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, saturatedFat: 0, salt: 0,
};

const NUTRIENT_KEYS: (keyof Nutrients)[] = [
  'kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'saturatedFat', 'salt',
];

export function scaleNutrients(per100g: Nutrients, grams: number): Nutrients {
  const f = grams / 100;
  const out = { ...ZERO_NUTRIENTS };
  for (const k of NUTRIENT_KEYS) out[k] = (per100g[k] ?? 0) * f;
  return out;
}

export function sumNutrients(items: Nutrients[]): Nutrients {
  const out = { ...ZERO_NUTRIENTS };
  for (const n of items) for (const k of NUTRIENT_KEYS) out[k] = (out[k] ?? 0) + (n[k] ?? 0);
  return out;
}

/** Latest weight on or before the date, falling back to the profile start weight. */
export function weightOn(weights: WeightEntry[], date: string, fallback: number): number {
  let best: WeightEntry | undefined;
  for (const w of weights) if (w.date <= date && (!best || w.date > best.date)) best = w;
  return best?.kg ?? fallback;
}

/**
 * Least-squares slope of weight over time, in kg per day.
 * Returns null with fewer than two entries spanning at least one day.
 */
export function weightTrendPerDay(weights: WeightEntry[]): number | null {
  if (weights.length < 2) return null;
  const t0 = Date.parse(weights[0].date);
  const xs = weights.map((w) => (Date.parse(w.date) - t0) / 86_400_000);
  const ys = weights.map((w) => w.kg);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? null : num / den;
}

/** Days until the goal weight at the given rate, or null if the rate does not lead there. */
export function daysToGoal(currentKg: number, goalKg: number, kgPerDay: number): number | null {
  const diff = goalKg - currentKg;
  if (Math.abs(diff) < 0.05) return 0;
  if (kgPerDay === 0 || Math.sign(diff) !== Math.sign(kgPerDay)) return null;
  return Math.ceil(diff / kgPerDay);
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
