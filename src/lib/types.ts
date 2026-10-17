export type Sex = 'male' | 'female';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** ISO date without time, e.g. "2026-10-17". */
export type DateKey = string;

export interface Nutrients {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  saturatedFat?: number;
  salt?: number;
}

export interface MacroSplit {
  /** Percent of calories, the three values sum to 100. */
  protein: number;
  carbs: number;
  fat: number;
}

export interface Profile {
  name: string;
  sex: Sex;
  birthYear: number;
  heightCm: number;
  startWeightKg: number;
  goalWeightKg: number;
  activityLevel: ActivityLevel;
  /** Target weight change per week in kg; negative = lose weight. */
  weeklyGoalKg: number;
  macroSplit: MacroSplit;
  waterGoalMl: number;
  stepsGoal: number;
  /** When set, overrides the calculated daily calorie goal. */
  customCalorieGoal?: number;
  createdAt: string;
}

export interface Food {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  /** Nutrients per 100 g (or 100 ml). */
  per100g: Nutrients;
  servingSizeG?: number;
  servingLabel?: string;
  imageUrl?: string;
  source: 'builtin' | 'openfoodfacts' | 'custom';
}

export interface DiaryEntry {
  id: string;
  date: DateKey;
  meal: MealType;
  foodId: string;
  name: string;
  brand?: string;
  grams: number;
  nutrients: Nutrients;
  createdAt: string;
}

export interface ExerciseEntry {
  id: string;
  date: DateKey;
  name: string;
  minutes: number;
  kcal: number;
}

export interface WeightEntry {
  date: DateKey;
  kg: number;
  waistCm?: number;
  bodyFatPct?: number;
}

export interface DayExtras {
  waterMl: number;
  steps: number;
}

export interface AppState {
  profile: Profile | null;
  diary: DiaryEntry[];
  exercises: ExerciseEntry[];
  weights: WeightEntry[];
  extras: Record<DateKey, DayExtras>;
  /** Foods the user scanned, created or used, keyed by id. */
  foods: Record<string, Food>;
  /** Food ids, most recently used first. */
  recentFoodIds: string[];
  /** Weekly progress photos keyed by the Monday of the week. */
  photos: Record<DateKey, PhotoSet>;
}

export type PhotoPose = 'front' | 'back' | 'side';

export interface PhotoSet {
  /** Monday of the week the photos belong to. */
  week: DateKey;
  /** file:// URIs of copies in the app's document directory. */
  front?: string;
  back?: string;
  side?: string;
}
