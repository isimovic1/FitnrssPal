export const colors = {
  bg: '#F3F5F9',
  card: '#FFFFFF',
  text: '#16202E',
  muted: '#6B7686',
  border: '#E3E7EE',
  primary: '#1C7EF2',
  primarySoft: '#E3EFFE',
  success: '#22A86B',
  warning: '#F2A11C',
  danger: '#E5484D',
  protein: '#E5484D',
  carbs: '#1C7EF2',
  fat: '#F2A11C',
  water: '#2BB3D9',
  exercise: '#22A86B',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const radius = { sm: 8, md: 12, lg: 16 };

export const MEAL_LABELS = {
  breakfast: 'Doručak',
  lunch: 'Ručak',
  dinner: 'Večera',
  snack: 'Međuobroci',
} as const;

export const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
