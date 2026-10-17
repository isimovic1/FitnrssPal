import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { scaleNutrients } from './calc';
import type {
  AppState, DateKey, DayExtras, DiaryEntry, ExerciseEntry, Food, MealType, PhotoPose, Profile, WeightEntry,
} from './types';

const STORAGE_KEY = 'fitnrsspal:state:v1';
const MAX_RECENT = 40;

export const EMPTY_STATE: AppState = {
  profile: null,
  diary: [],
  exercises: [],
  weights: [],
  extras: {},
  foods: {},
  recentFoodIds: [],
  photos: {},
};

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

type Action =
  | { type: 'load'; state: AppState }
  | { type: 'setProfile'; profile: Profile }
  | { type: 'saveFood'; food: Food }
  | { type: 'addEntry'; entry: DiaryEntry; food: Food }
  | { type: 'updateEntry'; id: string; grams: number; meal: MealType }
  | { type: 'removeEntry'; id: string }
  | { type: 'addExercise'; entry: ExerciseEntry }
  | { type: 'removeExercise'; id: string }
  | { type: 'setWeight'; entry: WeightEntry }
  | { type: 'removeWeight'; date: DateKey }
  | { type: 'setExtras'; date: DateKey; patch: Partial<DayExtras> }
  | { type: 'setPhoto'; week: DateKey; pose: PhotoPose; uri: string | undefined }
  | { type: 'reset' };

function touchRecent(ids: string[], id: string): string[] {
  return [id, ...ids.filter((x) => x !== id)].slice(0, MAX_RECENT);
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'load':
      return action.state;
    case 'setProfile':
      return { ...state, profile: action.profile };
    case 'saveFood':
      return {
        ...state,
        foods: { ...state.foods, [action.food.id]: action.food },
        recentFoodIds: touchRecent(state.recentFoodIds, action.food.id),
      };
    case 'addEntry':
      return {
        ...state,
        diary: [...state.diary, action.entry],
        foods: { ...state.foods, [action.food.id]: action.food },
        recentFoodIds: touchRecent(state.recentFoodIds, action.food.id),
      };
    case 'updateEntry':
      return {
        ...state,
        diary: state.diary.map((e) => {
          if (e.id !== action.id) return e;
          const food = state.foods[e.foodId];
          // Rescale from the stored per-gram values when the food is no longer saved.
          const per100g = food?.per100g ?? scaleNutrients(e.nutrients, (100 * 100) / e.grams);
          return { ...e, grams: action.grams, meal: action.meal, nutrients: scaleNutrients(per100g, action.grams) };
        }),
      };
    case 'removeEntry':
      return { ...state, diary: state.diary.filter((e) => e.id !== action.id) };
    case 'addExercise':
      return { ...state, exercises: [...state.exercises, action.entry] };
    case 'removeExercise':
      return { ...state, exercises: state.exercises.filter((e) => e.id !== action.id) };
    case 'setWeight':
      return {
        ...state,
        weights: [...state.weights.filter((w) => w.date !== action.entry.date), action.entry].sort((a, b) =>
          a.date.localeCompare(b.date),
        ),
      };
    case 'removeWeight':
      return { ...state, weights: state.weights.filter((w) => w.date !== action.date) };
    case 'setExtras': {
      const prev = state.extras[action.date] ?? { waterMl: 0, steps: 0 };
      return { ...state, extras: { ...state.extras, [action.date]: { ...prev, ...action.patch } } };
    }
    case 'setPhoto': {
      const prev = state.photos[action.week] ?? { week: action.week };
      const next = { ...prev, [action.pose]: action.uri };
      const photos = { ...state.photos, [action.week]: next };
      if (!next.front && !next.back && !next.side) delete photos[action.week];
      return { ...state, photos };
    }
    case 'reset':
      return EMPTY_STATE;
  }
}

function useActions(dispatch: React.Dispatch<Action>) {
  return useMemo(
    () => ({
      setProfile: (profile: Profile) => dispatch({ type: 'setProfile', profile }),
      saveFood: (food: Food) => dispatch({ type: 'saveFood', food }),
      addFood: (food: Food, date: DateKey, meal: MealType, grams: number) =>
        dispatch({
          type: 'addEntry',
          food,
          entry: {
            id: newId(),
            date,
            meal,
            foodId: food.id,
            name: food.name,
            brand: food.brand,
            grams,
            nutrients: scaleNutrients(food.per100g, grams),
            createdAt: new Date().toISOString(),
          },
        }),
      updateEntry: (id: string, grams: number, meal: MealType) => dispatch({ type: 'updateEntry', id, grams, meal }),
      removeEntry: (id: string) => dispatch({ type: 'removeEntry', id }),
      addExercise: (entry: Omit<ExerciseEntry, 'id'>) =>
        dispatch({ type: 'addExercise', entry: { ...entry, id: newId() } }),
      removeExercise: (id: string) => dispatch({ type: 'removeExercise', id }),
      setWeight: (entry: WeightEntry) => dispatch({ type: 'setWeight', entry }),
      removeWeight: (date: DateKey) => dispatch({ type: 'removeWeight', date }),
      setExtras: (date: DateKey, patch: Partial<DayExtras>) => dispatch({ type: 'setExtras', date, patch }),
      setPhoto: (week: DateKey, pose: PhotoPose, uri: string | undefined) =>
        dispatch({ type: 'setPhoto', week, pose, uri }),
      reset: () => dispatch({ type: 'reset' }),
    }),
    [dispatch],
  );
}

type Store = { state: AppState; ready: boolean } & ReturnType<typeof useActions>;

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, EMPTY_STATE);
  const [ready, setReady] = useState(false);
  const actions = useActions(dispatch);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) dispatch({ type: 'load', state: { ...EMPTY_STATE, ...JSON.parse(raw) } });
      })
      .catch((e) => console.warn('Učitavanje podataka nije uspjelo', e))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((e) =>
        console.warn('Spremanje podataka nije uspjelo', e),
      );
    }, 300);
  }, [state, ready]);

  const value = useMemo(() => ({ state, ready, ...actions }), [state, ready, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

const lastProfile: { current: Profile | null } = { current: null };

/**
 * For screens that are only reachable after onboarding. Keeps returning the last
 * profile for the render in which data is reset, before navigation leaves the screen.
 */
export function useProfile(): Profile {
  const { state } = useStore();
  if (state.profile) lastProfile.current = state.profile;
  if (!lastProfile.current) throw new Error('Profile is not set up');
  return lastProfile.current;
}
