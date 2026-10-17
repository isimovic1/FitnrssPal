import { Directory, File, Paths } from 'expo-file-system';

import type { DateKey, PhotoPose } from './types';

function photoDir(): Directory {
  const dir = new Directory(Paths.document, 'progress-photos');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/**
 * Copies a picked or captured photo into the app's own storage. Picker results
 * live in a cache folder the system may clear, so they cannot be kept as-is.
 */
export function storePhoto(sourceUri: string, week: DateKey, pose: PhotoPose): string {
  const source = new File(sourceUri);
  const raw = source.extension || 'jpg';
  const ext = raw.startsWith('.') ? raw : `.${raw}`;
  const target = new File(photoDir(), `${week}-${pose}-${Date.now()}${ext}`);
  source.copySync(target);
  return target.uri;
}

export function deletePhotoFile(uri: string | undefined): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (e) {
    console.warn('Brisanje slike nije uspjelo', e);
  }
}
