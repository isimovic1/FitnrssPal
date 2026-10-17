import type { DateKey, PhotoPose, PhotoSet } from './types';

export const POSES: { pose: PhotoPose; label: string }[] = [
  { pose: 'front', label: 'Sprijeda' },
  { pose: 'back', label: 'Straga' },
  { pose: 'side', label: 'Bočno' },
];

export const PHOTO_TIP =
  'Za usporedivu sliku slikaj se uvijek na istom svjetlu, u istoj prostoriji i isti dan u tjednu ' +
  '(npr. ponedjeljkom ujutro), u istoj odjeći i pozi, s mobitelom na istoj visini i udaljenosti.';

export const WEIGH_IN_TIP =
  'Važi se natašte: odmah nakon buđenja i WC-a, prije bilo kakve hrane i vode, po mogućnosti u istoj odjeći (ili bez nje).';

/** First and latest week that has a photo of the pose, for the before/after view. */
export function comparePair(photos: Record<DateKey, PhotoSet>, pose: PhotoPose) {
  const weeks = Object.values(photos)
    .filter((p) => p[pose])
    .sort((a, b) => a.week.localeCompare(b.week));
  if (weeks.length === 0) return null;
  return { first: weeks[0], latest: weeks[weeks.length - 1] };
}
