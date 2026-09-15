import * as ImagePicker from 'expo-image-picker';

import { AppErrors } from '@core/errors/AppError';
import { err, ok, type Result } from '@core/result/Result';
import type { CapturedPhoto, PhotoCapture, PhotoSource } from '@domain/ports/Services';

/** Adapter over `expo-image-picker`; the domain only sees `CapturedPhoto`. */
export class ExpoPhotoCapture implements PhotoCapture {
  async capture(source: PhotoSource): Promise<Result<CapturedPhoto | null>> {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      return err(
        AppErrors.permissionDenied(
          source === 'camera'
            ? 'Camera access is needed for progress photos.'
            : 'Photo library access is needed to pick a progress photo.',
        ),
      );
    }

    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        exif: false,
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);

      if (result.canceled) return ok(null);

      const asset = result.assets[0];
      if (!asset) return ok(null);

      return ok({ uri: asset.uri, width: asset.width, height: asset.height });
    } catch (cause) {
      return err(AppErrors.unexpected('The photo picker could not be opened.', { cause }));
    }
  }
}
