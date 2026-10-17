import { calorieGoal, KCAL_PER_KG, sumNutrients, tdee, weightOn } from './calc';
import { dateRange } from './dates';
import type { AppState, DateKey, Nutrients } from './types';

export interface DaySummary {
  date: DateKey;
  intake: Nutrients;
  exerciseKcal: number;
  goal: number;
  /** Maintenance calories for the day, including logged exercise. */
  burned: number;
  /** burned - intake; positive = deficit. Only meaningful when logged. */
  deficit: number;
  waterMl: number;
  steps: number;
  logged: boolean;
  weightKg?: number;
}

export function summarizeDay(state: AppState, date: DateKey): DaySummary {
  const profile = state.profile!;
  const entries = state.diary.filter((e) => e.date === date);
  const intake = sumNutrients(entries.map((e) => e.nutrients));
  const exerciseKcal = state.exercises
    .filter((e) => e.date === date)
    .reduce((a, e) => a + e.kcal, 0);
  const weight = weightOn(state.weights, date, profile.startWeightKg);
  const goal = calorieGoal(profile, weight).goal;
  const burned = tdee(profile, weight) + exerciseKcal;
  const extras = state.extras[date];
  return {
    date,
    intake,
    exerciseKcal,
    goal,
    burned: Math.round(burned),
    deficit: Math.round(burned - intake.kcal),
    waterMl: extras?.waterMl ?? 0,
    steps: extras?.steps ?? 0,
    logged: entries.length > 0,
    weightKg: state.weights.find((w) => w.date === date)?.kg,
  };
}

export interface PeriodReport {
  days: DaySummary[];
  loggedDays: number;
  avgIntake: Nutrients;
  avgGoal: number;
  /** Deficit over completed logged days; today is left out because it is still in progress. */
  totalDeficit: number;
  avgDeficit: number;
  deficitDays: number;
  /** Fat change implied by the total deficit, in kg (negative = loss). */
  estimatedKgChange: number;
  /** First to last weigh-in within the period, if there are two. */
  actualKgChange: number | null;
  daysOnTarget: number;
  totalExerciseKcal: number;
  avgWaterMl: number;
  avgSteps: number;
}

/** Report over [start, end]; days after `today` are ignored. */
export function periodReport(state: AppState, start: DateKey, end: DateKey, today: DateKey): PeriodReport {
  const days = dateRange(start, end < today ? end : today).map((d) => summarizeDay(state, d));
  const logged = days.filter((d) => d.logged);
  const n = logged.length || 1;
  const sum = sumNutrients(logged.map((d) => d.intake));
  const avgIntake = Object.fromEntries(
    Object.entries(sum).map(([k, v]) => [k, (v ?? 0) / n]),
  ) as unknown as Nutrients;
  const complete = logged.filter((d) => d.date < today);
  const totalDeficit = complete.reduce((a, d) => a + d.deficit, 0);
  const weighIns = state.weights
    .filter((w) => w.date >= start && w.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date));
  const all = days.length || 1;
  return {
    days,
    loggedDays: logged.length,
    avgIntake,
    avgGoal: logged.reduce((a, d) => a + d.goal, 0) / n,
    totalDeficit,
    avgDeficit: complete.length ? totalDeficit / complete.length : 0,
    deficitDays: complete.length,
    estimatedKgChange: -totalDeficit / KCAL_PER_KG,
    actualKgChange: weighIns.length >= 2 ? weighIns[weighIns.length - 1].kg - weighIns[0].kg : null,
    daysOnTarget: logged.filter((d) => d.intake.kcal <= d.goal + d.exerciseKcal).length,
    totalExerciseKcal: days.reduce((a, d) => a + d.exerciseKcal, 0),
    avgWaterMl: days.reduce((a, d) => a + d.waterMl, 0) / all,
    avgSteps: days.reduce((a, d) => a + d.steps, 0) / all,
  };
}
