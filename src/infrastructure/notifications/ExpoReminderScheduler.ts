import { Platform } from 'react-native';

import { AppErrors } from '@core/errors/AppError';
import { err, ok, type Result } from '@core/result/Result';
import type { DailyReminder, ReminderScheduler } from '@domain/ports/Services';

const ANDROID_CHANNEL = 'daily-reminder';

/**
 * `expo-notifications` throws as soon as it's imported when running on
 * Android inside Expo Go (remote-notification support was removed there in
 * SDK 53 — see AGENTS.md's "Expo HAS CHANGED" note). Loading it lazily, from
 * inside the try/catch below, keeps that failure scoped to a normal
 * `Result` error instead of crashing the app at boot. It works unchanged in
 * a development build or production build, which is where this module is
 * actually meant to run.
 */
let notificationsPromise: ReturnType<typeof loadNotifications> | undefined;

async function loadNotifications() {
  const Notifications = await import('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  return Notifications;
}

function getNotifications() {
  notificationsPromise ??= loadNotifications();
  return notificationsPromise;
}

export class ExpoReminderScheduler implements ReminderScheduler {
  async schedule(reminder: DailyReminder, body: string): Promise<Result<void>> {
    try {
      const Notifications = await getNotifications();

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
      const Notifications = await getNotifications();
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
