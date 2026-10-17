import { BUILTIN_FOODS } from './foods';
import type { AppState, Food } from './types';

// Search results and scans are held here until the user actually logs them,
// so browsing does not fill the saved food list.
const pending = new Map<string, Food>();

export function rememberFood(food: Food): void {
  pending.set(food.id, food);
}

export function findFood(state: AppState, id: string): Food | undefined {
  return state.foods[id] ?? pending.get(id) ?? BUILTIN_FOODS.find((f) => f.id === id);
}

/** Saved food with the given barcode, so repeat scans work offline. */
export function findByBarcode(state: AppState, barcode: string): Food | undefined {
  return Object.values(state.foods).find((f) => f.barcode === barcode);
}
