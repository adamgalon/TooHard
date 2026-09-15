import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

import type { FeedbackKind, HapticFeedback } from '@domain/ports/Services';

/**
 * Adapter over `expo-haptics`.
 *
 * `isEnabled` is injected as a getter rather than a boolean so the user's
 * preference takes effect immediately, without re-wiring the container.
 */
export class ExpoHapticFeedback implements HapticFeedback {
  constructor(private readonly isEnabled: () => boolean) {}

  trigger(kind: FeedbackKind): void {
    if (Platform.OS === 'web' || !this.isEnabled()) return;

    switch (kind) {
      case 'success':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      case 'warning':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      case 'error':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      case 'selection':
        void Haptics.selectionAsync();
        return;
      case 'impact':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
    }
  }
}

export class SilentHapticFeedback implements HapticFeedback {
  trigger(): void {
    /* no-op */
  }
}
