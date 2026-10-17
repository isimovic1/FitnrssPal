// MET values from the Compendium of Physical Activities (rounded).
export const EXERCISES: { name: string; met: number }[] = [
  { name: 'Hodanje (umjereno)', met: 3.5 },
  { name: 'Brzo hodanje', met: 4.3 },
  { name: 'Trčanje (8 km/h)', met: 8.3 },
  { name: 'Trčanje (10 km/h)', met: 9.8 },
  { name: 'Bicikl (umjereno)', met: 6.8 },
  { name: 'Sobni bicikl', met: 6.8 },
  { name: 'Plivanje', met: 7 },
  { name: 'Teretana (snaga)', met: 5 },
  { name: 'HIIT / kružni trening', met: 8 },
  { name: 'Nogomet', met: 7 },
  { name: 'Košarka', met: 6.5 },
  { name: 'Tenis', met: 7.3 },
  { name: 'Joga', met: 2.5 },
  { name: 'Planinarenje', met: 6 },
  { name: 'Ples', met: 5 },
];

export function exerciseKcal(met: number, weightKg: number, minutes: number): number {
  return Math.round((met * weightKg * minutes) / 60);
}
