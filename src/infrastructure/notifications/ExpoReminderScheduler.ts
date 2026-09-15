import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { AppErrors } from '@core/errors/AppError';
import { err, ok, type Result } from '@core/result/Result';
import type { DailyReminder, ReminderScheduler } from '@domain/ports/Services';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const ANDROID_CHANNEL = 'daily-reminder';

export class ExpoReminderScheduler implements ReminderScheduler {
  async schedule(reminder: DailyReminder, body: string): Promise<Result<void>> {
    try {
      if (Platform.OS === 'android') {
        // Android 13+ refuses permission requests before a channel exists.
        await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
          name: 'Daily reminder',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      const permission = await Notifications.requestPermissionsAsync();
      if (!permission.granted) {
        return err(AppErrors.permissionDenied('Notifications are turned off for this app.'));
      }

      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Still on track?', body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: reminder.hour,
          minute: reminder.minute,
          ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
        },
      });
      return ok(undefined);
    } catch (cause) {
      return err(AppErrors.unexpected('Could not schedule the daily reminder.', { cause }));
    }
  }

  async cancelAll(): Promise<Result<void>> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return ok(undefined);
    } catch (cause) {
      return err(AppErrors.unexpected('Could not cancel the daily reminder.', { cause }));
    }
  }
}

/** No-op scheduler for web and tests. */
export class NoopReminderScheduler implements ReminderScheduler {
  async schedule(): Promise<Result<void>> {
    return ok(undefined);
  }

  async cancelAll(): Promise<Result<void>> {
    return ok(undefined);
  }
}
