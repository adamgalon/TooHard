import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

import { AppErrors } from '@core/errors/AppError';
import { err, ok, type Result } from '@core/result/Result';
import type { PhotoStorage } from '@domain/ports/Services';

const FOLDER = 'progress-photos';

/**
 * Copies picked images into the app's document directory.
 *
 * The picker hands back a cache URI that the OS may reclaim at any time, so a
 * day-60 photo would silently disappear if we stored that URI directly.
 */
export class ExpoPhotoStorage implements PhotoStorage {
  async persist(sourceUri: string, fileName: string): Promise<Result<string>> {
    // Web has no document directory; the blob URL is already durable enough.
    if (Platform.OS === 'web') return ok(sourceUri);

    try {
      const directory = new Directory(Paths.document, FOLDER);
      if (!directory.exists) directory.create();

      const destination = new File(directory, fileName);
      if (destination.exists) destination.delete();

      new File(sourceUri).copy(destination);
      return ok(destination.uri);
    } catch (cause) {
      return err(AppErrors.storageWrite('Could not save the progress photo.', { cause }));
    }
  }

  async remove(uri: string): Promise<Result<void>> {
    if (Platform.OS === 'web') return ok(undefined);
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
      return ok(undefined);
    } catch (cause) {
      return err(AppErrors.storageWrite('Could not delete the progress photo.', { cause }));
    }
  }
}

/** Used on web and in tests, where there is no file system to copy into. */
export class PassThroughPhotoStorage implements PhotoStorage {
  async persist(sourceUri: string): Promise<Result<string>> {
    return ok(sourceUri);
  }

  async remove(): Promise<Result<void>> {
    return ok(undefined);
  }
}
